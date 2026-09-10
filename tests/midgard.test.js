import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import * as H from '../src/hex.js';
import {placementPlan,planCost} from '../src/construction.js';
function house(){const g=G.createGame();g.enemies=[];g.home={...G.START};g.player.inv={wood:500,stone:500};return g;}

test('drag builds a floor region and connected closed wall perimeter; atomic failure spends nothing',()=>{
  const g=house(),a={x:11,y:42},b={x:13,y:44};
  const floors=placementPlan(g,'floor',a,b);assert.equal(floors.length,9);assert.deepEqual(planCost(floors,G.PARTS),{wood:18});
  assert.ok(G.buildBatch(g,floors));assert.equal(placementPlan(g,'floor',b,a).length,0);
  const walls=placementPlan(g,'wall',a,b);assert.ok(walls.length>6);
  const vertices=new Map();for(const p of walls)for(const v of H.edgePoints(p,p.edge)){const key=`${v.x.toFixed(5)},${v.y.toFixed(5)}`;vertices.set(key,(vertices.get(key)||0)+1);}
  assert.ok([...vertices.values()].every(n=>n===2),'every segment meets its neighbours');
  const inv={...g.player.inv};g.player.inv.wood=1;const count=g.parts.length;
  assert.equal(G.buildBatch(g,walls),false);assert.equal(g.player.inv.wood,1);assert.equal(g.parts.length,count);
  g.player.inv=inv;assert.ok(G.buildBatch(g,walls));assert.ok(G.sheltered(g));
  for(let angle=0;angle<360;angle+=5){Object.assign(g.player,G.START);const d=H.fromPlane(Math.cos(angle*Math.PI/180)*5,Math.sin(angle*Math.PI/180)*5);G.move(g,g.player,d.x,d.y);assert.ok(G.sheltered(g),`escaped at ${angle}`);assert.ok(G.canStand(g,g.player.x,g.player.y));}
});
test('all six wall orientations stop both actors, including fast movement; doors open an actual passage',()=>{
  for(let edge=0;edge<6;edge++){
    const g=house(),[dx,dy]=H.HEX_DIRS[edge],p={type:'door',...G.START,edge,id:1,hp:140,open:false};g.parts=[p];
    for(const actor of [g.player,G.makeEnemy('wolf',G.START.x,G.START.y,'w')]){
      G.move(g,actor,dx,dy);assert.ok(G.distance(actor,G.START)<.4);assert.ok(H.wallDistance(p,actor)>=.18-1e-7);
    }
    p.open=true;Object.assign(g.player,G.START);G.move(g,g.player,dx,dy);assert.ok(G.distance(g.player,{x:G.START.x+dx,y:G.START.y+dy})<1e-8);
  }
});
test('edge auto-selection uses the touched boundary and avoids duplicate segments',()=>{
  const g=house();G.build(g,'floor',12,43);
  const plan=placementPlan(g,'wall',{x:12.49,y:43},{x:12.49,y:43});assert.equal(plan[0].edge,0);G.buildBatch(g,plan);
  const next=placementPlan(g,'wall',{x:12,y:43.49},{x:12,y:43.49});assert.equal(next[0].edge,1);
  assert.ok(G.buildBatch(g,next));
});
test('health potion recipe, capped healing, cooldown, pause, hotbar and save validation',()=>{
  const g=house();g.parts=[{type:'fire',...G.START,hp:100,id:1}];g.player.inv={berry:9,herb:6,sword:1};g.player.hp=80;
  assert.ok(G.craft(g,'potion'));assert.equal(g.player.inv.berry,7);
  assert.ok(G.assignQuickSlot(g,8,'potion'));assert.ok(G.useQuickSlot(g,8));assert.equal(g.player.hp,100);assert.equal(g.player.inv.potion,undefined);
  assert.ok(G.craft(g,'potion'));g.player.hp=20;assert.equal(G.useQuickSlot(g,8),false);assert.equal(g.player.inv.potion,1);
  g.paused=true;G.tick(g,.1);assert.equal(g.player.potionCooldown,20);g.paused=false;
  for(let i=0;i<201;i++)G.tick(g,.1);assert.ok(G.useQuickSlot(g,8));assert.equal(g.player.hp,60);
  assert.ok(G.assignQuickSlot(g,0,'sword'));assert.ok(G.useQuickSlot(g,0));assert.equal(g.player.weapon,'sword');assert.equal(G.assignQuickSlot(g,0,'wood'),false);
  const loaded=G.loadGame(G.saveGame(g));assert.deepEqual(loaded.player.quickbar,g.player.quickbar);
  loaded.player.quickbar[2]='<script>';assert.throws(()=>G.loadGame(G.saveGame(loaded)));
});
test('landscape has impassable lakes/mountains, reachable landmarks and clustered enemies; old homes survive migration',()=>{
  const g=G.createGame();assert.ok(g.resources.length<1800);assert.ok(g.enemies.length>=11);
  for(let pack=0;pack<G.CAMPS.length;pack++){const count=g.enemies.filter(e=>e.pack===pack).length;assert.ok(count>=1&&count<=3);}
  for(const pos of [{x:23,y:19},{x:31,y:43}])assert.equal(G.canStand(g,pos.x,pos.y),false);
  for(const e of g.enemies)assert.ok(G.walkable(e.x,e.y));for(const r of g.resources)assert.ok(G.walkable(r.x,r.y));
  // Flood fill confirms obstacles have not cut off the boss, notes, or camp centres.
  const seen=new Set(),queue=[G.START];for(let i=0;i<queue.length;i++){
    const p=queue[i],key=`${p.x},${p.y}`;if(seen.has(key))continue;seen.add(key);
    for(const [dx,dy]of H.HEX_DIRS){const q={x:p.x+dx,y:p.y+dy};if(G.walkable(q.x,q.y)&&!seen.has(`${q.x},${q.y}`))queue.push(q);}
  }
  for(const p of [G.BOSS_POS,...G.NOTES,...G.CAMPS])assert.ok(seen.has(`${p.x},${p.y}`));
  g.landscape=undefined;g.home={x:23,y:19};g.parts=[{type:'floor',x:23,y:19,hp:100,id:1}];g.player.inv.wood=42;
  delete g.player.quickbar;delete g.player.potionCooldown;
  const loaded=G.loadGame(G.saveGame(g));assert.equal(loaded.player.inv.wood,42);assert.equal(loaded.parts.length,1);assert.ok(G.walkable(23,19,loaded));assert.equal(loaded.player.quickbar.length,9);
});
