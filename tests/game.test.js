import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
function advance(g,seconds){
  for(let i=0; i<Math.round(seconds*10); i++)G.tick(g,.1);
}
function supplies(g){
  Object.assign(g.player.inv,{
    wood:200,stone:100,hide:20,resin:20,meat:10,berry:10
  });
}
function room(g){
  supplies(g);
  G.claimHome(g);
  const {
    x,y
  }
  =g.home;
  g.player.x=x;
  g.player.y=y;
  assert.ok(G.build(g,'floor',x,y));
  for(let edge=0;edge<6;edge++)assert.ok(G.build(g,edge===0?'door':'wall',x,y,edge));
  return {
    x,y
  };
}
test('fixed forest and renewable resources; gathering is only possible nearby',()=>{
  const a=G.createGame(),b=G.createGame();
  assert.deepEqual(a.resources,b.resources);
  const r=a.resources.find(r=>r.id==='start10');
  a.player.x=r.x;
  a.player.y=r.y;
  a.enemies=[];
  for(let i=0;i<G.GATHER.wood.hits;i++){G.interact(a);advance(a,.6);}
  assert.equal(a.player.inv.wood,4);
  assert.ok(r.ready>a.time);
  advance(a,241);
  assert.ok(r.ready<=a.time);
});
test('home is unique; closed walls shelter, open door and breach do not',()=>{
  const g=G.createGame();
  room(g);
  assert.ok(G.sheltered(g));
  assert.equal(G.claimHome(g),false);
  const door=g.parts.find(p=>p.type==='door');
  door.open=true;
  assert.equal(G.sheltered(g),false);
  door.open=false;
  door.hp=0;
  assert.equal(G.sheltered(g),false);
  assert.equal(G.build(g,'wall',g.home.x+6,g.home.y),false);
});
test('construction spends only on valid placement and preserves occupied floor',()=>{
  const g=G.createGame();
  supplies(g);
  G.claimHome(g);
  const wood=g.player.inv.wood;
  assert.equal(G.build(g,'wall',g.home.x,g.home.y),false);
  assert.equal(g.player.inv.wood,wood);
  assert.ok(G.build(g,'floor',g.home.x,g.home.y));
  assert.equal(G.build(g,'floor',g.home.x,g.home.y),false);
  assert.equal(g.player.inv.wood,wood-2);
});
test('walls block movement while open doors allow it',()=>{
  const g=G.createGame();
  room(g);
  const {
    x,y
  }
  =g.home;
  assert.equal(G.canStand(g,x,y-.5),false);
  const door=g.parts.find(p=>p.type==='door');
  assert.equal(G.canStand(g,door.x+.5,door.y),false);
  door.open=true;
  assert.ok(G.canStand(g,door.x,door.y));
});
test('craft requires nearby unblocked station and consumes its recipe',()=>{
  const g=G.createGame();
  supplies(g);
  assert.equal(G.craft(g,'sword'),false);
  g.parts.push({
    id:1,type:'bench',x:g.player.x+1,y:g.player.y,hp:120
  });
  assert.ok(G.craft(g,'sword'));
  assert.equal(g.player.inv.sword,1);
  assert.equal(g.player.inv.stone,94);
  g.enemies.push(G.makeEnemy('wolf',g.player.x+1,g.player.y,'guard'));
  assert.equal(G.craft(g,'sword'),false);
});
test('food separates buff from satiety; starvation can kill; pause freezes everything',()=>{
  const g=G.createGame();
  g.enemies=[];
  g.player.inv.stew=1;
  assert.ok(G.eat(g,'stew'));
  assert.equal(G.maxHp(g),140);
  advance(g,901);
  assert.equal(G.maxHp(g),100);
  assert.ok(g.player.food>1700);
  assert.equal(g.player.hp,100);
  g.paused=true;
  const saved=G.saveGame(g);
  advance(g,300);
  assert.equal(G.saveGame(g),saved);
  g.paused=false;
  g.player.food=0;
  advance(g,150);
  assert.ok(g.player.dead);
});
test('storage is preserved, blocked by proximity only and usable when guard leaves',()=>{
  const g=G.createGame();
  g.parts.push({
    id:1,type:'chest',x:g.player.x,y:g.player.y,hp:160
  });
  g.player.inv.wood=12;
  assert.ok(G.storeItems(g));
  const e=G.makeEnemy('wolf',g.player.x+1,g.player.y,'guard');
  g.enemies.push(e);
  assert.equal(G.storeItems(g,true),false);
  assert.equal(g.storage.wood,12);
  e.x+=10;
  assert.ok(G.storeItems(g,true));
  assert.equal(g.player.inv.wood,12);
});
test('death drops retrievable inventory, keeps home/skills, resets boss, and permits safe respawn',()=>{
  const g=G.createGame();
  room(g);
  g.player.inv.sword=1;
  g.player.skills.sword=22;
  g.storage.wood=50;
  const boss=g.enemies.find(e=>e.type==='boss');
  boss.hp=40;
  const parts=structuredClone(g.parts);
  G.die(g);
  assert.equal(boss.hp,boss.maxHp);
  assert.deepEqual(g.parts,parts);
  assert.equal(g.storage.wood,50);
  assert.equal(g.player.skills.sword,22);
  assert.equal(g.player.inv.sword,undefined);
  assert.ok(G.respawn(g,false));
  assert.equal(g.player.x,G.START.x);
  G.interact(g);
  assert.equal(g.player.inv.sword,1);
  assert.equal(g.graves.length,0);
});
test('block reduces damage without reflecting or stunning the attacker',()=>{
 const g=G.createGame(),e=G.makeEnemy('draugr',g.player.x+1,g.player.y,'e');
 g.player.inv.shield=1;g.player.shieldEquipped=true;g.player.blocking=true;G.damagePlayer(g,20,e);assert.equal(g.player.hp,96);assert.equal(e.stun,0);
 assert.equal('parry' in G,false);assert.equal('parry' in g.player,false);
});
test('archery consumes ammo; melee cannot hit through wall',()=>{
  const g=G.createGame();
  g.enemies=[G.makeEnemy('draugr',g.player.x+1,g.player.y,'e')];
  g.player.inv={
    bow:1,arrow:2,sword:1
  };
  g.player.weapon='bow';
  assert.ok(G.attack(g));
  assert.equal(g.player.inv.arrow,1);
  const hp=g.enemies[0].hp;
  g.player.attack=0;
  g.parts.push({
    id:2,type:'wall',x:g.player.x+1,y:g.player.y,hp:100
  });
  assert.ok(G.attack(g));
  assert.equal(g.enemies[0].hp,hp);
});
test('skill growth rewards focus and transfer loses 20 percent without creating experience',()=>{
  const g=G.createGame();
  G.gainSkill(g,'sword',5);
  G.gainSkill(g,'bow',5);
  assert.ok(g.player.skills.sword>g.player.skills.bow*4);
  g.player.skills={
    sword:20,bow:0,guard:0
  };
  assert.equal(G.transferSkill(g,'sword','bow'),false);
  g.parts.push({
    id:1,type:'bench',x:g.player.x,y:g.player.y,hp:120
  });
  assert.ok(G.transferSkill(g,'sword','bow'));
  assert.equal(g.player.skills.sword,10);
  assert.equal(g.player.skills.bow,8);
});
test('night warns before raid, decoration adds no threat, stronger home attracts breaker',()=>{
  const g=G.createGame();
  g.home={
    ...G.START
  };
  g.parts=[{
    id:1,type:'decor',...G.START,hp:100
  }];
  assert.equal(G.homeValue(g),0);
  g.parts.push({
    id:2,type:'bench',...G.START,hp:120
  },{
    id:3,type:'kitchen',...G.START,hp:120
  });
  g.time=299.9;
  advance(g,.2);
  assert.ok(g.raidPending);
  assert.equal(g.enemies.some(e=>e.raid),false);
  advance(g,25);
  assert.ok(g.enemies.some(e=>e.type==='breaker'&&e.raid));
  assert.equal(g.raidDay,1);
});
test('boss victory persists and drops a trophy; no second boss is spawned',()=>{
  const g=G.createGame();
  const e=g.enemies.find(e=>e.type==='boss');
  g.player.x=e.x-1;
  g.player.y=e.y;
  g.player.inv.sword=1;
  g.player.weapon='sword';
  e.hp=1;
  G.attack(g);
  assert.equal(g.bossDefeated,false);
  advance(g,.4);
  assert.ok(g.bossDefeated);
  assert.equal(g.player.inv.trophy,1);
  assert.ok(e.dead);
});
test('save/load preserves simulation, drops transient effects and rejects malformed data',()=>{
  const g=G.createGame();
  room(g);
  advance(g,15);
  const loaded=G.loadGame(G.saveGame(g));
  assert.deepEqual(loaded.parts,g.parts);
  assert.deepEqual(loaded.player.inv,g.player.inv);
  assert.equal(loaded.time,g.time);
  assert.equal(loaded.paused,false);
  assert.throws(()=>G.loadGame('{"version":2}'));
  const invalid=JSON.parse(G.saveGame(g));
  invalid.parts[0].type='unknown';
  assert.throws(()=>G.loadGame(JSON.stringify(invalid)));
});
test('door closing and rebuilding a ruin cannot trap the player inside a solid tile',()=>{
  const g=G.createGame();
  room(g);
  const door=g.parts.find(p=>p.type==='door');
  door.open=true;
  g.player.x=door.x+.5;
  g.player.y=door.y;
  G.interact(g);
  assert.ok(door.open);
  door.hp=0;
  const wood=g.player.inv.wood;
  assert.equal(G.repair(g,door),false);
  assert.equal(g.player.inv.wood,wood);
});
test('attacking an overlapping enemy never corrupts facing or save coordinates',()=>{
  const g=G.createGame();
  g.enemies=[G.makeEnemy('wolf',g.player.x,g.player.y,'same')];
  G.attack(g);
  assert.ok(Number.isFinite(g.player.facing.x));
  assert.doesNotThrow(()=>G.loadGame(G.saveGame(g)));
});
test('corrupt imported inventory, journal and skill data are rejected before replacing a world',()=>{
  for(const mutate of [g=>g.player.skills.sword='bad',g=>g.notes=[99],g=>g.player.inv.unknown=2,g=>g.enemies[0].speed=null]){
    const g=G.createGame();
    mutate(g);
    assert.throws(()=>G.loadGame(JSON.stringify(g)));
  }
});
test('a remote raid leaves repairable ruins and never consumes stored resources',()=>{
  const g=G.createGame();
  supplies(g);
  g.home={
    x:20,y:35
  };
  g.parts=[{
    id:1,type:'wall',x:20,y:35,hp:10
  },{
    id:2,type:'chest',x:21,y:35,hp:160
  }];
  g.storage={
    wood:80,stone:30
  };
  g.enemies=[G.makeEnemy('breaker',19,35,'raid',true)];
  advance(g,30);
  assert.equal(g.parts.find(p=>p.id===1).hp,0);
  assert.deepEqual(g.storage,{
    wood:80,stone:30
  });
  assert.equal(g.parts.find(p=>p.id===2).hp,160);
});
