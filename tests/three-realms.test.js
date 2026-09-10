import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {ActorAnimator} from '../src/animation.js';
import {fromPlane,HEX_DIRS} from '../src/hex.js';
const run=(g,s)=>{for(let i=0;i<Math.ceil(s/.05);i++)G.tick(g,.05);};
test('all three arenas are reachable on foot, have different resources and remain outside building zones',()=>{
 const g=G.createGame(4);assert.equal(g.enemies.filter(e=>e.type==='boss').length,3);
 const seen=new Set([`${G.START.x},${G.START.y}`]),queue=[G.START];
 for(let i=0;i<queue.length;i++)for(const [dx,dy]of HEX_DIRS){const p={x:queue[i].x+dx,y:queue[i].y+dy},key=`${p.x},${p.y}`;if(!seen.has(key)&&G.walkable(p.x,p.y)){seen.add(key);queue.push(p);}}
 for(const boss of G.BOSSES){assert.ok(seen.has(`${boss.x},${boss.y}`));assert.equal(G.biomeAt(boss.x,boss.y),boss.biome);Object.assign(g.player,boss);g.player.inv.wood=20;assert.equal(G.claimHome(g),false);}
 for(const [biome,type]of [['snow','crystal'],['fire','obsidian']])assert.ok(g.resources.some(r=>r.type===type&&G.biomeAt(r.x,r.y)===biome));
});
test('climate warns before damage and appropriate crafted protection prevents damage',()=>{
 for(const [biome,item]of [['snow','furCloak'],['fire','fireCloak']]){
  const g=G.createGame(1);g.enemies=[];g.animals=[];Object.assign(g.player,G.BOSSES.find(b=>b.biome===biome));
  run(g,10);assert.equal(g.player.hp,100);run(g,5);assert.ok(g.player.hp<100);g.player.inv[item]=1;const hp=g.player.hp;run(g,5);assert.equal(g.player.hp,hp);
 }
});
test('rune opens magic after snow materials, has a cooldown and consumes energy, not the item',()=>{
 const g=G.createGame(1);g.enemies=[G.makeEnemy('draugr',G.START.x+3,G.START.y,'target')];g.animals=[];g.player.inv.rune=1;
 const e=g.enemies[0];assert.ok(G.assignQuickSlot(g,8,'rune'));assert.ok(G.useQuickSlot(g,8));assert.equal(g.player.inv.rune,1);assert.equal(g.player.stamina,70);assert.ok(e.hp<e.maxHp);assert.equal(G.useQuickSlot(g,8),false);
});
test('boss progress and distinct arena origins survive saving and dying',()=>{
 const g=G.createGame(2);g.defeated=['forest','snow'];g.bossDefeated=true;
 const restored=G.loadGame(G.saveGame(g));assert.ok(restored.enemies.filter(e=>e.type==='boss'&&(e.biome==='forest'||e.biome==='snow')).every(e=>e.dead));
 const boss=restored.enemies.find(e=>e.biome==='fire'&&e.type==='boss');boss.hp=100;G.die(restored);assert.equal(boss.hp,boss.maxHp);assert.deepEqual(boss.origin,{x:142,y:122});
});
test('fleeing animal does not alternate patrol and escape at the distance threshold',()=>{
 const g=G.createGame(1);g.enemies=[];const a=g.animals[0];g.animals=[a];Object.assign(g.player,{x:a.x-4.9,y:a.y});
 G.tick(g,.05);assert.ok(a.fleeing);for(let i=0;i<100;i++){Object.assign(g.player,{x:a.x-5.2,y:a.y});G.tick(g,.05);assert.ok(a.fleeing);}
});
test('vertical travel selects front/back, slight horizontal jitter never flips the actor',()=>{
 for(const [dir,view]of [[1,'front'],[-1,'back']]){
  const a={x:30,y:40},anim=new ActorAnimator();anim.pose(a,0);let flips=0,last=1;
  for(let i=1;i<=50;i++){const d=fromPlane(dir*.03+(i%2?.0001:-.0001),dir*.03);a.x+=d.x;a.y+=d.y;const p=anim.pose(a,i*.05);if(p.facing!==last)flips++;last=p.facing;}
  assert.equal(anim.pose(a,2.5).view,view);assert.ok(flips<=1);
 }
});
