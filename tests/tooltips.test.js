import test from 'node:test';
import assert from 'node:assert/strict';
import {tooltipPosition,tooltipText,installTooltips} from '../src/tooltips.js';
import {heroArmPose} from '../src/arms.js';
test('compact arms remain on their own side with outward elbows in all target directions',()=>{
 for(const side of [-1,1])for(let angle=0;angle<Math.PI*2;angle+=.025){
  const shoulder={x:8*side,y:-32},p=heroArmPose(shoulder,{x:Math.cos(angle)*40,y:-32+Math.sin(angle)*40},side);
  assert.ok(p.hand.x*side>=6-1e-8);assert.ok(p.elbow.x*side>0);
  assert.ok(Math.abs(Math.hypot(p.elbow.x-shoulder.x,p.elbow.y-shoulder.y)-7)<1e-8);
  assert.ok(Math.abs(Math.hypot(p.hand.x-p.elbow.x,p.hand.y-p.elbow.y)-7)<1e-8);
 }
});
test('tooltip placement remains inside small landscape viewports and uses safe visible offsets',()=>{
 for(const v of [{width:844,height:390},{width:568,height:320,offsetLeft:20,offsetTop:14}])for(const x of [0,280,v.width-20])for(const y of [0,150,v.height-20]){
  const p=tooltipPosition({left:x,top:y,bottom:y+30,width:30},280,90,v);
  assert.ok(p.left>=(v.offsetLeft||0)+10);assert.ok(p.left+280<=(v.offsetLeft||0)+v.width-10);
  assert.ok(p.top>=(v.offsetTop||0)+10);assert.ok(p.top+90<=(v.offsetTop||0)+v.height-10);
 }
 assert.equal(tooltipText({dataset:{tooltip:'Защита'},getAttribute:()=>null}),'Защита');
});
test('touch inspection pauses through callback and prevents item activation before pointer handlers',()=>{
 const events=new Map(),buttonEvents=new Map(),root={addEventListener:(name,fn,capture)=>{const key=name+(capture?':capture':'');events.set(key,fn);}};
 const attrs=new Map(),toggle={setAttribute:(k,v)=>attrs.set(k,v),addEventListener:(name,fn)=>buttonEvents.set(name,fn)};
 const tip={id:'tooltip',hidden:true,offsetWidth:220,offsetHeight:60,style:{}};
 globalThis.innerWidth=844;globalThis.innerHeight=390;let paused=false;
 installTooltips({root,tip,toggle,onMode:on=>paused=on});buttonEvents.get('click')();assert.ok(paused);
 const node={dataset:{tooltip:'Зелье здоровья'},getBoundingClientRect:()=>({left:200,top:200,width:40,bottom:240}),setAttribute(){},removeAttribute(){}};
 let stopped=0,prevented=0;
 const event={target:{closest:selector=>selector==='#tooltipToggle'?null:node},preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++};
 for(const name of ['pointerdown','pointerup','click'])events.get(name+':capture')(event);
 assert.equal(stopped,3);assert.equal(prevented,3);assert.equal(tip.textContent,'Зелье здоровья');assert.equal(tip.hidden,false);
 events.get('keydown:capture')({...event,key:'Escape'});assert.equal(paused,false);assert.ok(tip.hidden);
});

test('status explanation opens on a normal touch and survives touch pointerout without inspection mode',()=>{
 const events=new Map(),tip={id:'tip',hidden:true,offsetWidth:160,offsetHeight:50,style:{}};
 const root={addEventListener:(name,fn,capture)=>events.set(name+(capture?':capture':''),fn)},toggle={addEventListener(){}};
 globalThis.innerWidth=844;globalThis.innerHeight=390;
 installTooltips({root,tip,toggle});
 const node={dataset:{tooltip:'Голод: здоровье убывает'},getBoundingClientRect:()=>({left:10,top:100,width:32,bottom:132}),setAttribute(){},removeAttribute(){}};
 events.get('pointerdown:capture')({target:{closest:s=>s==='.status-icon'?node:null},preventDefault(){}});
 assert.equal(tip.hidden,false);assert.match(tip.textContent,/Голод/);
 events.get('pointerout')({pointerType:'touch'});assert.equal(tip.hidden,false);
 events.get('pointerdown:capture')({target:{closest:()=>null}});assert.equal(tip.hidden,true);
});

test('touch focus does not reveal a tooltip before activation; keyboard focus still does',()=>{
 const events=new Map(),tip={id:'tip',hidden:true,offsetWidth:160,offsetHeight:50,style:{}};
 const root={addEventListener:(name,fn,capture)=>events.set(name+(capture?':capture':''),fn)},toggle={addEventListener(){}};
 globalThis.innerWidth=844;globalThis.innerHeight=390;
 installTooltips({root,tip,toggle});
 const node={dataset:{tooltip:'Сумка'},getBoundingClientRect:()=>({left:10,top:100,width:44,bottom:144}),setAttribute(){},removeAttribute(){}};
 const event={target:{closest:s=>s==='.status-icon'?null:node}};
 events.get('pointerdown:capture')(event);events.get('focusin')(event);assert.equal(tip.hidden,true);
 events.get('keydown:capture')({...event,key:'Tab'});events.get('focusin')(event);assert.equal(tip.hidden,false);
});
