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
