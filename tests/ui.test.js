// Wiring smoke test with a minimal DOM/Canvas adapter, not a browser or visual test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync
}
from 'node:fs';
test('UI boots, opens every panel, moves via keyboard, saves and pauses while hidden',async()=>{
  const elements=new Map(),winEvents=new Map(),docEvents=new Map(),storage=new Map();
  let nextFrame;
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
  assert.match(elements.get('panel').innerHTML,/Лесной очаг/);
  click('play');
  nextFrame(100);
  const initial=JSON.parse(storage.get('forest-hearth-v1'));
  winEvents.get('keydown')({
    key:'d',preventDefault(){
    },repeat:false
  });
  for(let t=200; t<=2200; t+=100)nextFrame(t);
  winEvents.get('keyup')({
    key:'d'
  });
  elements.get('pauseBtn').onclick();
  const moved=JSON.parse(storage.get('forest-hearth-v1'));
  assert.ok(moved.player.x>initial.player.x);
  assert.ok(moved.time>initial.time);
  click('close');
  for(const n of nav){
    n.events.get('click')();
    assert.match(elements.get('panel').innerHTML,/panelTitle/);
    click('close');
  }
  nav.find(n=>n.dataset.panel==='build').events.get('click')();
  click('claim');
  assert.match(elements.get('panel').innerHTML,/нужно 4 дерева/);
  click('close');
  elements.get('mapBtn').onclick();
  assert.ok(elements.has('mapCanvas'));
  click('close');
  document.hidden=true;
  docEvents.get('visibilitychange')();
  const paused=JSON.parse(storage.get('forest-hearth-v1'));
  for(let t=3000; t<5000; t+=100)nextFrame(t);
  elements.get('pauseBtn').onclick();
  assert.equal(JSON.parse(storage.get('forest-hearth-v1')).time,paused.time);
});
