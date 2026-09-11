import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {GameAudio} from '../src/audio.js';
const advance=(g,seconds)=>{for(let t=0;t<seconds;t+=.05)G.tick(g,.05);};
test('expanded island has twice the former land area, four scenery types and seeded packs of 1–3',()=>{
 let land=0;for(let x=0;x<G.SIZE;x++)for(let y=0;y<G.SIZE;y++)if(G.walkable(x,y)&&G.biomeAt(x,y)==='forest')land++;
 assert.ok(land>3407*1.85&&land<3407*2.15);
 assert.deepEqual([...new Set(G.SCENERY.map(o=>o.type))].sort(),['fern','log','mushrooms','spring']);
 const sizes=new Set();
 for(let seed=1;seed<=12;seed++){
  const g=G.createGame(seed);for(let pack=0;pack<G.CAMPS.length;pack++){const count=g.enemies.filter(e=>e.pack===pack).length;assert.ok(count>=1&&count<=3);sizes.add(count);}
  assert.deepEqual(g.enemies,G.createGame(seed).enemies);
 }
 assert.deepEqual([...sizes].sort(),[1,2,3]);
});
test('idle monsters patrol and animals flee without attacking',()=>{
 const g=G.createGame(1),e=g.enemies.find(e=>e.type!=='boss'),before={...e};g.enemies=[e];g.animals=[];
 advance(g,10);assert.ok(G.distance(e,before)>.1);assert.ok(G.distance(e,e.origin)<8);
 const a=G.createGame(1).animals[0];g.enemies=[];g.animals=[a];Object.assign(g.player,{x:a.x-1,y:a.y});const hp=g.player.hp,d=G.distance(a,g.player);
 advance(g,1);assert.equal(g.player.hp,hp);assert.ok(G.distance(a,g.player)>d);
});
test('boss telegraphs three attacks, ranged bolts hit and slow, death resets the encounter',()=>{
 for(const [kind,index] of [['swipe',0],['slam',1],['ranged',2]]){
  const g=G.createGame(1),e=g.enemies.find(e=>e.type==='boss');g.enemies=[e];g.animals=[];
  Object.assign(g.player,{x:e.x+2,y:e.y});e.attackIndex=index;
  G.tick(g,.05);assert.equal(e.attackKind,kind);assert.equal(e.phase,'windup');const hp=g.player.hp;
  advance(g,.5);assert.equal(g.player.hp,hp,'telegraph precedes damage');
  while(e.phase==='windup')G.tick(g,.05);if(kind==='ranged'){assert.equal(g.projectiles.length,3);advance(g,.5);assert.ok(g.player.slow>0);}assert.ok(g.player.hp<hp);
  g.player.hp=.01;g.player.food=0;G.tick(g,.1);assert.ok(g.player.dead);assert.equal(e.hp,e.maxHp);assert.equal(g.projectiles.length,0);
 }
 assert.ok(G.bossAttackSpec('slam',true).time<G.bossAttackSpec('slam').time);
});
test('new resource economy and save migration preserve possessions and boss completion',()=>{
 const g=G.createGame(1);assert.ok(g.resources.some(r=>r.type==='herb'));assert.ok(g.resources.some(r=>r.type==='mushroom'));
 assert.deepEqual(G.RECIPES.potion.cost,{berry:2,herb:2});assert.equal(G.RECIPES.stew.cost.mushroom,2);
 g.landscape=2;g.bossDefeated=true;g.player.inv.wood=71;g.storage.hide=13;
 const loaded=G.loadGame(G.saveGame(g));assert.equal(loaded.landscape,4);assert.equal(loaded.player.inv.wood,71);assert.equal(loaded.storage.hide,13);assert.ok(loaded.enemies.find(e=>e.type==='boss').dead);
 assert.equal(loaded.animals.length,12);assert.deepEqual(loaded.sounds,[]);
});
test('audio waits for gesture, supports independent mute, bounded voices and background suspend',async()=>{
 const original=globalThis.AudioContext;let oscillators=0;
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(value){this.value=value;}});
 class Context{currentTime=0;destination={};state='suspended';createGain(){return {gain:param(),connect(){},disconnect(){}};}createOscillator(){oscillators++;return {frequency:param(),connect(){},disconnect(){},start(){},stop(){}};}async resume(){this.state='running';}async suspend(){this.state='suspended';}}
 try{
  globalThis.AudioContext=Context;const a=new GameAudio(),g=G.createGame(1);a.play('swing');assert.equal(oscillators,0);
  assert.ok(await a.unlock());a.update(g,true);assert.ok(oscillators>0);
  a.set('music',false);a.set('effects',false);const count=oscillators;G.sound(g,'impact');a.update(g,true);assert.equal(oscillators,count);assert.equal(g.sounds.length,0);assert.equal(a.music.gain.value,0);
  a.set('effects',true);for(let i=0;i<100;i++)a.play('impact');assert.ok(a.voices<=40);
  a.update(g,false);assert.equal(a.context.state,'suspended');a.update(g,true);assert.equal(a.context.state,'running');
 }finally{if(original===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=original;}
});

test('ranged bolts can be avoided or stopped by a wall',()=>{
 for(const wall of [false,true]){
  const g=G.createGame(1),e=g.enemies.find(e=>e.type==='boss');g.enemies=[e];g.animals=[];
  Object.assign(g.player,{x:e.x+6,y:e.y});G.tick(g,.05);assert.equal(e.attackKind,'ranged');
  while(e.phase==='windup')G.tick(g,.05);
  if(wall)g.parts=[{id:1,type:'wall',x:e.x+4,y:e.y,edge:0,hp:150}];
  else g.player.y+=4;
  const hp=g.player.hp;advance(g,1);assert.equal(g.player.hp,hp);
 }
});
