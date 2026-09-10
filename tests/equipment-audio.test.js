import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {armPose} from '../src/arms.js';
import {GameAudio,audioSettings} from '../src/audio.js';

test('equipment starts absent, toggles independently, persists, and migrates old armor saves',()=>{
 const g=G.createGame(1),p=g.player;
 assert.equal(G.wearingArmor(p),false);assert.equal(G.usingShield(p),false);assert.equal(G.useItem(g,'shield'),false);
 p.inv.armor=1;p.inv.shield=1;p.inv.sword=1;p.weapon='sword';
 for(const item of ['armor','shield']){assert.ok(G.useItem(g,item));assert.ok(p[item+'Equipped']);assert.ok(G.assignQuickSlot(g,8,item));}
 assert.ok(G.wearingArmor(p));assert.ok(G.usingShield(p));assert.equal(p.weapon,'sword');
 const saved=G.loadGame(G.saveGame(g));assert.ok(G.wearingArmor(saved.player));assert.ok(G.usingShield(saved.player));
 G.useItem(g,'armor');G.useItem(g,'shield');assert.equal(G.wearingArmor(p),false);assert.equal(G.usingShield(p),false);
 delete p.armorEquipped;delete p.shieldEquipped;
 const migrated=G.loadGame(G.saveGame(g));assert.ok(G.wearingArmor(migrated.player));assert.equal(G.usingShield(migrated.player),false);
});
test('shield is crafted at a bench and only protects with a free offhand and stamina',()=>{
 const g=G.createGame(2),p=g.player;g.enemies=[];p.inv={wood:8,hide:2,resin:1};
 assert.equal(G.craft(g,'shield'),false);
 g.parts=[{id:1,type:'bench',...G.START,hp:120}];assert.ok(G.craft(g,'shield'));assert.ok(G.usingShield(p));assert.equal(p.inv.wood,undefined);
 const damage=(shield,weapon,stamina=100)=>{p.hp=100;p.stamina=stamina;p.skills.guard=0;p.shieldEquipped=shield;p.weapon=weapon;p.blocking=true;G.damagePlayer(g,20,G.makeEnemy('draugr',p.x+1,p.y,'test'));return 100-p.hp;};
 assert.equal(damage(false,'hands'),16);assert.equal(damage(true,'hands'),4);assert.equal(damage(true,'bow'),16);assert.equal(damage(true,'sword',0),20);
});
test('arm segments keep their lengths through unreachable targets and mirrored poses',()=>{
 for(const side of [-1,1])for(let angle=0;angle<Math.PI*2;angle+=.05)for(const radius of [0,4,12,19,40]){
  const shoulder={x:8,y:-32},a=armPose(shoulder,{x:shoulder.x+Math.cos(angle)*radius,y:shoulder.y+Math.sin(angle)*radius},side);
  assert.ok(Math.abs(Math.hypot(a.elbow.x-shoulder.x,a.elbow.y-shoulder.y)-10)<1e-8);
  assert.ok(Math.abs(Math.hypot(a.hand.x-a.elbow.x,a.hand.y-a.elbow.y)-10)<1e-8);
  assert.ok(Math.hypot(a.hand.x-shoulder.x,a.hand.y-shoulder.y)<=19.500001);
 }
});
test('independent audio levels clamp, migrate and survive mute toggles',()=>{
 assert.deepEqual(audioSettings({music:false,effects:true}),{music:false,effects:true,musicVolume:.8,effectsVolume:.8});
 assert.equal(audioSettings({musicVolume:NaN}).musicVolume,.8);
 const a=new GameAudio(),param=()=>({value:0,setTargetAtTime(v){this.value=v;}});
 a.context={currentTime:0};a.music={gain:param()};a.effects={gain:param()};a.apply();const effects=a.effects.gain.value;
 a.setVolume('music',0);assert.equal(a.music.gain.value,0);assert.equal(a.effects.gain.value,effects);
 a.setVolume('music',.45);a.set('music',false);assert.equal(a.music.gain.value,0);a.set('music',true);assert.ok(a.music.gain.value>0);assert.equal(a.settings.musicVolume,.45);
 a.setVolume('effects',2);assert.equal(a.settings.effectsVolume,1);a.setVolume('effects',-1);assert.equal(a.effects.gain.value,0);assert.ok(a.music.gain.value>0);
 assert.deepEqual(audioSettings(JSON.parse(JSON.stringify(a.settings))),a.settings);
});
test('barehand blocking never disables equipped armor protection',()=>{
 const g=G.createGame(3),p=g.player;p.inv.armor=1;p.armorEquipped=true;p.skills.guard=0;
 const enemy=G.makeEnemy('draugr',p.x+1,p.y,'a');G.damagePlayer(g,20,enemy);const normal=100-p.hp;
 p.hp=100;p.skills.guard=0;p.blocking=true;G.damagePlayer(g,20,enemy);assert.ok(100-p.hp<normal);
 G.die(g);assert.equal(G.wearingArmor(p),false);assert.equal(G.carryingShield(p),false);
});
