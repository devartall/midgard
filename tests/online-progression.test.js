import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {Rooms,roomRequest} from '../tools/rooms.mjs';
import {createServer} from 'node:http';
import * as G from '../src/game.js';
import {appearance,characterName,LOOKS} from '../src/character.js';
import {weaponPower} from '../src/gear.js';

function pair(){const service=new Rooms(),a=service.create({name:'Астрид'}),b=service.join(a.code,{name:'Бьёрн'}),room=service.rooms.get(a.code);room.game.enemies=[];room.game.animals=[];service.tick(.05);return {service,a,b,room,p:room.members.get(a.token).player,q:room.members.get(b.token).player};}
test('custom appearance is bounded and survives solo saving',()=>{const g=G.createGame(1);g.player.appearance=appearance({skin:LOOKS.skin[2],style:'braid',cloth:'javascript:bad'});g.player.name=characterName('<Astrid>');const p=G.loadGame(G.saveGame(g)).player;assert.equal(p.appearance.skin,LOOKS.skin[2]);assert.equal(p.appearance.cloth,LOOKS.cloth[0]);assert.equal(p.name,'Astrid');});
test('new biome gear needs local resources and replaces old gear with stronger attack and defense',()=>{
 const g=G.createGame(1);g.enemies=[];g.parts=[{id:1,...G.START,type:'bench',hp:120}];
 for(const [item,gear]of Object.entries(G.GEAR)){g.player.inv={wood:999,stone:999,hide:999};assert.equal(G.craft(g,item),false,item);g.player.inv={...gear.cost};assert.ok(G.craft(g,item),item);assert.ok(g.player.inv[item]);if(gear.slot==='weapon'){assert.equal(g.player.weaponItem,item);assert.ok(G.weaponOwned(g.player));assert.ok(weaponPower(g.player)>1);}else assert.equal(g.player[gear.slot+'Item'],item);}
 const p=G.loadGame(G.saveGame(g)).player;assert.equal(p.shieldItem,'emberShield');assert.ok(G.carryingShield(p));
});
test('shared room advances once per step and movement belongs to the authenticated player',()=>{
 const {service,a,b,room,p,q}=pair(),t=room.game.time,old={x:q.x,y:q.y};
 service.poll(a.code,a.token,{input:{x:1,y:0}});service.tick(.05);assert.equal(room.game.time,t+.05);assert.ok(p.x>q.x);assert.deepEqual({x:q.x,y:q.y},old);
 assert.throws(()=>service.poll(a.code,'wrong',{}));assert.equal(service.snapshot(room,room.members.get(b.token)).peers[0].id,p.id);
});
test('PvP requires both opt-ins, including a toggle during a swing',()=>{
 const {service,room,p,q}=pair();Object.assign(q,{x:p.x+.5,y:p.y});p.inv.sword=1;p.weapon='sword';p.pvp=true;
 G.attack(room.game);for(let i=0;i<10;i++)service.tick(.05);assert.equal(q.hp,100);
 q.pvp=true;p.attack=0;G.attack(room.game);for(let i=0;i<10;i++)service.tick(.05);assert.ok(q.hp<100);
 const hp=q.hp;p.attack=0;G.attack(room.game);q.pvp=false;for(let i=0;i<10;i++)service.tick(.05);assert.ok(q.hp>=hp);
});
test('a harvested shared node rewards only one hero and repeated command IDs cannot double-spend',()=>{
 const {service,a,room,p,q}=pair();room.game.resources=[{id:'berry',x:p.x,y:p.y,type:'berry',ready:0}];p.inv={};q.inv={};
 service.poll(a.code,a.token,{actions:[{seq:1,name:'interact',args:[]},{seq:1,name:'interact',args:[]}]});room.game.player=q;G.interact(room.game);assert.equal(p.inv.berry,3);assert.equal(q.inv.berry,undefined);
 assert.throws(()=>service.command(room.game,'add',['wood',999]));assert.throws(()=>service.command(room.game,'craft',['__proto__']));
});
test('disconnect stops movement, empty room pauses and persisted tokens restore the same hero',async()=>{
 const {service,a,room,p}=pair(),dir=await mkdtemp(tmpdir()+'/midgard-');try{room.members.get(a.token).input={x:1};const x=p.x;service.tick(.1,Date.now()+1000);assert.equal(p.x,x);const t=room.game.time;service.tick(.1,Date.now()+31000);assert.equal(room.game.time,t);p.inv.wood=17;await service.save(dir);const restored=new Rooms();await restored.load(dir);const joined=restored.join(a.code,{},a.token);assert.equal(joined.playerId,p.id);assert.equal(joined.state.player.inv.wood,17);}finally{await rm(dir,{recursive:true,force:true});}});
test('later bosses use different cycles; ice wave rewards moving inside and fire leaves delayed hazards',()=>{
 for(const biome of ['snow','fire']){const g=G.createGame(1),boss=g.enemies.find(e=>e.type==='boss'&&e.biome===biome);g.enemies=[boss];g.animals=[];Object.assign(g.player,{x:boss.x+1,y:boss.y});g.player.inv.furCloak=1;g.player.inv.fireCloak=1;boss.attackIndex=biome==='snow'?1:0;G.tick(g,.05);assert.equal(boss.attackKind,biome==='snow'?'frostwave':'meteor');for(let i=0;i<40;i++)G.tick(g,.05);if(biome==='snow'){assert.equal(g.player.hp,100);assert.ok(boss.vulnerableUntil>g.time);}else{assert.ok(g.hazards.length);assert.ok(g.hazards[0].at>g.time);}}
});
test('HTTP clients create and join a room without receiving each other’s reconnect credentials',async()=>{
 const rooms=new Rooms(),server=createServer((req,res)=>roomRequest(rooms,req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port,post=async(path,body)=>{const r=await fetch(url+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 try{const a=(await post('create',{profile:{name:'One'}})).body,b=(await post('join',{code:a.code,profile:{name:'Two'}})).body;assert.equal(a.code,b.code);assert.notEqual(a.playerId,b.playerId);assert.ok(!JSON.stringify(b.state).includes(a.token));assert.equal((await post('poll',{code:a.code,token:'invalid'})).status,400);const state=await post('poll',{code:a.code,token:a.token,input:{x:1},actions:[]});assert.equal(state.status,200);assert.equal(state.body.state.peers[0].name,'Two');}finally{await new Promise(resolve=>server.close(resolve));}
});
test('boss rewards remain available to both current and late joining friends',()=>{
 const {service,a,room,p,q}=pair();G.claimBossReward(p,'forest');G.claimBossReward(q,'forest');room.game.defeated=['forest'];assert.equal(p.inv.trophy,1);assert.equal(q.inv.trophy,1);G.claimBossReward(p,'forest');assert.equal(p.inv.trophy,1);const late=service.join(a.code,{name:'Late'});assert.equal(late.state.player.inv.trophy,1);
});
test('one player dying does not heal the boss while a friend remains alive',()=>{
 const {room,p,q}=pair(),g=room.game,boss=G.makeEnemy('boss',G.BOSS_POS.x,G.BOSS_POS.y,'boss');boss.hp=300;g.enemies=[boss];g.player=p;G.die(g);assert.equal(boss.hp,300);g.player=q;G.die(g);assert.equal(boss.hp,boss.maxHp);
});
