import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Renderer
}
from '../src/render.js';
import * as G from '../src/game.js';
function canvasMock(){
  let calls=0;
  const ctx=new Proxy({
  }, {
    get(target,key){
      if(key in target)return target[key];
      if(key==='createRadialGradient')return()=>({
        addColorStop(){
        }
      });
      return(...args)=>{
        calls++;
        for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${key}: non-finite coordinate`);
      };
    },set(target,key,v){
      target[key]=v;
      return true;
    }
  });
  return {
    style:{
    },getContext:()=>ctx,get calls(){
      return calls;
    }
  };
}
test('renderer produces finite drawing coordinates for day, night, buildings, combat, map and mobile resize',()=>{
  globalThis.innerWidth=844;
  globalThis.innerHeight=390;
  globalThis.devicePixelRatio=3;
  const canvas=canvasMock(),r=new Renderer(canvas),g=G.createGame();
  assert.equal(canvas.width,1688);
  g.home={
    ...G.START
  };
  g.parts=Object.keys(G.PARTS).map((type,i)=>({
    id:i,type,x:10+i%4,y:40+Math.floor(i/4),hp:G.PARTS[type].hp,open:false
  }));
  r.draw(g,'floor',{
    x:400,y:220
  });
  g.time=350;
  g.player.weapon='bow';
  g.player.inv.bow=1;
  g.player.inv.armor=1;
  g.player.blocking=true;
  g.enemies.push(G.makeEnemy('breaker',13,43,'br'));
  g.enemies[0].phase='windup';
  g.enemies[0].timer=.3;
  g.graves.push({
    id:99,x:11,y:43,inv:{
    }
  });
  g.parts[1].hp=0;
  r.draw(g,'remove',{
    x:420,y:210
  });
  r.map(canvasMock(),g);
  const p=r.screen(15,22);
  const back=r.world(p.x,p.y);
  assert.ok(Math.abs(back.x-15)<1e-9);
  assert.ok(Math.abs(back.y-22)<1e-9);
  assert.ok(canvas.calls>1000);
});

test('all detailed actors and buildings draw finite geometry through movement and attack states', () => {
  globalThis.innerWidth=844; globalThis.innerHeight=390; globalThis.devicePixelRatio=2;
  const r=new Renderer(canvasMock()), g=G.createGame();
  const actors=[g.player,...['wolf','draugr','breaker','boss'].map(type=>G.makeEnemy(type,12,43,type))];
  for (const actor of actors) {
    const player=actor===g.player;
    r.actor(actor,g,player);
    for(let step=0;step<8;step++) {
      g.time+=.1; actor.x+=.15; actor.y-=.05;
      actor.phase=step<4?'windup':'idle'; actor.windupTime=.8; actor.timer=Math.max(.1,.8-step*.1);
      if(step===4)actor.strikeAt=g.time;
      r.actor(actor,g,player);
    }
  }
  for (const type of Object.keys(G.PARTS)) for (const hp of [G.PARTS[type].hp,10,0]) {
    r.part({type,x:12,y:43,hp,open:false},g);
    if(type==='door')r.part({type,x:12,y:43,hp,open:true},g);
  }
  for(const weapon of ['hands','sword','bow']) {
    g.player.weapon=weapon; g.player.inv[weapon]=1; g.player.strikeAt=g.time;
    r.actor(g.player,g,true);
  }
});

test('lake, mountain and multi-cell construction previews produce finite drawing geometry',()=>{
  const r=new Renderer(canvasMock()),g=G.createGame();
  for(const pos of [{x:23,y:19},{x:31,y:43},{x:39,y:39}]){Object.assign(g.player,pos);r.camera={...pos};r.draw(g);r.map(canvasMock(),g);}
  g.home={...G.START};Object.assign(g.player,G.START);r.camera={...G.START};g.player.inv.wood=100;
  r.draw(g,'floor',null,null,[{type:'floor',x:12,y:43},{type:'floor',x:13,y:43}]);
  r.draw(g,'wall',null,null,[{type:'wall',x:12,y:43,edge:0},{type:'wall',x:12,y:43,edge:1}]);
});

test('harvest tools and resource progress draw finite coordinates through windup, impact and recovery',()=>{
  const r=new Renderer(canvasMock());
  for(const type of ['wood','stone']){
    const g=G.createGame();g.enemies=[];g.resources=[{id:'harvest',...G.START,type,ready:0}];G.interact(g);
    for(let i=0;i<7;i++){G.tick(g,.08);r.draw(g);}
    assert.equal(g.resources[0].hits,1);
  }
});

test('expanded scenery, animals and all boss telegraphs render finite geometry',async()=>{
 const {drawNature,drawAnimal}=await import('../src/nature.js');
 const r=new Renderer(canvasMock()),g=G.createGame(1);
 for(const time of [0,.3,1,350]){
  g.time=time;
  for(const o of G.SCENERY)drawNature(r,o,g);
  for(const a of g.animals)drawAnimal(r,a,g,r.animator?.pose(a,time)||{facing:1,bob:1,step:.5});
  for(const resource of g.resources)r.resource(resource,g);
  const boss=g.enemies.find(e=>e.type==='boss');Object.assign(g.player,{x:boss.x+2,y:boss.y});r.camera={...G.BOSS_POS};
  for(const kind of ['swipe','slam','ranged']){Object.assign(boss,{attackKind:kind,attackFacingX:2,attackFacingY:0,phase:'windup',timer:.5,windupTime:1.3});r.draw(g);}
  g.projectiles=[{x:boss.x,y:boss.y,vx:2,vy:1,life:1}];g.effects=[{x:boss.x,y:boss.y,ring:4.6,life:.4,text:'КОРНИ',color:'#fff'}];r.draw(g);
 }
});

test('snow and fire terrain, minerals, magic and front/back poses draw finite geometry',async()=>{
 const {drawAnimal}=await import('../src/nature.js');const {drawActor}=await import('../src/art.js');
 const g=G.createGame(1),r=new Renderer(canvasMock());
 for(const b of G.BOSSES){Object.assign(g.player,b);r.camera={...b};g.time=3;r.draw(g);r.map(canvasMock(),g);}
 for(const view of ['front','back']){
  const pose={view,facing:1,step:.2,bob:0,pace:1,windup:0,strike:0,lunge:0};
  for(const actor of [g.player,...g.enemies])drawActor(r,actor,g,actor===g.player,pose);
  for(const a of g.animals)drawAnimal(r,a,g,pose);
 }
});
