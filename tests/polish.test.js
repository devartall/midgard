import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {metric,edgePoints,sameEdge} from '../src/hex.js';
import {joystickVector,movementVector} from '../src/input.js';
import {placementPlan,planCost} from '../src/construction.js';
import {RECIPE_ORDER,recipeStatus,nextObjective,itemSummary} from '../src/usability.js';
const fresh=()=>{const g=G.createGame(1);g.enemies=[];g.animals=[];return g;};
test('food cannot waste a meal or downgrade a stronger active health bonus',()=>{
 const g=fresh(),p=g.player;p.inv={berry:3,stew:2,roast:2};
 assert.equal(G.eat(g,'berry'),false);assert.equal(p.inv.berry,3);
 assert.ok(G.eat(g,'stew'));p.hp=140;assert.equal(G.eat(g,'roast'),false);
 G.tick(g,.1);assert.equal(G.eat(g,'stew'),false);assert.equal(p.inv.stew,1);
 p.food=100;assert.ok(G.eat(g,'roast'));assert.equal(p.food,1200);assert.equal(G.maxHp(g),140);assert.equal(p.hp,140);
 p.buff=0;p.food=2700;assert.ok(G.eat(g,'roast'));assert.equal(G.maxHp(g),120);
});
test('deposit keeps potions, magic, climate protection and equipment',()=>{
 const g=fresh();g.parts=[{type:'chest',...G.START,hp:160}];
 g.player.inv={wood:10,berry:2,meat:1,potion:3,rune:1,furCloak:1,fireCloak:1,emberSeal:1,trophy:1,frostSword:1,arrow:12};
 assert.ok(G.storeItems(g,false));assert.deepEqual(g.storage,{wood:10,berry:2,meat:1});
 for(const k of ['potion','rune','furCloak','fireCloak','emberSeal','trophy','frostSword','arrow'])assert.ok(g.player.inv[k]);
});
test('joystick dead zone and analog speed are independent of heading',()=>{
 assert.deepEqual(joystickVector(.05,.03),{x:0,y:0});
 for(const amount of [.1,.5,1])for(let i=0;i<8;i++){
  const a=i*Math.PI/4,j=joystickVector(Math.cos(a)*amount,Math.sin(a)*amount),v=movementVector(j.x,j.y);
  assert.ok(Math.abs(metric(v,{x:0,y:0})-(amount-.09)/.91)<1e-9);
 }
 assert.ok(Math.abs(metric(movementVector(1,1),{x:0,y:0})-1)<1e-9);
});
test('action feedback is rate limited and energy rejection never spends',()=>{
 const g=fresh();g.player.stamina=0;
 for(let i=0;i<10;i++)assert.equal(G.attack(g),false);
 assert.equal(g.events.length,1);assert.equal(g.player.feedback.energy,true);assert.equal(g.player.stamina,0);
 g.time=1.1;G.attack(g);assert.equal(g.events.length,2);
 G.useQuickSlot(g,8);assert.match(g.events.at(-1).text,/пуста/);
});
test('rune damage no longer depends on weapon tier or weapon seal',()=>{
 for(const weapon of ['sword','emberSword']){
  const g=fresh();g.player.inv={[weapon]:1,rune:1,emberSeal:1};G.useItem(g,weapon);
  const e=G.makeEnemy('draugr',G.START.x+3,G.START.y,'target');g.enemies=[e];
  assert.ok(G.useItem(g,'rune'));assert.equal(e.maxHp-e.hp,45);assert.equal(g.player.stamina,80);
 }
});
function house(){const g=fresh();g.home={...G.START};g.player.inv={wood:50,stone:10};G.build(g,'floor',G.START.x,G.START.y);G.build(g,'wall',G.START.x,G.START.y,0);return g;}
test('door snaps to an existing wall and charges only the difference, preserving damage',()=>{
 const g=house(),wall=g.parts.find(p=>p.type==='wall');wall.hp=75;g.player.inv={wood:1};
 const [a,b]=edgePoints(wall,0),point={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const plan=placementPlan(g,'door',point,point);assert.equal(plan.length,1);assert.equal(plan[0].replaces,'wall');
 assert.deepEqual(planCost(plan,G.PARTS),{wood:1});assert.ok(G.buildBatch(g,plan));
 const door=g.parts.find(p=>p.type==='door');assert.equal(door.hp,70);assert.equal(g.player.inv.wood||0,0);assert.equal(g.parts.length,2);
 assert.equal(G.canStand(g,point.x,point.y),false);door.open=true;assert.equal(G.canStand(g,point.x,point.y),true);
 assert.ok(G.build(g,'wall',door.x,door.y,door.edge));assert.equal(g.player.inv.wood,1);assert.equal(g.parts.find(p=>p.type==='wall').hp,75);
});
test('replacement is atomic, rejects enemies and ignores a forged preview credit',()=>{
 const g=house(),wall=g.parts.find(p=>p.type==='wall');g.player.inv={wood:0};
 const original=JSON.stringify(g.parts);assert.equal(G.buildBatch(g,[{type:'door',...G.START,edge:0,replaces:'reinforce'}]),false);
 assert.equal(JSON.stringify(g.parts),original);assert.equal(g.player.inv.wood,0);
 g.player.inv.wood=10;g.enemies=[G.makeEnemy('wolf',G.START.x+2,G.START.y,'enemy')];
 assert.equal(G.build(g,'door',wall.x,wall.y,0),false);assert.equal(g.player.inv.wood,10);
 g.enemies=[];assert.equal(G.buildBatch(g,[{type:'door',...G.START,edge:0},{type:'floor',x:0,y:0}]),false);
 assert.equal(JSON.stringify(g.parts),original);assert.equal(g.player.inv.wood,10);
});
test('replacement from a neighbouring floor never duplicates the shared edge',()=>{
 const g=house();G.build(g,'floor',G.START.x+1,G.START.y);
 assert.ok(G.build(g,'door',G.START.x+1,G.START.y,3));
 assert.equal(g.parts.filter(p=>G.PARTS[p.type].solid&&sameEdge(p,{...G.START,edge:0})).length,1);
});
test('recipes explain shortages and progression asks for supplies before the boss',()=>{
 const g=fresh();assert.equal(RECIPE_ORDER[0],'sword');assert.equal(new Set(RECIPE_ORDER).size,Object.keys(G.RECIPES).length);
 assert.match(recipeStatus(g,'sword').text,/верстак/);g.parts=[{type:'bench',...G.START,hp:120}];
 assert.match(recipeStatus(g,'sword').text,/Дерево ×5/);g.player.inv={wood:5,stone:6};assert.ok(recipeStatus(g,'sword').ready);
 G.craft(g,'sword');assert.match(nextObjective(g)[0],/Припасы/);g.player.inv.roast=1;G.eat(g,'roast');assert.match(nextObjective(g)[0],/Защита/);
 g.player.inv.shield=1;G.useItem(g,'shield');assert.match(nextObjective(g)[0],/Древний/);
 assert.match(itemSummary(g,'sword'),/24/);assert.match(itemSummary(g,'rune'),/не зависит/);
});
