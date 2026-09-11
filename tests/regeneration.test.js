import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
const run=(g,seconds)=>{for(let i=0;i<seconds*10;i++)G.tick(g,.1);};
const setup=()=>{const g=G.createGame(1);g.enemies=[];g.animals=[];g.player.hp=40;return g;};
test('passive regeneration scales continuously with satiety and prepared meals',()=>{
 const g=setup(),p=g.player;p.food=0;const base=G.regeneration(p);p.food=420;const berry=G.regeneration(p);p.food=1200;const roast=G.regeneration(p);p.food=2700;const stew=G.regeneration(p);assert.ok(base<berry&&berry<roast&&roast<stew);
 p.inv.roast=1;G.eat(g,'roast');assert.ok(Math.abs(G.regeneration(p)-stew-.15)<1e-9);
 p.inv.stew=1;G.eat(g,'stew');assert.ok(Math.abs(G.regeneration(p)-stew-.3)<1e-9);p.buff=0;assert.equal(G.regeneration(p),stew);
});
test('regeneration heals over time, caps at food-adjusted maximum, and stops on pause or death',()=>{
 const g=setup();run(g,5);assert.ok(g.player.hp>40);g.paused=true;const hp=g.player.hp;run(g,5);assert.equal(g.player.hp,hp);g.paused=false;
 g.player.hp=G.maxHp(g)-.01;run(g,1);assert.equal(g.player.hp,G.maxHp(g));G.die(g);run(g,2);assert.equal(g.player.hp,0);assert.equal(G.regeneration(g.player),0);
});
test('hunger and unprotected climate remain lethal despite regeneration',()=>{
 const g=setup();g.player.food=0;run(g,5);assert.ok(g.player.hp<40);g.player.hp=1;run(g,5);assert.ok(g.player.dead);
 const h=setup();Object.assign(h.player,G.BOSSES.find(b=>b.biome==='fire'));h.player.food=2700;run(h,15);assert.ok(h.player.dead);
});
test('online healing uses each hero’s own satiety once per server tick',()=>{
 const g=setup(),a=g.player,b=structuredClone(a);a.id='a';b.id='b';a.food=420;b.food=2700;g.players=[a,b];const ar=G.regeneration(a),br=G.regeneration(b);
 G.tickPlayers(g,.1,{});assert.ok(Math.abs(a.hp-(40+ar*.1))<.00001);assert.ok(Math.abs(b.hp-(40+br*.1))<.00001);assert.ok(b.hp>a.hp);
});
