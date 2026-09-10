import {createGame,saveGame} from '../src/game.js';
// Wiring smoke test with a minimal DOM/Canvas adapter, not a browser or visual test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync
}
from 'node:fs';
test('UI boots, opens every panel, moves via keyboard, saves and pauses while hidden',async()=>{
  const elements=new Map(),winEvents=new Map(),docEvents=new Map(),storage=new Map();
  let nextFrame,frameClock=0;
  const frame=()=>nextFrame(frameClock+=100);
  const ctx=new Proxy({
    createRadialGradient:()=>({
      addColorStop(){
      }
    })
  }, {
    get:(o,k)=>o[k]||(()=>{
    }),set:(o,k,v)=>(o[k]=v,true)
  });
  class Element {
    constructor(id){
      this.id=id;
      this.style={
      };
      this.dataset={
      };
      this.events=new Map();
      this.classes=new Set();
      this.classList={
        add:k=>this.classes.add(k),remove:k=>this.classes.delete(k),toggle:(k,on)=>on?this.classes.add(k):this.classes.delete(k)
      };
      this._html='';
      this.value='';
    }
    set innerHTML(v){
      this._html=v;
      for(const m of v.matchAll(/id="([^"]+)"/g))if(!elements.has(m[1]))elements.set(m[1],new Element(m[1]));
    }
    get innerHTML(){
      return this._html;
    }
    addEventListener(k,fn){
      this.events.set(k,fn);
    }
    getContext(){
      return ctx;
    }
    setPointerCapture(){
    }
    getBoundingClientRect(){
      return{
        left:30,top:250,width:108,height:108
      };
    }
  }
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const m of html.matchAll(/id="([^"]+)"/g))elements.set(m[1],new Element(m[1]));
  const nav=[...html.matchAll(/data-panel="([^"]+)"/g)].map(m=>{
    const e=new Element(m[1]);
    e.dataset.panel=m[1];
    return e;
  });
  globalThis.innerWidth=844;
  globalThis.innerHeight=390;
  globalThis.devicePixelRatio=2;
  globalThis.window={
    addEventListener:(k,fn)=>winEvents.set(k,fn)
  };
  globalThis.document={
    hidden:false,activeElement:null,getElementById:id=>elements.get(id)||null,querySelectorAll:sel=>sel==='[data-panel]'?nav:[],addEventListener:(k,fn)=>docEvents.set(k,fn)
  };
  globalThis.localStorage={
    getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)
  };
  globalThis.matchMedia=()=>({
    matches:false
  });
  globalThis.requestAnimationFrame=fn=>{
    nextFrame=fn;
  };
  const seed=createGame();seed.player.inv.wood=500;seed.player.inv.stone=100;seed.enemies=[];seed.time=350;seed.resources=[{id:'uiwood',x:seed.player.x,y:seed.player.y,type:'wood',ready:0}];storage.set('forest-hearth-v1',saveGame(seed));
  await import('../src/main.js');
  const click=action=>elements.get('panel').events.get('click')({
    target:{
      closest:()=>({
        dataset:{
          action
        }
      })
    }
  });
  assert.match(elements.get('panel').innerHTML,/Мидгард/);
  click('play');
  frame();
  winEvents.get('keydown')({key:'у',code:'KeyE',repeat:false,preventDefault(){}});
  for(let i=0;i<26;i++)frame();
  winEvents.get('keyup')({key:'у',code:'KeyE'});
  elements.get('pauseBtn').onclick();assert.equal(JSON.parse(storage.get('forest-hearth-v1')).player.inv.wood,504,'holding physical E harvests at night in Cyrillic layout');click('close');
  const initial=JSON.parse(storage.get('forest-hearth-v1'));
  winEvents.get('keydown')({
    key:'d',preventDefault(){
    },repeat:false
  });
  for(let t=200; t<=2200; t+=100)frame();
  winEvents.get('keyup')({
    key:'d'
  });
  elements.get('pauseBtn').onclick();
  const panel=elements.get('panel'),beforeVolume=panel.innerHTML;
  for(const [channel,value]of [['music','35'],['effects','65']]){
    const event={target:{dataset:{volume:channel},value}};
    panel.events.get('input')(event);assert.equal(elements.get('volume-'+channel).textContent,value+'%');
    assert.equal(panel.innerHTML,beforeVolume,'drag does not recreate the slider');
    panel.events.get('change')(event);
  }
  const levels=JSON.parse(storage.get('midgard-audio'));assert.equal(levels.musicVolume,.35);assert.equal(levels.effectsVolume,.65);
  const moved=JSON.parse(storage.get('forest-hearth-v1'));
  assert.ok(moved.player.x>initial.player.x);
  assert.ok(moved.time>initial.time);
  click('close');
  for(const n of nav){
    n.events.get('click')();
    assert.match(elements.get('panel').innerHTML,/panelTitle/);
    click('close');
  }
  nav.find(n=>n.dataset.panel==='bag').events.get('click')();
  assert.match(elements.get('panel').innerHTML,/inventory-grid/);click('select:berry');assert.match(elements.get('panel').innerHTML,/Назначить на пояс/);
  click('assign:berry:8');click('close');
  winEvents.get('keydown')({key:'9',repeat:false,preventDefault(){}});
  let saved=JSON.parse(storage.get('forest-hearth-v1'));assert.equal(saved.player.quickbar[8],'berry');assert.equal(saved.player.inv.berry,2);
  elements.get('quickbar').events.get('pointerdown')({pointerType:'touch',preventDefault(){},target:{closest:()=>({dataset:{slot:'8'}})}});
  saved=JSON.parse(storage.get('forest-hearth-v1'));assert.equal(saved.player.inv.berry,1);
  nav.find(n=>n.dataset.panel==='build').events.get('click')();
  click('claim');
  assert.ok(JSON.parse(storage.get('forest-hearth-v1')).home);
  const world=elements.get('world');
  const send=(type,x,y)=>world.events.get(type)({type,pointerId:77,pointerType:'touch',button:0,cancelable:true,clientX:x,clientY:y,preventDefault(){}});
  send('pointerdown',350,165);send('pointermove',490,230);frame();frame();
  assert.match(elements.get('buildHint').innerHTML,/частей/);
  assert.equal(JSON.parse(storage.get('forest-hearth-v1')).parts.length,0,'no placement before release');
  send('pointerup',490,230);
  const built=JSON.parse(storage.get('forest-hearth-v1'));assert.ok(built.parts.filter(p=>p.type==='floor').length>1);
  send('pointerdown',350,165);send('pointermove',470,235);send('pointercancel',470,235);
  elements.get('pauseBtn').onclick();
  assert.equal(JSON.parse(storage.get('forest-hearth-v1')).parts.length,built.parts.length,'cancel spends and builds nothing');
  click('close');
  elements.get('mapBtn').onclick();
  assert.ok(elements.has('mapCanvas'));
  click('close');
  document.hidden=true;
  docEvents.get('visibilitychange')();
  const paused=JSON.parse(storage.get('forest-hearth-v1'));
  for(let t=3000; t<5000; t+=100)frame();
  elements.get('pauseBtn').onclick();
  assert.equal(JSON.parse(storage.get('forest-hearth-v1')).time,paused.time);
});
