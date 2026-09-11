import {appearance,characterName} from './character.js';
import {GEAR,weaponOwned,weaponPower,gearTier,weaponItem} from './gear.js';
export {GEAR,weaponOwned,weaponItem,gearTier};
import {SIZE,START,BOSS_POS,CAMPS,SCENERY,BOSSES,biomeAt,BIOME_NAMES,hash,terrainBase,isTrail} from './world.js';
export {SIZE,START,BOSS_POS,CAMPS,SCENERY,BOSSES,biomeAt,BIOME_NAMES,hash,isTrail} from './world.js';
import { HEX_DIRS, hexRound, hexDistance, metric, wallDistance, sameEdge, wallSegments, intersects, segmentDistance, toPlane, fromPlane, pointSegment } from './hex.js';
import { MELEE, ENEMY_REACH, sweptHit, aimAngle } from './combat.js';
// Pure simulation. Seconds of active play only; no wall-clock progression.
export const DAY=480;
export const ITEMS = {
 ...Object.fromEntries(Object.entries(GEAR).map(([k,v])=>[k,v.name])),frostHide:'Шкура ледяного зверя',emberCore:'Угольное сердце',
  wood:'Дерево', stone:'Камень', berry:'Ягоды', meat:'Мясо', hide:'Шкура', resin:'Смола', sword:'Меч', bow:'Лук', arrow:'Стрелы', armor:'Кожаная броня',shield:'Деревянный щит', roast:'Жаркое', stew:'Лесная похлёбка', trophy:'Сердце леса', potion:'Зелье здоровья', herb:'Лечебные травы', mushroom:'Лесные грибы',crystal:'Ледяной кристалл',obsidian:'Обсидиан',frostHeart:'Сердце зимы',flameHeart:'Сердце пламени',furCloak:'Меховой плащ',fireCloak:'Плащ огнестойкости',rune:'Руна мороза',emberSeal:'Печать обсидиана'
};
export const PARTS = {
  floor:{
    name:'Пол', cost:{
      wood:2
    }, hp:100, value:0, desc:'Основа комнаты. Ставьте стены по краю.'
  },
  wall:{
    name:'Стена', cost:{
      wood:3
    }, hp:150, value:0, solid:true, desc:'Преграда. Замкните контур вокруг пола.'
  },
  door:{
    name:'Дверь', cost:{
      wood:4
    }, hp:140, value:0, solid:true, desc:'Открывайте рядом кнопкой действия.'
  },
  fire:{
    name:'Очаг', cost:{
      wood:5,stone:4
    }, hp:100, value:6, desc:'Готовка и отдых в закрытом доме.'
  },
  bench:{
    name:'Верстак', cost:{
      wood:8,stone:2
    }, hp:120, value:12, desc:'Оружие, стрелы и броня.'
  },
  chest:{
    name:'Сундук', cost:{
      wood:6
    }, hp:160, value:5, desc:'Запасы сохраняются после смерти.'
  },
  bed:{
    name:'Лежанка', cost:{
      wood:5,hide:2
    }, hp:80, value:4, desc:'Домашняя точка возрождения.'
  },
  kitchen:{
    name:'Котелок', cost:{
      wood:6,stone:12,resin:3
    }, hp:120, value:18, desc:'Похлёбка с долгим насыщением.'
  },
  reinforce:{
    name:'Укрепление', cost:{
      stone:5,wood:2
    }, hp:350, value:8, solid:true, desc:'Укреплённая стена выдержит больше ударов.'
  },
  decor:{
    name:'Резной столб', cost:{
      wood:5,resin:1
    }, hp:100, value:0, desc:'Немного ускоряет отдых. Не усиливает набеги.'
  },
};
export const RECIPES = {
 ...Object.fromEntries(Object.entries(GEAR).map(([k,v])=>[k,{cost:v.cost,station:'bench',count:1}])),
  shield:{cost:{wood:8,hide:2,resin:1},station:'bench',count:1},
  emberSeal:{cost:{obsidian:12,crystal:4,resin:4},station:'bench',count:1},
  furCloak:{cost:{trophy:1,hide:6,resin:3},station:'bench',count:1},
  fireCloak:{cost:{frostHeart:1,crystal:6,hide:8},station:'bench',count:1},
  rune:{cost:{crystal:5,resin:4,stone:8},station:'bench',count:1},
  potion:{cost:{berry:2,herb:2},station:'fire',count:1},
  sword:{
    cost:{
      wood:5,stone:6
    }, station:'bench', count:1
  },
  bow:{
    cost:{
      wood:8,hide:2
    }, station:'bench', count:1
  },
  arrow:{
    cost:{
      wood:2,stone:1
    }, station:'bench', count:12
  },
  armor:{
    cost:{
      hide:4,resin:2
    }, station:'bench', count:1
  },
  roast:{
    cost:{
      meat:1,wood:1
    }, station:'fire', count:1
  },
  stew:{
    cost:{
      meat:1,mushroom:2,berry:2,wood:1
    }, station:'kitchen', count:1
  },
};
export const FOODS = {
  berry:{
    sat:420,buff:0,hp:0
  }, roast:{
    sat:1200,buff:600,hp:20
  }, stew:{
    sat:2700,buff:900,hp:40
  }
};
export const GATHER={crystal:{hits:5,label:'Добывать',yield:3},obsidian:{hits:6,label:'Добывать',yield:3},wood:{hits:4,label:'Рубить',yield:4},stone:{hits:5,label:'Добывать',yield:3},berry:{hits:1,label:'Собрать',yield:3},herb:{hits:1,label:'Срезать',yield:3},mushroom:{hits:1,label:'Собрать',yield:3}};
export const GATHER_RANGE=1.65;
export const SKILLS = {
  sword:'Меч', bow:'Лук', guard:'Защита'
};
export const NOTES = [
{
  x:15,y:41,title:'Камень у тропы',text:'Мы строили стены до заката. Звери чуяли нас, но дерево сдерживало их. Когда в доме застучали новые станки, из чащи пришли те, кому стены были по зубам.'
},
{
  x:33,y:27,title:'Запись охотника',text:'Древний долго заносит ветвистую руку. Я отступил, пока ветви падали, и ударил в обнажившуюся кору. На следующем взмахе я поспешил…'
},
{
  x:44,y:18,title:'Надпись на корнях',text:'Раненый лес не молчит. Когда сердце тускнеет, корни вздымаются кругом. Помни: шаг назад — не всегда бегство.'
},
];
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const distance = (a,b) => metric(a,b);
export function terrain(x,y,g=null){
  if(g?.legacyTerrainHome&&g.home&&inHome(g,{x,y}))return 'grass';
  return terrainBase(x,y);
}
export const walkable=(x,y,g=null)=>!['water','mountain','lava'].includes(terrain(x,y,g));
export function nearestLand(pos,g=null){
  if(walkable(pos.x,pos.y,g))return {x:pos.x,y:pos.y};
  const c=hexRound(pos.x,pos.y);
  for(let r=1;r<SIZE;r++)for(let x=c.x-r;x<=c.x+r;x++)for(let y=c.y-r;y<=c.y+r;y++)if(hexDistance(c,{x,y})===r&&walkable(x,y,g))return{x,y};
  return {...START};
}
const enemyData = {
  wolf:{
    name:'Серый волк',hp:46,speed:2.6,damage:12
  }, draugr:{
    name:'Лесной скиталец',hp:75,speed:1.5,damage:16
  }, breaker:{
    name:'Корнелом',hp:145,speed:1.1,damage:24
  }, boss:{
    name:'Йотун корней',hp:1100,speed:1.35,damage:38
  }
};
export function makeEnemy(type,x,y,id,raid=false) {
  const d=enemyData[type];
  return {
    id,type,x,y,origin:{
      x,y
    },hp:d.hp,maxHp:d.hp,speed:d.speed,damage:d.damage,phase:'idle',timer:0,cooldown:0,stun:0,attackIndex:0,raid,dead:false,respawnAt:0
  };
}
export function createGame(seed=Math.floor(Math.random()*1e9)) {
  const g={
    version:1,grid:'hex',landscape:4,seed,time:0,player:{
      ...START,appearance:appearance(),name:'Странник',pvp:false,hp:100,stamina:100,food:600,buff:0,foodBonus:0,inv:{
        wood:0,stone:0,berry:3
      },quickbar:['sword','bow','berry','roast','stew','potion',null,null,null],potionCooldown:0,weapon:'hands',durability:100,skills:{
        sword:0,bow:0,guard:0
      },focus:'sword',armorEquipped:false,shieldEquipped:false,dead:false,attack:0,hurt:0,blocking:false,facing:{
        x:0,y:-1
      }
    },home:null,parts:[],resources:[],enemies:[],animals:[],projectiles:[],sounds:[],graves:[],notes:[],storage:{
    },events:[],effects:[],nextId:1,raidDay:0,raidWarning:0,raidPending:false,bossDefeated:false,defeated:[],stats:{
      gathered:0,crafted:0,kills:0,nights:0
    },paused:false
  };
  for(let x=4; x<SIZE-4; x++) for(let y=4; y<SIZE-4; y++) {
    if(!walkable(x,y)||distance({
      x,y
    },START)<2.5||distance({
      x,y
    },BOSS_POS)<5||NOTES.some(n=>distance(n,{
      x,y
    })<1.4)||isTrail(x,y))continue;
    const h=hash(x,y);
    const biome=biomeAt(x,y);
    let type=h<.043?'wood':h<.059?'stone':h<.076?'berry':null;
    if(biome!=='forest'&&h>=.043&&h<.08)type=biome==='snow'?'crystal':'obsidian';
    if(type)g.resources.push({
      id:`r${x}_${y}`,x,y,type,ready:0
    });
  }
  for(const [x,y,type] of [[10,42,'wood'],[11,40,'wood'],[15,44,'stone'],[13,45,'berry']])g.resources.push({
    id:`start${x}`,x,y,type,ready:0
  });
  for(const scene of SCENERY){
    const type=scene.type==='fern'?'herb':scene.type==='mushrooms'?'mushroom':scene.type==='log'?'wood':null;
    if(type){g.resources=g.resources.filter(r=>r.x!==scene.x||r.y!==scene.y);g.resources.push({id:scene.id,x:scene.x,y:scene.y,type,variant:scene.type,ready:0});}
  }
  g.resources.push({id:'starter-herbs',x:14,y:45,type:'herb',variant:'fern',ready:0});
  for(let pack=0;pack<CAMPS.length;pack++){
    const camp=CAMPS[pack],count=1+Math.floor(hash(pack+seed,17)*3);
    for(let i=0;i<count;i++){
      const pos=nearestLand({x:camp.x+(i-1)*.7,y:camp.y});
      const e=makeEnemy(camp.type,pos.x,pos.y,`pack${pack}_${i}`);e.pack=pack;applyBiome(e);g.enemies.push(e);
    }
  }
  for(const [i,pos]of [{x:17,y:46},{x:19,y:39},{x:28,y:54},{x:35,y:62},{x:51,y:55},{x:60,y:36},{x:66,y:75},{x:48,y:79},{x:78,y:49},{x:29,y:29},{x:73,y:17},{x:15,y:55}].entries()){
    const land=nearestLand(pos);g.animals.push(makeAnimal(i%2?'deer':'hare',land.x,land.y,`animal${i}`));
  }
  for(const b of BOSSES){const e=makeEnemy('boss',b.x,b.y,b.biome==='forest'?'boss':'boss-'+b.biome);applyBiome(e);g.enemies.push(e);}
  return g;
}
function applyBiome(e){e.biome=biomeAt(e.x,e.y);e.name=(e.biome==='snow'?{wolf:'Ледяной ползун',draugr:'Дух метели',breaker:'Страж ледника',boss:'Хрим'}:e.biome==='fire'?{wolf:'Пепельная саламандра',draugr:'Культист пламени',breaker:'Обсидиановый голем',boss:'Сурт'}:{})[e.type]||enemyData[e.type].name;const factor=e.biome==='snow'?1.35:e.biome==='fire'?1.7:1;e.hp=e.maxHp=Math.round(e.maxHp*factor);e.damage=Math.round(e.damage*factor);}
export function sound(g,type,x=g.player.x,y=g.player.y){
  if(!g.sounds)g.sounds=[];g.sounds.push({type,x,y});if(g.sounds.length>48)g.sounds.shift();
}
export function makeAnimal(type,x,y,id){return {id,type,x,y,origin:{x,y},hp:type==='deer'?48:18,maxHp:type==='deer'?48:18,dead:false,respawnAt:0};}
export function tell(g,text) {
  g.events.push({
    id:g.nextId++,text,time:g.time
  });
  if(g.events.length>8)g.events.shift();
}
export function add(inv,item,n) {
  inv[item]=(inv[item]||0)+n;
  if(inv[item]<=0)delete inv[item];
}
export function afford(inv,cost) {
  return Object.entries(cost).every(([k,v])=>(inv[k]||0)>=v);
}
function spend(inv,cost) {
  for(const [k,v] of Object.entries(cost))add(inv,k,-v);
}
export function isNight(g) {
  return g.time%DAY>=300;
}
export function maxHp(g) {
  return 100+(g.player.buff>0?g.player.foodBonus:0);
}
export function inHome(g,p) {
  if(!g.home)return false;
  if(g.legacySquarePlot)return Math.abs(p.x-g.home.x)<=5.5&&Math.abs(p.y-g.home.y)<=5.5;
  return hexDistance(hexRound(p.x,p.y),g.home)<=5;
}
export function homeValue(g) {
  return g.parts.reduce((n,p)=>n+PARTS[p.type].value,0);
}
export function invaders(g) {
  return g.enemies.filter(e=>!e.dead&&inHome(g,e));
}
export function blocked(g,p) {
  return g.enemies.some(e=>!e.dead&&distance(e,p)<3);
}
export function solidAt(g,x,y,radius=.08) {
  return g.parts.find(p=>p.hp>0&&PARTS[p.type].solid&&!(p.type==='door'&&p.open)&&wallDistance(p,{x,y})<radius);
}
export function canStand(g,x,y) {
  return walkable(x,y,g)&&!solidAt(g,x,y,.18);
}
function movementClear(g,a,b) {
  if(!canStand(g,b.x,b.y))return false;
  return !g.parts.some(p=>p.hp>0&&PARTS[p.type].solid&&!(p.type==='door'&&p.open)&&wallSegments(p).some(([u,v])=>segmentDistance(a,b,u,v)<.18-1e-7));
}
export function move(g,p,dx,dy) {
  // Sweep a body radius through every edge, including shared corners; subdivide terrain crossings.
  const steps=Math.max(1,Math.ceil(metric({x:dx,y:dy},{x:0,y:0})/.12));
  for(let i=0;i<steps;i++){
    const x=dx/steps,y=dy/steps,b={x:p.x+x,y:p.y+y};
    if(movementClear(g,p,b)){p.x=b.x;p.y=b.y;}
    else {
      if(movementClear(g,p,{x:p.x+x,y:p.y}))p.x+=x;
      if(movementClear(g,p,{x:p.x,y:p.y+y}))p.y+=y;
    }
  }
}
export function sheltered(g,p=g.player) {
  const cell=hexRound(p.x,p.y);
  if(!inHome(g,p)||!g.parts.some(t=>t.type==='floor'&&t.x===cell.x&&t.y===cell.y))return false;
  const queue=[{
    x:cell.x,y:cell.y
  }],seen=new Set();
  for(let i=0; i<queue.length; i++) {
    const q=queue[i],key=`${q.x},${q.y}`;
    if(seen.has(key))continue;
    seen.add(key);
    if(!inHome(g,q))return false;
    for(const [dx,dy] of HEX_DIRS)if(!solidAt(g,q.x+dx*.5,q.y+dy*.5)&&!seen.has(`${q.x+dx},${q.y+dy}`))queue.push({
      x:q.x+dx,y:q.y+dy
    });
  }
  return true;
}
export function claimHome(g) {
  if(g.home)return tell(g,'У вас уже есть участок. Перенос откроется в будущей версии.'),false;
  if(BOSSES.some(b=>distance(g.player,b)<15)||g.player.x<8||g.player.x>SIZE-8||g.player.y<8||g.player.y>SIZE-8)return tell(g,'Нужна поляна вдали от древнего круга и берега.'),false;
  if(!afford(g.player.inv,{
    wood:4
  }))return tell(g,'Для участка нужно 4 дерева.'),false;
  spend(g.player.inv,{
    wood:4
  });
  g.home=hexRound(g.player.x,g.player.y);
  tell(g,'Участок отмечен. Начните с пола и замкнутого контура стен с дверью.');
  return true;
}
export function build(g,type,x,y,edge=0) {
  ({x,y}=hexRound(x,y));
  const d=PARTS[type];
  if(!d||g.player.dead||(d.solid&&(!Number.isInteger(edge)||edge<0||edge>5)))return false;
  if(!inHome(g,{
    x,y
  }))return tell(g,'Строить можно только на своём участке.'),false;
  if(distance(g.player,{
    x,y
  })>7)return tell(g,'Подойдите ближе к месту строительства.'),false;
  if(!walkable(x,y,g)||(d.solid?(wallDistance({x,y,edge},g.player)<.2||g.enemies.some(e=>!e.dead&&wallDistance({x,y,edge},e)<.2)):g.enemies.some(e=>!e.dead&&distance(e,{x,y})<.5)))return tell(g,'Место занято.'),false;
  const candidate={x,y,edge};
  if(d.solid&&(!Number.isInteger(edge)||edge<0||edge>5))return false;
  const same=g.parts.filter(p=>p.x===x&&p.y===y);
  if(d.solid?g.parts.some(p=>PARTS[p.type].solid&&sameEdge(p,candidate)):same.some(p=>type==='floor'?p.type==='floor':p.type!=='floor'&&!PARTS[p.type].solid))return tell(g,'Эта клетка уже занята.'),false;
  if(type!=='floor'&&!same.some(p=>p.type==='floor'))return tell(g,'Сначала положите пол.'),false;
  if(!afford(g.player.inv,d.cost))return tell(g,'Не хватает материалов.'),false;
  spend(g.player.inv,d.cost);
  g.parts.push({
    id:g.nextId++,type,x,y,...(d.solid?{edge}:{}),hp:d.hp,open:false
  });
  for(const r of g.resources)if(r.x===x&&r.y===y)r.ready=g.time+300;
  g.effects.push({
    x,y,text:'Построено',color:'#e9cc86',life:1
  });
  return true;
}
export function buildBatch(g,plan) {
  if(!plan.length)return tell(g,'Выберите свободные клетки или рёбра пола.'),false;
  if(plan.length>250||g.parts.length+plan.length>750)return tell(g,'Слишком большая область.'),false;
  const trial={...g,player:{...g.player,inv:{...g.player.inv}},parts:[...g.parts],resources:g.resources.map(r=>({...r})),effects:[],events:[]};
  for(const p of plan)if(!build(trial,p.type,p.x,p.y,p.edge)){tell(g,trial.events.at(-1)?.text||'Область недоступна.');return false;}
  sound(g,'build');
  g.player.inv=trial.player.inv;g.parts=trial.parts;g.resources=trial.resources;g.nextId=trial.nextId;
  tell(g,`Построено частей: ${plan.length}`);return true;
}
export function repair(g,p) {
  if(!p||distance(g.player,p)>3)return false;
  if(p.hp<=0&&PARTS[p.type].solid&&wallDistance(p,g.player)<.2)return tell(g,'Отойдите от разрушенной стены перед ремонтом.'),false;
  if(blocked(g,p))return tell(g,'Сначала отгоните монстров.'),false;
  if(!afford(g.player.inv,{
    wood:2
  }))return tell(g,'Для ремонта нужно 2 дерева.'),false;
  spend(g.player.inv,{
    wood:2
  });
  p.hp=PARTS[p.type].hp;sound(g,'build',p.x,p.y);
  tell(g,'Постройка восстановлена.');
  return true;
}
export function removePart(g,id) {
  const p=g.parts.find(p=>p.id===id);
  if(!p||distance(g.player,p)>7||blocked(g,p))return false;
  g.parts=g.parts.filter(a=>a.id!==id);
  for(const [k,v]of Object.entries(PARTS[p.type].cost))add(g.player.inv,k,v);
  sound(g,'wood');
  tell(g,'Разобрано. Возвращены все материалы.');
  return true;
}
export function station(g,type) {
  return g.parts.find(p=>p.type===type&&p.hp>0&&distance(g.player,p)<3&&!blocked(g,p));
}
export function craft(g,item) {
  const r=RECIPES[item];
  if(!r||g.player.dead)return false;
  if(!station(g,r.station))return tell(g,`Нужен доступный ${PARTS[r.station].name.toLowerCase()} рядом.`),false;
  if(!afford(g.player.inv,r.cost))return tell(g,'Не хватает ингредиентов.'),false;
  spend(g.player.inv,r.cost);
  add(g.player.inv,item,r.count);
  g.stats.crafted++;sound(g,'craft');
  if(item==='sword'||item==='bow'){g.player.weapon=item;g.player.weaponItem=item;}
  if(item==='armor'||item==='shield'){g.player[item+'Equipped']=true;g.player[item+'Item']=item;}
  if(GEAR[item])useItem(g,item);
  if(item==='armor'||GEAR[item]?.slot==='armor')g.player.durability=100;
  tell(g,`Создано: ${ITEMS[item]} ×${r.count}`);
  return true;
}
export function eat(g,item) {
  const f=FOODS[item],p=g.player;
  if(!f||!p.inv[item]||p.dead)return false;
  add(p.inv,item,-1);sound(g,'eat');
  p.food=Math.max(p.food,f.sat);
  if(f.buff){
    p.buff=f.buff;
    p.foodBonus=f.hp;
  }
  tell(g,`${ITEMS[item]}: сытость ${Math.ceil(p.food/60)} мин${f.buff?`, бонус здоровья ${f.buff/60} мин`:''}.`);
  return true;
}
export const wearingArmor=p=>!!p.inv[p.armorItem||'armor']&&p.armorEquipped!==false;
export const carryingShield=p=>!!p.inv[p.shieldItem||'shield']&&p.shieldEquipped===true;
export const usingShield=p=>carryingShield(p)&&p.weapon!=='bow';
export const usableItem=item=>Object.hasOwn(GEAR,item)||['sword','bow','potion','rune','armor','shield'].includes(item)||Object.hasOwn(FOODS,item);
export function useItem(g,item){
  const p=g.player;if(p.dead||!p.inv[item])return false;
  if(GEAR[item]){const gear=GEAR[item],key=gear.slot+'Item';if(gear.slot==='weapon'){p.weapon=gear.base;p.weaponItem=item;}else{p[gear.slot+'Equipped']=p[key]!==item||!p[gear.slot+'Equipped'];p[key]=item;}sound(g,'equip');return true;}
  if(item==='armor'||item==='shield'){const key=item+'Equipped';p[key]=p[item+'Item']!==item||!p[key];p[item+'Item']=item;sound(g,'equip');return true;}
  if(item==='sword'||item==='bow'){p.weapon=item;p.weaponItem=item;sound(g,'equip');return true;}
  if(item==='rune'){
    if(g.paused||p.magicCooldown>0||p.stamina<30)return false;
    const target=[...g.enemies,...pvpTargets(g)].filter(e=>!e.dead&&distance(e,p)<8&&lineClear(g,p,e)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    if(!target)return tell(g,'Нет цели для руны поблизости.'),false;
    p.stamina-=30;p.magicCooldown=4;p.strikeAt=g.time;sound(g,'cast');hurtEnemy(g,target,45);target.stun=target.type==='boss'?.35:1.2;
    g.effects.push({x:p.x,y:p.y,to:{x:target.x,y:target.y},color:'#b1edff',life:.5});return true;
  }
  if(FOODS[item])return eat(g,item);
  if(item==='potion'){
    if(p.potionCooldown>0)return tell(g,`Зелье будет доступно через ${Math.ceil(p.potionCooldown)} с.`),false;
    if(p.hp>=maxHp(g))return tell(g,'Здоровье уже полное.'),false;
    add(p.inv,item,-1);p.hp=Math.min(maxHp(g),p.hp+40);p.potionCooldown=20;sound(g,'potion');
    g.effects.push({x:p.x,y:p.y,text:'+ здоровье',color:'#e2b78b',life:1});return true;
  }
  return false;
}
export function assignQuickSlot(g,index,item){
  if(!Number.isInteger(index)||index<0||index>8||(item!==null&&!usableItem(item)))return false;
  g.player.quickbar[index]=item;return true;
}
export function useQuickSlot(g,index){return Number.isInteger(index)&&index>=0&&index<9?useItem(g,g.player.quickbar[index]):false;}
export function gainSkill(g,type,amount=1) {
  const p=g.player,total=Object.values(p.skills).reduce((a,b)=>a+b,0);
  p.skills[type]=Math.min(100,p.skills[type]+amount*(p.focus===type?1:.2)*Math.max(0,(150-total)/150));
}
export function transferSkill(g,from,to) {
  const p=g.player;
  if(!station(g,'bench'))return tell(g,'Перераспределение доступно у верстака.'),false;
  if(from===to||!(from in SKILLS)||!(to in SKILLS)||p.skills[from]<5)return tell(g,'Нужно хотя бы 5 очков исходного навыка.'),false;
  const n=Math.min(10,p.skills[from],(100-p.skills[to])/.8);
  if(n<=0)return false;
  p.skills[from]-=n;
  p.skills[to]+=n*.8;
  p.focus=to;
  tell(g,`Перенесено ${n.toFixed(1)} → ${(n*.8).toFixed(1)}. Потеря 20%.`);
  return true;
}
export function context(g) {
  const p=g.player;
  const candidates=[...g.graves.map(o=>({
    ...o,kind:'grave',label:'Вернуть вещи'
  })),...g.parts.filter(o=>o.hp>0&&['door','chest','bed','fire','bench','kitchen'].includes(o.type)).map(o=>({
    ...o,kind:'part',label:o.type==='door'?(o.open?'Закрыть дверь':'Открыть дверь'):PARTS[o.type].name
  })),...NOTES.map((o,i)=>({
    ...o,id:i,kind:'note',label:'Прочитать'
  })),...g.resources.filter(r=>!g.parts.some(p=>p.x===r.x&&p.y===r.y)).map(o=>({
    ...o,kind:'resource',label:o.ready>g.time?`${o.type==='wood'?'Пень':ITEMS[o.type]} · ${Math.ceil(o.ready-g.time)} с`:`${GATHER[o.type].label}: ${ITEMS[o.type]}`
  }))];
  const proximity=o=>o.kind==='part'&&PARTS[o.type].solid?wallDistance(o,p):distance(o,p);
  return candidates.filter(o=>proximity(o)<(o.kind==='resource'?GATHER_RANGE:2)&&(o.kind==='part'||lineClear(g,p,o))).sort((a,b)=>{
    const rank=o=>o.kind==='resource'&&o.ready>g.time?2:o.kind==='resource'&&o.id===p.harvest?.id?0:1;
    return rank(a)-rank(b)||proximity(a)-proximity(b)||(a.type==='door'?-1:b.type==='door'?1:0);
  })[0]||null;
}
export function interact(g) {
  const c=context(g),p=g.player;
  if(p.dead||g.paused)return null;
  if(!c){tell(g,'Подойдите к ресурсу или предмету ближе.');return null;}
  if(c.kind==='resource'){
    const r=g.resources.find(r=>r.id===c.id);
    if(r.ready>g.time){tell(g,`Ресурс истощён. Восстановится через ${Math.ceil(r.ready-g.time)} с.`);return null;}
    if(p.harvest||p.attack>0)return null;
    if(GATHER[r.type].hits===1){finishGather(g,r);return 'gather';}
    const d=distance(p,r);if(d>.001)p.facing={x:(r.x-p.x)/d,y:(r.y-p.y)/d};
    p.harvest={id:r.id,type:r.type,started:g.time,hit:false,facing:{...p.facing}};return 'harvest';
  }
  if(c.kind==='grave'){
    const grave=g.graves.find(v=>v.id===c.id);if(grave.owner&&grave.owner!==p.id)return tell(g,'Это вещи другого игрока.'),null;
    for(const[k,v]of Object.entries(grave.inv))add(p.inv,k,v);
    g.graves=g.graves.filter(v=>v.id!==c.id);
    tell(g,'Вещи возвращены.');
    return 'grave';
  }
  if(c.kind==='note'){
    if(!g.notes.includes(c.id))g.notes.push(c.id);
    return {
      note:NOTES[c.id]
    };
  }
  const part=g.parts.find(v=>v.id===c.id);
  if(c.type==='door'){
    if(part.open&&(wallDistance(part,p)<.2||g.enemies.some(e=>!e.dead&&wallDistance(part,e)<.2))){
      tell(g,'Освободите дверной проём перед закрытием.');
      return null;
    }
    part.open=!part.open;sound(g,'door',part.x,part.y);
    return 'door';
  }
  if(blocked(g,c)){
    tell(g,'Рядом монстр. Доступ закрыт его присутствием.');
    return null;
  }
  if(c.type==='chest')return 'storage';
  if(c.type==='bed'){
    tell(g,'Лежанка — ваша домашняя точка возрождения. Отдыхайте у очага в закрытом доме.');
    return 'bed';
  }
  if(['bench','fire','kitchen'].includes(c.type))return 'craft';
  return null;
}
function finishGather(g,r){
  const n=GATHER[r.type].yield;r.hits=0;r.ready=g.time+240;
  add(g.player.inv,r.type,n);
  if(r.type==='wood'&&hash(r.x+g.stats.gathered,r.y)>.6)add(g.player.inv,'resin',1);
  g.stats.gathered++;sound(g,'gather',r.x,r.y);
  g.effects.push({x:r.x,y:r.y,text:`+${n} ${ITEMS[r.type]}`,color:'#f2da96',life:1.4});
}
function updateHarvest(g){
  const p=g.player,h=p.harvest;if(!h)return;
  const age=g.time-h.started,r=g.resources.find(r=>r.id===h.id);
  if(!r||p.dead||(r.ready>g.time&&!h.hit)||distance(p,r)>=GATHER_RANGE||!lineClear(g,p,r)||g.parts.some(part=>part.x===r.x&&part.y===r.y)){p.harvest=null;return;}
  if(age>=.22&&!h.hit){
    h.hit=true;sound(g,['stone','crystal','obsidian'].includes(r.type)?'stone':'wood',r.x,r.y);r.hits=(r.hits||0)+1;r.struckAt=g.time;
    if(r.hits>=GATHER[r.type].hits)finishGather(g,r);
  }
  if(age>=.55)p.harvest=null;
}
export function storeItems(g,withdraw=false) {
  if(!station(g,'chest'))return tell(g,'Подойдите к свободному сундуку.'),false;
  const src=withdraw?g.storage:g.player.inv,dst=withdraw?g.player.inv:g.storage;
  for(const k of Object.keys(src)){
    if(!withdraw&&Object.hasOwn(GEAR,k))continue;
    if(!withdraw&&['sword','bow','armor','shield','arrow'].includes(k))continue;
    add(dst,k,src[k]);
    delete src[k];
  }
  tell(g,withdraw?'Запасы взяты.':'Ресурсы и еда оставлены в сундуке.');
  return true;
}
export function attack(g) {
  const p=g.player,weapon=weaponOwned(p)?p.weapon:'hands',cost=weapon==='bow'?12:15;
  if(p.dead||p.harvest||p.attack>0||p.stamina<cost)return false;
  if(weapon==='bow'&&!p.inv.arrow)return tell(g,'Нет стрел. Создайте их у верстака.'),false;
  const range=weapon==='bow'?9:MELEE[weapon].reach+.16;
  const target=[...g.enemies,...g.animals,...pvpTargets(g)].filter(e=>!e.dead&&distance(e,p)<=range+(e.type==='boss'?.85:0)&&lineClear(g,p,e)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  if(target&&distance(p,target)>.001)p.facing={x:(target.x-p.x)/distance(p,target),y:(target.y-p.y)/distance(p,target)};
  p.stamina-=cost;sound(g,weapon==='bow'?'bow':'swing');
  if(weapon==='bow') {
    p.attack=.65;p.strikeAt=g.time;add(p.inv,'arrow',-1);
    if(target) {hurtEnemy(g,target,19*(1+p.skills.bow*.016));gainSkill(g,'bow',1.6);g.effects.push({x:p.x,y:p.y,to:{x:target.x,y:target.y},life:.25,color:'#ead39b'});}
  } else {
    const spec=MELEE[weapon];p.attack=spec.windup+spec.active+spec.recovery;
    p.swing={weapon,started:g.time,angle:aimAngle(p.facing),hit:[]};
  }
  return true;
}
function resolveSwing(g,fromTime) {
  const p=g.player,swing=p.swing;if(!swing)return;
  for(const e of [...g.enemies,...g.animals,...pvpTargets(g)])if(!e.dead&&!swing.hit.includes(e.id)&&sweptHit(swing,p,e,fromTime,g.time)&&lineClear(g,p,e)) {
    hurtEnemy(g,e,MELEE[swing.weapon].damage*(1+(p.skills[swing.weapon]||0)*.016));
    swing.hit.push(e.id);if(swing.weapon!=='hands')gainSkill(g,swing.weapon,1.6);
  }
  if(p.attack<=0)p.swing=null;
}
function lineClear(g,a,b) {
  const steps=Math.ceil(distance(a,b)/.2);
  for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(terrain(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,g)==='mountain')return false;}
  return !g.parts.some(p=>p.hp>0&&PARTS[p.type].solid&&!(p.type==='door'&&p.open)&&wallSegments(p).some(([u,v])=>intersects(a,b,u,v)));
}
export function claimBossReward(p,biome){p.claimedBossRewards||=[];if(!p.claimedBossRewards.includes(biome)){p.claimedBossRewards.push(biome);add(p.inv,biome==='snow'?'frostHeart':biome==='fire'?'flameHeart':'trophy',1);}}
export function pvpTargets(g){return (g.players||[]).filter(p=>p!==g.player&&!p.dead&&p.pvp&&g.player.pvp);}
function hurtEnemy(g,e,n) {
 if(g.players?.includes(e)){if(!pvpTargets(g).includes(e))return;const attacker=g.player;g.player=e;damagePlayer(g,n*weaponPower(attacker),attacker);g.player=attacker;return;}

  n*=weaponPower(g.player)*(g.player.inv.emberSeal?1.3:1);if(e.vulnerableUntil>g.time)n*=1.7;e.hp-=n;sound(g,'impact',e.x,e.y);
  g.effects.push({
    x:e.x,y:e.y,text:`−${Math.round(n)}`,color:'#f7ca83',life:.8
  });
  if(e.hp<=0){
    e.dead=true;
    e.respawnAt=g.time+300;
    g.stats.kills++;
    if(e.type==='boss'){
      const biome=e.biome||'forest';if(biome==='forest')g.bossDefeated=true;
      if(!g.defeated.includes(biome))g.defeated.push(biome);
      for(const hero of activePlayers(g))claimBossReward(hero,biome);g.projectiles=[];
      tell(g,biome==='forest'?'Сердце леса откроет рецепт тёплого плаща. Путь в снега лежит на восток.':biome==='snow'?'Сердце зимы защитит от жара. Огненная земля — к югу.':'Сурт пал. Три земли пройдены; мир остаётся доступным.');
    }
    else if(e.biome==='snow'){add(g.player.inv,'frostHide',2);add(g.player.inv,'crystal',1);}
    else if(e.biome==='fire'){add(g.player.inv,'emberCore',2);add(g.player.inv,'obsidian',1);}
    else if(['hare','deer','wolf'].includes(e.type)){
      add(g.player.inv,'meat',e.type==='deer'?3:1);add(g.player.inv,'hide',e.type==='hare'?1:2);
    }else {add(g.player.inv,'resin',2);add(g.player.inv,'stone',2);}
  }
}
export function damagePlayer(g,n,enemy=null) {
  const p=g.player;
  if(p.dead)return;
  const defended=enemy&&p.blocking&&p.stamina>=10;
  if(enemy)sound(g,defended&&usingShield(p)?'block':'hurt');
  if(defended){
    const shield=usingShield(p);p.stamina=Math.max(0,p.stamina-(shield?Math.max(5,10-p.skills.guard*.05):15));
    n*=shield?([0,.2,.16,.12][gearTier(p,'shield')])/(1+p.skills.guard*.01):.8/(1+p.skills.guard*.002);
    gainSkill(g,'guard',1);
  }
  if(enemy&&wearingArmor(p)&&p.durability>0){
    n*=([0,.65,.5,.4][gearTier(p,'armor')])/(1+p.skills.guard*.004);
    p.durability=Math.max(0,p.durability-(defended?.15:1));
    if(!defended)gainSkill(g,'guard',.4);
  }
  p.hp-=n;
  p.hurt=.35;
  g.effects.push({
    x:p.x,y:p.y,text:`−${Math.ceil(n)}`,color:'#ff927b',life:.7
  });
  if(p.hp<=0)die(g);
}
export function die(g) {
  const p=g.player;
  if(p.dead)return;
  p.dead=true;sound(g,'death');if(!g.players||g.players.every(v=>v.dead))g.hazards=[];if(!g.players||g.players.every(v=>v.dead))g.projectiles=[];
  p.hp=0;
  p.blocking=false;
  g.graves.push({
    id:g.nextId++,owner:p.id||null,x:p.x,y:p.y,inv:{
      ...p.inv
    }
  });
  p.inv={
  };
  p.weapon='hands';p.armorEquipped=false;p.shieldEquipped=false;p.swing=null;p.harvest=null;p.slow=0;p.burning=0;p.exposure=0;
  for(const e of g.enemies)if(e.type==='boss'&&!e.dead&&(!g.players||g.players.every(v=>v.dead))){
    const origin={...e.origin},id=e.id;Object.assign(e,makeEnemy('boss',origin.x,origin.y,id));applyBiome(e);
  }
  tell(g,'Вы пали. Вещи ждут на месте гибели.');
}
export function respawn(g,home=false) {
  if(!g.player.dead)return false;
  const bed=g.parts.find(p=>p.type==='bed'&&p.hp>0);
  const pos=home&&bed?bed:START;
  Object.assign(g.player,{
    x:pos.x,y:pos.y,hp:100,stamina:100,food:300,buff:0,foodBonus:0,dead:false,attack:0,harvest:null
  });
  sound(g,'respawn');
  tell(g,home&&bed?'Вы вернулись домой.':'Вы вернулись к первому камню.');
  return true;
}
function damagePart(g,p,n) {
  if(!p||p.hp<=0||p.type==='chest')return;
  p.hp-=n;
  if(p.hp<=0){
    if(!inHome(g,g.player)){
      p.hp=0;
    }
    else g.parts=g.parts.filter(t=>t.id!==p.id);
  }
}
export function startRaid(g) {
  if(!g.home)return;
  const value=homeValue(g),count=1+Math.floor(hash(g.seed||1,g.raidDay+6)*3);
  for(let i=0; i<count; i++){
    const a=i/count*Math.PI*2;
    const type=value>=28&&(i===0||(value>=60&&i===2))?'breaker':g.bossDefeated||i%2===0?'draugr':'wolf';
    const spawn=nearestLand({x:clamp(g.home.x+Math.cos(a)*9,3,SIZE-4),y:clamp(g.home.y+Math.sin(a)*9,3,SIZE-4)},g);
    g.enemies.push(makeEnemy(type,spawn.x,spawn.y,`raid${g.nextId++}`,true));
  }
  sound(g,'raid');
  tell(g,'На дом нападают! Можно вернуться или освободить его позже.');
}
function updateEnemy(g,e,dt) {
  if(e.dead){
    if(e.type!=='boss'&&!e.raid&&g.time>=e.respawnAt&&distance(g.player,e.origin)>10){Object.assign(e,makeEnemy(e.type,e.origin.x,e.origin.y,e.id),{pack:e.pack});applyBiome(e);}
    return;
  }
  e.cooldown=Math.max(0,e.cooldown-dt);
  e.stun=Math.max(0,e.stun-dt);
  if(e.stun>0)return;
  const p=g.player,d=distance(e,p),night=isNight(g);
  let target=null,structure=null;
  if(e.type==='boss'){updateBoss(g,e,dt);return;}
  if(d<(night?8:4)||e.hp<e.maxHp)target=p;
  if(e.raid&&g.home){
    if(!target)target=g.home;
    const parts=g.parts.filter(t=>t.hp>0&&t.type!=='floor'&&t.type!=='chest');
    if(e.type==='breaker'&&parts.length){
      structure=parts.sort((a,b)=>distance(a,e)-distance(b,e))[0];
      target=structure;
    }
  }
  const patrolling=!target;
  if(!target)target=patrolTarget(g,e,3);
  if(e.phase==='windup'){
    e.timer-=dt;
    if(e.timer>0)return;
    e.strikeAt=g.time;sound(g,'enemy',e.x,e.y);
    const r=e.type==='boss'?(e.attackIndex%3===0&&e.hp<e.maxHp*.5?4.2:2.8):ENEMY_REACH[e.type];
    if(structure&&distance(e,structure)<2)damagePart(g,structure,e.damage*2);
    else if(!p.dead&&distance(e,p)<r&&lineClear(g,e,p))damagePlayer(g,e.damage*(e.type==='boss'&&e.hp<e.maxHp*.5?1.25:1),e);
    e.phase='idle';
    e.cooldown=e.type==='boss'?1.6:1.1;
    return;
  }
  if(p.dead&&target===p)return;
  const td=distance(e,target);
  if((target===p||structure)&&td<(e.type==='boss'?2.4:ENEMY_REACH[e.type]-.1)&&e.cooldown===0){
    e.attackFacingX=target.x-e.x;
    e.attackFacingY=target.y-e.y;
    e.phase='windup';
    e.attackIndex++;
    e.timer=e.type==='boss'?(e.hp<e.maxHp*.5&&e.attackIndex%3===0?1.4:e.hp<e.maxHp*.5?.8:1.1):e.type==='wolf'?.55:.85;
    e.windupTime=e.timer;
    return;
  }
  if(td>.6){
    const speed=e.speed*(patrolling?.42:night?1.15:1)*dt,dx=(target.x-e.x)/td*speed,dy=(target.y-e.y)/td*speed;
    const barrier=solidAt(g,e.x+dx*4,e.y+dy*4);
    if(barrier){
      if(e.type==='breaker'&&e.cooldown===0){
        e.strikeAt=g.time;sound(g,'build',barrier.x,barrier.y);
        e.attackFacingX=barrier.x-e.x;
        e.attackFacingY=barrier.y-e.y;
        damagePart(g,barrier,35);
        e.cooldown=1;
      }
      else{
        move(g,e,-dy,dx);
      }
    }
    else steer(g,e,dx,dy);
  }
}
function patrolTarget(g,e,radius){
  if(!e.patrol||g.time>=e.patrol.until||distance(e,e.patrol)<.4){
    const salt=String(e.id).split('').reduce((n,c)=>n+c.charCodeAt(0),0),step=Math.floor(g.time/3);
    const angle=hash(salt+step,g.seed||1)*Math.PI*2;
    const delta=fromPlane(Math.cos(angle)*radius,Math.sin(angle)*radius);
    e.patrol={...nearestLand({x:e.origin.x+delta.x,y:e.origin.y+delta.y},g),until:g.time+4+hash(salt,step)*3};
  }
  return distance(e,e.origin)>8?e.origin:e.patrol;
}
function steer(g,e,dx,dy){
  const x=e.x,y=e.y;move(g,e,dx,dy);
  if(distance(e,{x,y})<.003){
    const v=toPlane(dx,dy),turn=fromPlane(-v.y,v.x);move(g,e,turn.x,turn.y);
    if(distance(e,{x,y})<.003)move(g,e,-turn.x,-turn.y);
  }
}
function updateAnimal(g,a,dt){
  if(a.dead){if(g.time>=a.respawnAt&&distance(g.player,a.origin)>10)Object.assign(a,makeAnimal(a.type,a.origin.x,a.origin.y,a.id));return;}
  const d=distance(a,g.player);
  // Separate enter/exit thresholds prevent fleeing/patrolling flip-flop at the boundary.
  if(d<5||(a.hp<a.maxHp&&d<10)){a.fleeing=true;a.calmAt=g.time+3;}
  else if(a.fleeing&&d>9&&g.time>(a.calmAt||0)){a.fleeing=false;a.origin={x:a.x,y:a.y};delete a.patrol;}
  const flee=a.fleeing;
  const target=flee?{x:a.x+(a.x-g.player.x)/Math.max(.1,d)*3,y:a.y+(a.y-g.player.y)/Math.max(.1,d)*3}:patrolTarget(g,a,2.5);
  const n=distance(a,target);if(n<.1)return;
  const speed=(flee?(a.type==='hare'?4.4:3.8):.65)*dt;
  steer(g,a,(target.x-a.x)/n*speed,(target.y-a.y)/n*speed);
}
export function bossAttackSpec(kind,enraged=false){
  return kind==='frostwave'?{time:1.8,reach:8,damage:42}:kind==='meteor'?{time:1.5,reach:17,damage:62}:kind==='summon'?{time:1.8,reach:10,damage:0}:kind==='ranged'?{time:enraged?1:1.3,reach:17,damage:enraged?36:28}:kind==='slam'?{time:enraged?1.15:1.5,reach:4.6,damage:enraged?55:46}:{time:enraged?.85:1.1,reach:3.6,damage:enraged?46:38};
}
function updateBoss(g,e,dt){
  const p=g.player,d=distance(e,p);
  if(p.dead||distance(p,e.origin)>18){
    e.phase='idle';e.hp=Math.min(e.maxHp,e.hp+dt*60);g.projectiles=g.projectiles.filter(b=>b.source!==e.id);
    const n=distance(e,e.origin);if(n>.2)steer(g,e,(e.origin.x-e.x)/n*dt*1.2,(e.origin.y-e.y)/n*dt*1.2);return;
  }
  const angry=e.hp<e.maxHp*.5;
  if(e.phase==='windup'){
    e.timer-=dt;if(e.timer>0)return;
    const spec=bossAttackSpec(e.attackKind,angry);e.strikeAt=g.time;sound(g,e.attackKind==='ranged'?'cast':'slam',e.x,e.y);
    if(e.attackKind==='frostwave'){
      for(const target of activePlayers(g)){const d=distance(e,target);if(!target.dead&&d>2.3&&d<8){g.player=target;damagePlayer(g,42,e);target.slow=5;}}g.player=p;e.vulnerableUntil=g.time+2.8;
      g.effects.push({x:e.x,y:e.y,ring:8,color:'#b8f5ff',life:.8,text:'ЛЕДЯНАЯ ВОЛНА'});
    }else if(e.attackKind==='meteor'){
      g.hazards||=[];for(const target of activePlayers(g).filter(p=>!p.dead&&distance(p,e)<18))g.hazards.push({x:target.x,y:target.y,at:g.time+1.5,until:g.time+5,source:e.id});
    }else if(e.attackKind==='summon'){
      if(g.enemies.filter(v=>v.summoned&&!v.dead).length<6)for(const side of [-1,1]){const pos=nearestLand({x:e.x+side*2,y:e.y+2},g),add=makeEnemy('wolf',pos.x,pos.y,'summon-'+g.nextId++);applyBiome(add);add.summoned=true;g.enemies.push(add);}
    }else if(e.attackKind==='ranged'){

      const aim=aimAngle({x:e.attackFacingX,y:e.attackFacingY});
      for(const offset of (e.biome==='snow'?[-.32,-.16,0,.16,.32]:[-.17,0,.17])){const v=fromPlane(Math.cos(aim+offset)*7,Math.sin(aim+offset)*7);g.projectiles.push({x:e.x,y:e.y,vx:v.x,vy:v.y,life:2.5,source:e.id,biome:e.biome,damage:spec.damage*(e.biome==='snow'?1.2:e.biome==='fire'?1.4:1)});}
    }else{
      for(const target of activePlayers(g)){const d=distance(e,target),v=toPlane(target.x-e.x,target.y-e.y),aim=aimAngle({x:e.attackFacingX,y:e.attackFacingY});const facing=(Math.cos(aim)*v.x+Math.sin(aim)*v.y)/Math.max(.001,d);
      if(!target.dead&&d<spec.reach&&(e.attackKind==='slam'||facing>.3)&&lineClear(g,e,target)){g.player=target;damagePlayer(g,spec.damage*(e.biome==='fire'?1.3:1),e);if(e.biome==='snow')target.slow=4;if(e.biome==='fire')target.burning=3;}}g.player=p;
      g.effects.push({x:e.x,y:e.y,text:e.attackKind==='slam'?(e.biome==='snow'?'ЛЁД':e.biome==='fire'?'ПЛАМЯ':'КОРНИ'):'',ring:spec.reach,color:e.biome==='snow'?'#b8eaff':e.biome==='fire'?'#ff984d':'#edbe7c',life:.5});
    }
    e.phase='idle';e.cooldown=angry?1.25:1.65;return;
  }
  if(d<16&&e.cooldown===0){
    const cycle=e.biome==='snow'?['ranged','frostwave','swipe']:e.biome==='fire'?['meteor','swipe','summon','ranged']:['swipe','slam','ranged'];e.attackKind=e.biome==='forest'&&d>4.2?'ranged':cycle[e.attackIndex%cycle.length];e.attackIndex++;
    const spec=bossAttackSpec(e.attackKind,angry);e.phase='windup';e.timer=spec.time;e.windupTime=spec.time;
    e.attackFacingX=p.x-e.x;e.attackFacingY=p.y-e.y;sound(g,'warning',e.x,e.y);return;
  }
  if(d>2.5)steer(g,e,(p.x-e.x)/d*dt*e.speed,(p.y-e.y)/d*dt*e.speed);
}
function updateProjectiles(g,dt){
  for(const bolt of g.projectiles){
    const old={x:bolt.x,y:bolt.y};bolt.x+=bolt.vx*dt;bolt.y+=bolt.vy*dt;bolt.life-=dt;
    if(!lineClear(g,old,bolt)){bolt.life=0;continue;}
    const original=g.player,target=activePlayers(g).find(p=>!p.dead&&pointSegment(p,old,bolt)<.35);
    if(target){g.player=target;
      const boss=g.enemies.find(e=>e.id===bolt.source)||g.enemies.find(e=>e.type==='boss');damagePlayer(g,bolt.damage,boss);if(!g.player.dead){if(bolt.biome==='fire')g.player.burning=3;else g.player.slow=2.5;}bolt.life=0;g.player=original;
    }
  }
  g.projectiles=g.projectiles.filter(b=>b.life>0);
}
export function statusEffects(g){
  const p=g.player,result=[],biome=biomeAt(p.x,p.y);
  if(biome!=='forest')result.push({id:biome,icon:biome==='snow'?'crystal':'flameHeart',name:biome==='snow'?(p.inv.furCloak?'Мех защищает от мороза':'Мороз: нужен меховой плащ'):(p.inv.fireCloak?'Плащ защищает от жара':'Жар: нужен огнестойкий плащ'),kind:(biome==='snow'?p.inv.furCloak:p.inv.fireCloak)?'buff':'debuff'});
  if(p.burning>0)result.push({id:'burn',icon:'flameHeart',name:'Горение',seconds:p.burning,kind:'debuff'});
  if(p.buff>0)result.push({id:'fed',icon:'stew',name:`Пища: +${p.foodBonus} здоровья`,kind:'buff',seconds:p.buff});
  if(p.food<=0)result.push({id:'hunger',icon:'meat',name:'Голод: здоровье убывает',kind:'debuff'});
  if(p.stamina<20)result.push({id:'tired',icon:'energy',name:'Мало выносливости',kind:'debuff'});
  if(wearingArmor(p)&&p.durability<=0)result.push({id:'broken',icon:'armor',name:'Броня сломана',kind:'debuff'});
  if(p.slow>0)result.push({id:'rooted',icon:'root',name:'Корни: движение замедлено',kind:'debuff',seconds:p.slow});
  if(SCENERY.some(s=>s.type==='spring'&&distance(s,p)<1.8))result.push({id:'spring',icon:'water',name:'Родник: быстрое восстановление энергии',kind:'buff'});
  if(station(g,'fire')&&sheltered(g)&&!blocked(g,p)&&p.food>0)result.push({id:'rest',icon:'fire',name:'Отдых у очага: восстановление здоровья',kind:'buff'});
  return result;
}

export function activePlayers(g){return g.players||[g.player];}
function nearestPlayer(g,point){return activePlayers(g).filter(p=>!p.dead).sort((a,b)=>distance(a,point)-distance(b,point))[0];}
export function tick(g,dt,input={x:0,y:0,block:false}){
 if(g.paused||g.player.dead)return;dt=clamp(dt,0,.1);g.time+=dt;
 tickPlayer(g,dt,input);if(!g.player.dead)tickWorld(g,dt);
}
export function tickPlayers(g,dt,inputs){
 dt=clamp(dt,0,.1);g.time+=dt;const previous=g.player;
 for(const p of g.players){g.player=p;if(!p.dead)tickPlayer(g,dt,inputs[p.id]||{});}
 g.player=nearestPlayer(g,previous)||previous;tickWorld(g,dt);g.player=previous;
}
function tickPlayer(g,dt,input){
  const p=g.player;
  const biome=biomeAt(p.x,p.y),protectedClimate=biome==='snow'?p.inv.furCloak:biome==='fire'?p.inv.fireCloak:true;
  if(!protectedClimate){p.exposure=(p.exposure||0)+dt;if(p.exposure>6)damagePlayer(g,dt*(biome==='fire'?9:6));}else p.exposure=Math.max(0,(p.exposure||0)-dt*2);
  if(p.dead)return;
  p.slow=Math.max(0,(p.slow||0)-dt);p.magicCooldown=Math.max(0,(p.magicCooldown||0)-dt);p.burning=Math.max(0,(p.burning||0)-dt);if(p.burning>0)damagePlayer(g,dt*(p.inv.fireCloak?1:7));if(p.dead)return;
  for(const k of ['attack','hurt','buff','food','potionCooldown'])p[k]=Math.max(0,p[k]-dt);
  p.blocking=!!input.block;
  p.stamina=Math.min(100,p.stamina+dt*(p.blocking?5:SCENERY.some(s=>s.type==='spring'&&distance(s,p)<1.8)?35:20));
  p.hp=Math.min(p.hp,maxHp(g));
  if(p.food<=0)damagePlayer(g,dt*.7);
  if(p.dead)return;
  const len=metric({x:input.x||0,y:input.y||0},{x:0,y:0});
  if(len>0){
    const speed=(p.blocking?1.4:3.2)*(p.slow>0?.55:1)*dt;
    move(g,p,input.x/Math.max(1,len)*speed,input.y/Math.max(1,len)*speed);
    p.facing={
      x:input.x/len,y:input.y/len
    };
  }
  if(len===0&&p.food>0&&p.hp<maxHp(g)&&station(g,'fire')&&sheltered(g)&&!blocked(g,p)){
    const decor=g.parts.some(t=>t.type==='decor'&&t.hp>0);
    p.hp=Math.min(maxHp(g),p.hp+dt*(decor?1.15:1));
  }
  updateHarvest(g);resolveSwing(g,g.time-dt);
}
function tickWorld(g,dt){
  const day=Math.floor(g.time/DAY)+1;
  if(isNight(g)&&g.raidDay<day){
    g.raidDay=day;
    g.stats.nights++;
    if(g.home&&homeValue(g)>0){
      g.raidWarning=25;
      g.raidPending=true;
      tell(g,'Из чащи доносится вой. До нападения на дом 25 секунд.');
    }
    else tell(g,'Наступает ночь. Лесные звери стали агрессивнее.');
  }
  if(g.raidPending){
    g.raidWarning-=dt;
    if(g.raidWarning<=0){
      g.raidPending=false;
      startRaid(g);
    }
  }
  g.hazards||=[];
  for(const h of g.hazards)if(g.time>=h.at){for(const target of activePlayers(g))if(!target.dead&&distance(target,h)<1.7){const old=g.player;g.player=target;damagePlayer(g,dt*22,g.enemies.find(e=>e.id===h.source));target.burning=2;g.player=old;}}
  g.hazards=g.hazards.filter(h=>g.time<h.until);
  for(const a of g.animals)updateAnimal(g,a,dt);
  updateProjectiles(g,dt);
  for(const e of g.enemies){
    const previous=g.player;if(g.players?.length)g.player=nearestPlayer(g,e)||previous;
    updateEnemy(g,e,dt);g.player=previous;
    if(!g.players&&g.player.dead)break;
  }
  g.enemies=g.enemies.filter(e=>!(e.raid&&e.dead));
  for(const fx of g.effects)fx.life-=dt;
  g.effects=g.effects.filter(f=>f.life>0);
}
export function saveGame(g) {
  return JSON.stringify({
    ...g,events:[],effects:[],sounds:[],projectiles:[],paused:false
  });
}
export function loadGame(raw) {
  const g=JSON.parse(raw);
  const fail=()=>{
    throw Error('Неподдерживаемое или повреждённое сохранение');
  };
  const number=(v,min=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const position=p=>p&&number(p.x,0,SIZE)&&number(p.y,0,SIZE);
  const inventory=inv=>inv&&typeof inv==='object'&&!Array.isArray(inv)&&Object.entries(inv).every(([k,v])=>Object.hasOwn(ITEMS,k)&&Number.isInteger(v)&&number(v,0,1e6));
  const array=(a,max)=>Array.isArray(a)&&a.length<=max;
  const p=g?.player;
  if(g?.version!==1||!number(g.time)||!position(p)||!inventory(p.inv)||!inventory(g.storage)||!p.skills||!Object.keys(SKILLS).every(k=>number(p.skills[k],0,100)))fail();
  if(!number(p.hp,0,200)||!number(p.stamina,0,100)||!number(p.food)||!number(p.buff)||!number(p.foodBonus,0,100)||!number(p.durability,0,100)||!Object.hasOwn(SKILLS,p.focus)||!['hands','sword','bow'].includes(p.weapon)||typeof p.dead!=='boolean')fail();
  for(const k of ['attack','hurt'])if(!number(p[k]))fail();
  if(!p.facing||!number(p.facing.x,-2,2)||!number(p.facing.y,-2,2))fail();
  if(g.home!==null&&!position(g.home))fail();
  if(!array(g.parts,750)||!array(g.resources,5000)||!array(g.enemies,500)||!array(g.graves,500)||!array(g.notes,NOTES.length))fail();
  for(const part of g.parts)if(!Object.hasOwn(PARTS,part.type)||!position(part)||!number(part.hp,0,PARTS[part.type].hp)||!number(part.id)||(part.edge!==undefined&&(!Number.isInteger(part.edge)||part.edge<0||part.edge>5)))fail();
  for(const r of g.resources)if(!position(r)||!Object.hasOwn(GATHER,r.type)||!number(r.ready)||typeof r.id!=='string'||(r.hits!==undefined&&(!Number.isInteger(r.hits)||!number(r.hits,0,GATHER[r.type].hits-1))))fail();
  for(const e of g.enemies){
    if(!Object.hasOwn(enemyData,e.type)||!position(e)||!position(e.origin)||!number(e.hp,-1000,2000)||!number(e.maxHp,1,2000)||!number(e.speed,0,10)||!number(e.damage,0,100)||!['idle','windup'].includes(e.phase)||typeof e.dead!=='boolean')fail();
    for(const k of ['timer','cooldown','stun','respawnAt','attackIndex'])if(!number(e[k],k==='timer'?-.1:0))fail();
  }
  for(const grave of g.graves)if(!position(grave)||!inventory(grave.inv)||!number(grave.id))fail();
  if(!g.notes.every(n=>Number.isInteger(n)&&n>=0&&n<NOTES.length)||!number(g.nextId,1)||!number(g.raidDay)||!number(g.raidWarning,-1)||typeof g.raidPending!=='boolean'||typeof g.bossDefeated!=='boolean')fail();
  if(!g.stats||!['gathered','crafted','kills','nights'].every(k=>number(g.stats[k])))fail();
  if(g.grid!=='hex'&&g.home)g.legacySquarePlot=true;g.grid='hex';
  delete p.parry; delete p.parryCooldown; p.swing=null;p.harvest=null;
  if(p.armorEquipped===undefined)p.armorEquipped=!!p.inv.armor;
  if(p.shieldEquipped===undefined)p.shieldEquipped=false;
  if(typeof p.armorEquipped!=='boolean'||typeof p.shieldEquipped!=='boolean')fail();
  if(p.quickbar===undefined)p.quickbar=['sword','bow','berry','roast','stew','potion',null,null,null];
  if(!Array.isArray(p.quickbar)||p.quickbar.length!==9||!p.quickbar.every(k=>k===null||usableItem(k)))fail();
  if(p.potionCooldown===undefined)p.potionCooldown=0;
  if(!number(p.potionCooldown,0,20))fail();
  if(!Number.isInteger(g.seed)||g.seed<0||g.seed>1e9)g.seed=1;
  if(g.landscape!==4){
    const fresh=createGame(g.seed);
    const oldNodes=new Map(g.resources.map(r=>[r.id,r]));
    g.resources=fresh.resources.map(r=>oldNodes.has(r.id)?{...r,ready:oldNodes.get(r.id).ready,hits:oldNodes.get(r.id).hits||0}:r);
    g.enemies=fresh.enemies;g.animals=fresh.animals;g.landscape=4;g.legacyTerrainHome=!!g.home;
    if(g.bossDefeated){const next=g.enemies.find(e=>e.type==='boss');next.dead=true;next.hp=0;}
    Object.assign(p,nearestLand(p,g));for(const grave of g.graves)Object.assign(grave,nearestLand(grave,g));
  }
  if(!Array.isArray(g.defeated))g.defeated=g.bossDefeated?['forest']:[];
  if(g.bossDefeated&&!g.defeated.includes('forest'))g.defeated.push('forest');
  if(g.defeated.length>3||!g.defeated.every(b=>['forest','snow','fire'].includes(b)))fail();
  for(const e of g.enemies)if(e.type==='boss'&&g.defeated.includes(e.biome||'forest')){e.dead=true;e.hp=0;}
  if(!array(g.animals,100)||!g.animals.every(a=>['hare','deer'].includes(a.type)&&position(a)&&position(a.origin)&&number(a.hp,-1000,100)&&number(a.maxHp,1,100)&&typeof a.dead==='boolean'&&number(a.respawnAt)&&typeof a.id==='string'))fail();
  for(const actor of [...g.enemies,...g.animals]){delete actor.patrol;delete actor.patrolUntil;actor.biome=biomeAt(actor.origin.x,actor.origin.y);delete actor.calmAt;actor.fleeing=false;}
  // Restart telegraphs after loading: transient aim data is never trusted from a save.
  for(const enemy of g.enemies){enemy.phase='idle';enemy.timer=0;delete enemy.strikeAt;}
  g.hazards=[];delete g.players;delete g.peers;delete g.online;
  p.claimedBossRewards=(Array.isArray(p.claimedBossRewards)?p.claimedBossRewards:g.defeated).filter(b=>['forest','snow','fire'].includes(b));
  p.appearance=appearance(p.appearance);p.name=characterName(p.name);p.pvp=false;
  for(const slot of ['weapon','armor','shield'])if(p[slot+'Item']&&!Object.hasOwn(ITEMS,p[slot+'Item']))delete p[slot+'Item'];
  p.slow=0;p.burning=0;p.exposure=0;p.magicCooldown=0;
  g.projectiles=[];g.sounds=[];
  g.events=[];
  g.effects=[];
  g.paused=false;
  g.player.blocking=false;
  return g;
}
