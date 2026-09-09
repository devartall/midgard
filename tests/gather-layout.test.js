import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {gameKey} from '../src/keys.js';
import {hudLayout,overlap,auditHud} from '../src/layout.js';
const advance=(g,t)=>{for(let i=0;i<Math.round(t*100);i++)G.tick(g,.01);};
function resourceGame(type,time=0){
 const g=G.createGame();g.enemies=[];g.time=time;g.resources=[{id:'target',...G.START,type,ready:0}];g.player.inv={};return g;
}
test('wood and stone require timed hits, give loot once, and behave identically by day and night',()=>{
 for(const time of [0,350])for(const type of ['wood','stone']){
  const g=resourceGame(type,time),r=g.resources[0];
  for(let hit=1;hit<=G.GATHER[type].hits;hit++){
   assert.equal(G.interact(g),'harvest');for(let spam=0;spam<5;spam++)assert.equal(G.interact(g),null);
   advance(g,.1);assert.equal(g.player.inv[type],undefined);advance(g,.5);
   if(hit<G.GATHER[type].hits){assert.equal(r.hits,hit);assert.equal(g.player.inv[type],undefined);}
  }
  assert.equal(g.player.inv[type],G.GATHER[type].yield);assert.equal(g.stats.gathered,1);
  G.interact(g);assert.match(g.events.at(-1).text,/истощён/);assert.equal(g.player.inv[type],G.GATHER[type].yield);
  advance(g,241);assert.equal(r.hits,0);assert.equal(G.interact(g),'harvest');
 }
});
test('pause, walking away, construction and intervening walls cancel a harvest without phantom rewards',()=>{
 const g=resourceGame('wood'),r=g.resources[0];G.interact(g);g.paused=true;advance(g,1);assert.equal(r.hits,undefined);g.paused=false;
 g.player.x+=3;advance(g,.3);assert.equal(r.hits,undefined);assert.equal(g.player.harvest,null);
 Object.assign(g.player,G.START);G.interact(g);g.parts=[{id:1,type:'floor',...G.START,hp:100}];advance(g,.3);assert.equal(r.hits,undefined);
 g.parts=[];g.player.x=G.START.x-1;g.parts=[{id:2,type:'wall',...G.START,edge:3,hp:150}];assert.equal(G.context(g),null);
});
test('decorative walls do not steal interaction from a nearby resource; partial progress survives save/load',()=>{
 const g=resourceGame('stone');g.player.x-=.3;g.parts=[{id:1,type:'wall',x:G.START.x,y:G.START.y-1,edge:1,hp:150}];
 assert.equal(G.context(g).id,'target');G.interact(g);advance(g,.6);
 const loaded=G.loadGame(G.saveGame(g));assert.equal(loaded.resources[0].hits,1);assert.equal(loaded.player.harvest,null);
 loaded.resources[0].hits=99;assert.throws(()=>G.loadGame(G.saveGame(loaded)));
});
test('berries remain a one-action pickup, and physical E works in Russian and Latin layouts',()=>{
 const g=resourceGame('berry');assert.equal(G.interact(g),'gather');assert.equal(g.player.inv.berry,3);
 for(const key of ['e','E','у','У'])assert.equal(gameKey({key,code:'KeyE'}),'e');
 assert.equal(gameKey({key:'у'}),'e');assert.equal(gameKey({key:'ц',code:'KeyW'}),'w');assert.equal(gameKey({key:'!',code:'Digit1'}),'1');
});
test('HUD region budgets keep toast, hotbar, menus, status and combat separate across landscape viewports',()=>{
 for(const [w,h]of [[568,280],[667,320],[734,303],[844,280],[844,303],[844,390],[896,414],[1024,768],[1280,720],[1920,1080]])for(const insets of [{},{left:47,right:47,bottom:21}]){
  const layout=hudLayout(w,h,insets),regions=Object.entries(layout.regions);
  for(const [name,r]of regions){assert.ok(r.x>=0&&r.y>=0&&r.width>0&&r.height>0,`${w}x${h} ${name}`);assert.ok(r.x+r.width<=w&&r.y+r.height<=h);}
  for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++)assert.equal(overlap(regions[i][1],regions[j][1]),false,`${w}x${h}: ${regions[i][0]} vs ${regions[j][0]}`);
  assert.ok(layout.regions.toast.y+layout.toast<layout.regions.quickbar.y);
 }
});
test('browser rectangle audit detects overlap and an off-centre close glyph instead of merely passing fixtures',()=>{
 const rect=(x,y,width,height)=>({x,y,width,height,right:x+width,bottom:y+height});
 const node=r=>({getClientRects:()=>[r],getBoundingClientRect:()=>r,closest:()=>null,querySelectorAll:()=>[]});
 const elements={'#toast':node(rect(10,10,100,30)),'#quickbar':node(rect(10,20,100,30)),'.close-button':{...node(rect(10,10,40,40)),querySelector:()=>node(rect(11,12,22,22))}};
 const errors=auditHud({defaultView:{innerWidth:844,innerHeight:390},querySelector:s=>elements[s]});
 assert.ok(errors.some(x=>x.includes('overlaps')));assert.ok(errors.includes('close icon is not centred'));
});
