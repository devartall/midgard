import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../src/hex.js';
import * as G from '../src/game.js';
import {MELEE,bladeSegment,sweptHit} from '../src/combat.js';
const advance=(g,t)=>{for(let i=0;i<Math.ceil(t/.01);i++)G.tick(g,.01);};
test('six equidistant neighbours round correctly and share identical boundary segments',()=>{
 for(let side=0;side<6;side++){
  const [x,y]=H.HEX_DIRS[side];assert.ok(Math.abs(H.metric({x,y},{x:0,y:0})-1)<1e-9);
  assert.deepEqual(H.hexRound(x*.8,y*.8),{x,y});
  assert.ok(H.sameEdge({x:0,y:0,edge:side},{x,y,edge:(side+3)%6}));
  const [a,b]=H.edgePoints({x:0,y:0},side);assert.ok(Math.abs(H.metric(a,b)-1/Math.sqrt(3))<1e-9);
 }
});
test('thin walls block crossing their edge, leave cell interiors free, and cannot be duplicated from neighbour',()=>{
 const g=G.createGame();g.home={...G.START};g.player.inv={wood:100};const {x,y}=g.home;
 G.build(g,'floor',x,y);G.build(g,'floor',x+1,y);assert.ok(G.build(g,'wall',x,y,0));
 assert.ok(G.canStand(g,x,y));assert.ok(G.canStand(g,x+1,y));assert.equal(G.canStand(g,x+.5,y),false);
 assert.equal(G.build(g,'wall',x+1,y,3),false);
 G.move(g,g.player,1,0);assert.ok(g.player.x<x+.33);assert.ok(G.canStand(g,g.player.x,g.player.y));
});
test('blade cannot hit outside its physical reach or behind its directed sweep',()=>{
 const swing={weapon:'sword',started:0,angle:0,hit:[]},origin={x:0,y:0};
 assert.ok(sweptHit(swing,origin,{x:1,y:0},0,.4));
 assert.equal(sweptHit(swing,origin,{x:1.3,y:0},0,.4),false);
 assert.equal(sweptHit(swing,origin,{x:-.8,y:0},0,.4),false);
 assert.equal(sweptHit(swing,origin,{x:.8,y:0},0,.1),false);
 assert.ok(Math.abs(H.metric(origin,bladeSegment(origin,0,MELEE.sword.reach)[1])-MELEE.sword.reach)<1e-9);
});
test('melee damage happens during swing once; escaping during windup avoids it',()=>{
 for(const escape of [false,true]){
  const g=G.createGame(),e=G.makeEnemy('draugr',g.player.x+.9,g.player.y,'target');g.enemies=[e];e.stun=10;
  g.player.inv.sword=1;g.player.weapon='sword';G.attack(g);assert.equal(e.hp,e.maxHp);
  if(escape)e.x+=2;advance(g,.65);
  assert.equal(e.hp,escape?e.maxHp:e.maxHp-24);
 }
});
test('old saves retain inventory and wall outlines while removed counter fields are discarded',()=>{
 const g=G.createGame();g.player.parry=1;g.player.parryCooldown=1;g.player.inv.wood=42;
 g.parts=[{id:1,type:'wall',x:13,y:43,hp:100}];
 const restored=G.loadGame(G.saveGame(g));assert.equal(restored.player.inv.wood,42);
 assert.equal('parry' in restored.player,false);assert.equal(H.wallEdges(restored.parts[0]).length,6);
});
