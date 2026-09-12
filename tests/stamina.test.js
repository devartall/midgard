import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {Rooms} from '../tools/rooms.mjs';
import {joystickSprint} from '../src/input.js';
const fresh=()=>{const g=G.createGame();g.enemies=[];g.animals=[];g.parts=[];g.player.stamina=100;return g;};
const advance=(g,seconds,input={})=>{for(let i=0;i<Math.round(seconds*20);i++)G.tick(g,.05,input);};
test('joystick starts running only at the edge and tolerates small finger movements',()=>{
 assert.equal(joystickSprint(.9),false);
 assert.equal(joystickSprint(.97),true);
 assert.equal(joystickSprint(.94,true),true);
 assert.equal(joystickSprint(.89,true),false);
});
test('gathering charges each swing once, rejects exhaustion, and resumes after recovery',()=>{
 for(const type of Object.keys(G.GATHER)){
  const g=fresh(),cost=G.GATHER[type].hits===1?2:4;
  g.resources=[{id:'target',...G.START,type,ready:0}];
  g.player.stamina=cost-1;
  assert.equal(G.interact(g),null);assert.equal(g.player.harvest,undefined);
  assert.equal(g.resources[0].hits,undefined);
  advance(g,1);const before=g.player.stamina;
  assert.ok(G.interact(g));assert.equal(g.player.stamina,before-cost);
  const paid=g.player.stamina;G.interact(g);assert.equal(g.player.stamina,paid);
  advance(g,.3);assert.equal(g.player.stamina,paid);
 }
});
test('sprint is faster, drains energy, and cannot sprint again immediately after exhaustion',()=>{
 const walk=fresh(),run=fresh();advance(walk,.5,{x:1,y:0});advance(run,.5,{x:1,y:0,sprint:true});
 assert.ok(G.distance(run.player,G.START)>G.distance(walk.player,G.START)*1.4);assert.ok(Math.abs(run.player.stamina-92)<.01);
 run.player.stamina=.5;advance(run,.05,{x:1,y:0,sprint:true});assert.equal(run.player.sprinting,false);assert.equal(run.player.sprintExhausted,true);
 advance(run,1,{x:1,y:0,sprint:true});assert.equal(run.player.sprinting,false);assert.ok(run.player.stamina<25);
});
test('attacks consume substantial energy and recovery pauses after swinging',()=>{
 const g=fresh();assert.equal(G.attack(g),true);assert.equal(g.player.stamina,88);advance(g,.3);assert.equal(g.player.stamina,88);
 g.player.attack=0;g.player.stamina=11;assert.equal(G.attack(g),false);assert.equal(g.player.stamina,11);
});
test('block allows gradual recovery, shield absorbs damage, and enemy hits drain stamina',()=>{
 const idle=fresh(),block=fresh();idle.player.stamina=40;block.player.stamina=40;
 advance(idle,1);advance(block,1,{block:true});assert.ok(Math.abs(idle.player.stamina-46)<.01);assert.ok(Math.abs(block.player.stamina-46)<.01);
 const open=fresh(),guard=fresh(),enemy={};guard.player.inv.shield=1;guard.player.shieldEquipped=true;guard.player.blocking=true;
 G.damagePlayer(open,20,enemy);G.damagePlayer(guard,20,enemy);
 assert.ok(open.player.stamina<100);assert.ok(guard.player.stamina<100);assert.ok(guard.player.hp>open.player.hp);
 const before=guard.player.stamina;advance(guard,1,{block:true});assert.ok(guard.player.stamina>before);
 const climate=fresh();G.damagePlayer(climate,5);assert.equal(climate.player.stamina,100);
});
test('room input accepts only an explicit boolean sprint request',()=>{
 const rooms=new Rooms(),s=rooms.create();rooms.poll(s.code,s.token,{input:{x:1,sprint:true}});assert.equal(rooms.member(s.code,s.token).member.input.sprint,true);
 const s2=rooms.join(s.code);rooms.poll(s2.code,s2.token,{input:{x:1,sprint:'true'}});assert.equal(rooms.member(s2.code,s2.token).member.input.sprint,false);
});
