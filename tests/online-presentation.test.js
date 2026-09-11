import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlinePresentation} from '../src/presentation.js';
import {randomProfile,appearance,LOOKS} from '../src/character.js';
const state=(time,x)=>({time,player:{id:'p',x,y:0,dead:false},peers:[{id:'friend',x,y:1}],enemies:[],animals:[]});
test('online presentation interpolates every frame without mutating simulation or actor identity',()=>{
 const p=new OnlinePresentation();for(let i=0;i<=5;i++)p.push(state(i*.1,i*.2),i*100);
 const g=state(.5,1),before=JSON.stringify(g);let previous=-1,changes=0,actor;
 for(let now=500;now<=690;now+=10){const view=p.draw(g,now);if(actor)assert.equal(view.player,actor);actor=view.player;if(view.player.x>previous)changes++;previous=view.player.x;assert.equal(view.peers[0].x,view.player.x);}
 assert.equal(changes,20);assert.equal(JSON.stringify(g),before);
 assert.equal(p.draw(g,5000).player.x,1,'no extrapolation on disconnect');
});
test('presentation handles teleport, backwards server time and jitter without reversing animation clock',()=>{
 const p=new OnlinePresentation();p.push(state(1,0),0);p.push(state(1.1,20),100);
 assert.equal(p.draw(state(1.1,20),250).player.x,20);
 const time=p.draw(state(1.1,20),260).time;p.push(state(1.12,20),270);assert.ok(p.draw(state(1.12,20),270).time>=time);
 p.push(state(0,5),300);assert.equal(p.draw(state(0,5),300).player.x,5);
});
test('random profiles cover both sexes and valid cosmetics; old saves keep a stable default',()=>{
 const male=randomProfile(()=>0),female=randomProfile(()=>.99);assert.equal(male.appearance.sex,'male');assert.equal(female.appearance.sex,'female');assert.notEqual(male.name,female.name);
 for(const profile of [male,female])for(const [key,choices]of Object.entries(LOOKS))assert.ok(choices.includes(profile.appearance[key]));
 assert.equal(appearance().sex,'male');assert.equal(appearance({sex:'invalid'}).sex,'male');assert.equal(appearance(female.appearance).sex,'female');
});
