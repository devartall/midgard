// Pure simulation. Seconds of active play only; no wall-clock progression.
export const SIZE = 64, DAY = 480, START = {
  x: 12, y: 43
};
export const BOSS_POS = {
  x: 48, y: 14
};
export const ITEMS = {
  wood:'Дерево', stone:'Камень', berry:'Ягоды', meat:'Мясо', hide:'Шкура', resin:'Смола', sword:'Меч', bow:'Лук', arrow:'Стрелы', armor:'Кожаная броня', roast:'Жаркое', stew:'Лесная похлёбка', trophy:'Сердце леса'
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
      meat:1,berry:4,wood:1
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
export const SKILLS = {
  sword:'Меч', bow:'Лук', guard:'Защита'
};
export const NOTES = [
{
  x:15,y:41,title:'Камень у тропы',text:'Мы строили стены до заката. Звери чуяли нас, но дерево сдерживало их. Когда в доме застучали новые станки, из чащи пришли те, кому стены были по зубам.'
},
{
  x:33,y:27,title:'Запись охотника',text:'Древний долго заносит ветвистую руку. Я однажды не отступил — встретил удар клинком. Кора треснула. На следующем взмахе я поспешил…'
},
{
  x:44,y:18,title:'Надпись на корнях',text:'Раненый лес не молчит. Когда сердце тускнеет, корни вздымаются кругом. Помни: шаг назад — не всегда бегство.'
},
];
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export function hash(x,y) {
  const n=Math.sin(x*127.1+y*311.7)*43758.5453;
  return n-Math.floor(n);
}
export function terrain(x,y) {
  return x<2||y<2||x>61||y>61 ? 'water' : 'grass';
}
export function isTrail(x,y) {
  return Math.abs(y-(53-x*.8))<1.4;
}
const enemyData = {
  wolf:{
    name:'Серый волк',hp:46,speed:2.6,damage:12
  }, draugr:{
    name:'Лесной скиталец',hp:75,speed:1.5,damage:16
  }, breaker:{
    name:'Корнелом',hp:145,speed:1.1,damage:24
  }, boss:{
    name:'Древний хранитель',hp:650,speed:1.2,damage:30
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
export function createGame() {
  const g={
    version:1,time:0,player:{
      ...START,hp:100,stamina:100,food:600,buff:0,foodBonus:0,inv:{
        wood:0,stone:0,berry:3
      },weapon:'hands',durability:100,skills:{
        sword:0,bow:0,guard:0
      },focus:'sword',dead:false,attack:0,parry:0,parryCooldown:0,hurt:0,blocking:false,facing:{
        x:0,y:-1
      }
    },home:null,parts:[],resources:[],enemies:[],graves:[],notes:[],storage:{
    },events:[],effects:[],nextId:1,raidDay:0,raidWarning:0,raidPending:false,bossDefeated:false,stats:{
      gathered:0,crafted:0,kills:0,nights:0
    },paused:false
  };
  for(let x=4; x<60; x++) for(let y=4; y<60; y++) {
    if(distance({
      x,y
    },START)<2.5||distance({
      x,y
    },BOSS_POS)<5||NOTES.some(n=>distance(n,{
      x,y
    })<1.4)||isTrail(x,y))continue;
    const h=hash(x,y);
    let type=h<.095?'wood':h<.125?'stone':h<.153?'berry':null;
    if(type)g.resources.push({
      id:`r${x}_${y}`,x,y,type,ready:0
    });
  }
  for(const [x,y,type] of [[10,42,'wood'],[11,40,'wood'],[15,44,'stone'],[13,45,'berry']])g.resources.push({
    id:`start${x}`,x,y,type,ready:0
  });
  [[22,37,'wolf'],[27,33,'draugr'],[32,24,'wolf'],[39,24,'draugr'],[42,34,'wolf'],[29,18,'draugr'],[48,29,'wolf'],[19,23,'draugr']].forEach(([x,y,t],i)=>g.enemies.push(makeEnemy(t,x,y,`e${i}`)));
  g.enemies.push(makeEnemy('boss',BOSS_POS.x,BOSS_POS.y,'boss'));
  return g;
}
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
  return !!g.home&&Math.abs(p.x-g.home.x)<=5.5&&Math.abs(p.y-g.home.y)<=5.5;
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
export function solidAt(g,x,y) {
  return g.parts.find(p=>p.hp>0&&p.x===Math.round(x)&&p.y===Math.round(y)&&PARTS[p.type].solid&&!(p.type==='door'&&p.open));
}
export function canStand(g,x,y) {
  if(terrain(x,y)==='water')return false;
  const r=.24;
  return ![[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].some(([a,b])=>solidAt(g,a,b));
}
export function move(g,p,dx,dy) {
  if(canStand(g,p.x+dx,p.y))p.x+=dx;
  if(canStand(g,p.x,p.y+dy))p.y+=dy;
}
export function sheltered(g,p=g.player) {
  if(!inHome(g,p)||!g.parts.some(t=>t.type==='floor'&&t.x===Math.round(p.x)&&t.y===Math.round(p.y)))return false;
  const queue=[{
    x:Math.round(p.x),y:Math.round(p.y)
  }],seen=new Set();
  for(let i=0; i<queue.length; i++) {
    const q=queue[i],key=`${q.x},${q.y}`;
    if(seen.has(key))continue;
    seen.add(key);
    if(!inHome(g,q))return false;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(!solidAt(g,q.x+dx,q.y+dy)&&!seen.has(`${q.x+dx},${q.y+dy}`))queue.push({
      x:q.x+dx,y:q.y+dy
    });
  }
  return true;
}
export function claimHome(g) {
  if(g.home)return tell(g,'У вас уже есть участок. Перенос откроется в будущей версии.'),false;
  if(distance(g.player,BOSS_POS)<15||g.player.x<8||g.player.x>55||g.player.y<8||g.player.y>55)return tell(g,'Нужна поляна вдали от древнего круга и берега.'),false;
  if(!afford(g.player.inv,{
    wood:4
  }))return tell(g,'Для участка нужно 4 дерева.'),false;
  spend(g.player.inv,{
    wood:4
  });
  g.home={
    x:Math.round(g.player.x),y:Math.round(g.player.y)
  };
  tell(g,'Участок отмечен. Начните с пола и замкнутого контура стен с дверью.');
  return true;
}
export function build(g,type,x,y) {
  x=Math.round(x);
  y=Math.round(y);
  const d=PARTS[type];
  if(!d||g.player.dead)return false;
  if(!inHome(g,{
    x,y
  }))return tell(g,'Строить можно только на своём участке.'),false;
  if(distance(g.player,{
    x,y
  })>7)return tell(g,'Подойдите ближе к месту строительства.'),false;
  if(terrain(x,y)==='water'||(d.solid&&distance(g.player,{
    x,y
  })<.8)||g.enemies.some(e=>!e.dead&&distance(e,{
    x,y
  })<.8))return tell(g,'Место занято.'),false;
  const same=g.parts.filter(p=>p.x===x&&p.y===y);
  if(same.some(p=>type==='floor'?p.type==='floor':p.type!=='floor'))return tell(g,'Эта клетка уже занята.'),false;
  if(type!=='floor'&&!same.some(p=>p.type==='floor'))return tell(g,'Сначала положите пол.'),false;
  if(!afford(g.player.inv,d.cost))return tell(g,'Не хватает материалов.'),false;
  spend(g.player.inv,d.cost);
  g.parts.push({
    id:g.nextId++,type,x,y,hp:d.hp,open:false
  });
  for(const r of g.resources)if(r.x===x&&r.y===y)r.ready=g.time+300;
  g.effects.push({
    x,y,text:'Построено',color:'#e9cc86',life:1
  });
  return true;
}
export function repair(g,p) {
  if(!p||distance(g.player,p)>3)return false;
  if(p.hp<=0&&PARTS[p.type].solid&&distance(g.player,p)<.75)return tell(g,'Отойдите от разрушенной стены перед ремонтом.'),false;
  if(blocked(g,p))return tell(g,'Сначала отгоните монстров.'),false;
  if(!afford(g.player.inv,{
    wood:2
  }))return tell(g,'Для ремонта нужно 2 дерева.'),false;
  spend(g.player.inv,{
    wood:2
  });
  p.hp=PARTS[p.type].hp;
  tell(g,'Постройка восстановлена.');
  return true;
}
export function removePart(g,id) {
  const p=g.parts.find(p=>p.id===id);
  if(!p||distance(g.player,p)>7||blocked(g,p))return false;
  g.parts=g.parts.filter(a=>a.id!==id);
  for(const [k,v]of Object.entries(PARTS[p.type].cost))add(g.player.inv,k,Math.floor(v/2));
  tell(g,'Разобрано. Возвращена половина материалов.');
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
  g.stats.crafted++;
  if(item==='sword'||item==='bow')g.player.weapon=item;
  tell(g,`Создано: ${ITEMS[item]} ×${r.count}`);
  return true;
}
export function eat(g,item) {
  const f=FOODS[item],p=g.player;
  if(!f||!p.inv[item]||p.dead)return false;
  add(p.inv,item,-1);
  p.food=Math.max(p.food,f.sat);
  if(f.buff){
    p.buff=f.buff;
    p.foodBonus=f.hp;
  }
  tell(g,`${ITEMS[item]}: сытость ${Math.ceil(p.food/60)} мин${f.buff?`, бонус здоровья ${f.buff/60} мин`:''}.`);
  return true;
}
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
  })),...g.parts.filter(o=>o.type!=='floor').map(o=>({
    ...o,kind:'part',label:o.type==='door'?(o.open?'Закрыть дверь':'Открыть дверь'):PARTS[o.type].name
  })),...NOTES.map((o,i)=>({
    ...o,id:i,kind:'note',label:'Прочитать'
  })),...g.resources.filter(r=>r.ready<=g.time&&!g.parts.some(p=>p.x===r.x&&p.y===r.y)).map(o=>({
    ...o,kind:'resource',label:`Собрать: ${ITEMS[o.type]}`
  }))];
  return candidates.filter(o=>distance(p,o)<2).sort((a,b)=>distance(a,p)-distance(b,p))[0]||null;
}
export function interact(g) {
  const c=context(g),p=g.player;
  if(!c||p.dead)return null;
  if(c.kind==='resource'){
    const r=g.resources.find(r=>r.id===c.id);
    r.ready=g.time+240;
    const n=r.type==='wood'?4:r.type==='stone'?3:3;
    add(p.inv,r.type,n);
    if(r.type==='wood'&&hash(r.x+g.stats.gathered,r.y)>.6)add(p.inv,'resin',1);
    g.stats.gathered++;
    g.effects.push({
      x:c.x,y:c.y,text:`+${n} ${ITEMS[r.type]}`,color:'#f2da96',life:1.4
    });
    return 'gather';
  }
  if(c.kind==='grave'){
    const grave=g.graves.find(v=>v.id===c.id);
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
    if(part.open&&(distance(p,part)<.75||g.enemies.some(e=>!e.dead&&distance(e,part)<.75))){
      tell(g,'Освободите дверной проём перед закрытием.');
      return null;
    }
    part.open=!part.open;
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
export function storeItems(g,withdraw=false) {
  if(!station(g,'chest'))return tell(g,'Подойдите к свободному сундуку.'),false;
  const src=withdraw?g.storage:g.player.inv,dst=withdraw?g.player.inv:g.storage;
  for(const k of Object.keys(src)){
    if(!withdraw&&['sword','bow','armor','arrow'].includes(k))continue;
    add(dst,k,src[k]);
    delete src[k];
  }
  tell(g,withdraw?'Запасы взяты.':'Ресурсы и еда оставлены в сундуке.');
  return true;
}
export function attack(g) {
  const p=g.player;
  if(p.dead||p.attack>0||p.stamina<12)return false;
  let weapon=p.inv[p.weapon]?p.weapon:'hands';
  const range=weapon==='bow'?9:1.9;
  if(weapon==='bow'&&!p.inv.arrow)return tell(g,'Нет стрел. Создайте их у верстака.'),false;
  p.attack=weapon==='bow'?.65:.45;
  p.strikeAt=g.time;
  p.stamina-=weapon==='bow'?12:15;
  if(weapon==='bow')add(p.inv,'arrow',-1);
  const targets=g.enemies.filter(e=>!e.dead&&distance(e,p)<range&&lineClear(g,p,e)).sort((a,b)=>distance(a,p)-distance(b,p));
  const e=targets[0];
  g.effects.push({
    x:p.x,y:p.y,text:weapon==='bow'?'↗':'⌒',color:'#f9df99',life:.35
  });
  if(!e)return true;
  const aimDistance=Math.max(.001,distance(e,p));
  p.facing={
    x:(e.x-p.x)/aimDistance,y:(e.y-p.y)/aimDistance
  };
  const skill=p.skills[weapon]||0,damage=(weapon==='hands'?7:weapon==='bow'?19:24)*(1+skill*.016)*(e.stun>0?2:1);
  hurtEnemy(g,e,damage);
  if(weapon!=='hands')gainSkill(g,weapon,1.6);
  if(weapon==='bow')g.effects.push({
    x:p.x,y:p.y,to:{
      x:e.x,y:e.y
    },life:.25,color:'#ead39b'
  });
  return true;
}
function lineClear(g,a,b) {
  const n=Math.ceil(distance(a,b)*3);
  for(let i=1; i<n; i++)if(solidAt(g,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;
  return true;
}
export function parry(g) {
  const p=g.player;
  if(p.dead||p.parryCooldown>0||p.stamina<18)return false;
  p.parry=.32;
  p.parryCooldown=1.5;
  p.stamina-=18;
  return true;
}
function hurtEnemy(g,e,n) {
  e.hp-=n;
  g.effects.push({
    x:e.x,y:e.y,text:`−${Math.round(n)}`,color:'#f7ca83',life:.8
  });
  if(e.hp<=0){
    e.dead=true;
    e.respawnAt=g.time+300;
    g.stats.kills++;
    if(e.type==='boss'){
      g.bossDefeated=true;
      add(g.player.inv,'trophy',1);
      tell(g,'Хранитель пал. Лесная проверка пройдена. Мир остаётся доступным.');
    }
    else{
      add(g.player.inv,'meat',1);
      add(g.player.inv,'hide',e.type==='wolf'?2:1);
      add(g.player.inv,'resin',1);
    }
  }
}
export function damagePlayer(g,n,enemy=null) {
  const p=g.player;
  if(p.dead)return;
  if(enemy&&p.parry>0){
    enemy.stun=2.3;
    enemy.phase='idle';
    enemy.cooldown=2.3;
    gainSkill(g,'guard',2);
    tell(g,'Контрудар! Противник открыт.');
    g.effects.push({
      x:p.x,y:p.y,text:'ОТРАЖЕНО',color:'#aee7e1',life:1
    });
    return;
  }
  if(enemy&&p.blocking&&p.parryCooldown<=0&&p.stamina>=10){
    p.stamina-=Math.max(5,10-p.skills.guard*.05);
    n*=.2/(1+p.skills.guard*.01);
    gainSkill(g,'guard',1);
    if(p.inv.armor)p.durability=Math.max(0,p.durability-.15);
  }
  else if(enemy&&p.inv.armor&&p.durability>0){
    n*=.65/(1+p.skills.guard*.004);
    p.durability=Math.max(0,p.durability-1);
    gainSkill(g,'guard',.4);
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
  p.dead=true;
  p.hp=0;
  p.blocking=false;
  g.graves.push({
    id:g.nextId++,x:p.x,y:p.y,inv:{
      ...p.inv
    }
  });
  p.inv={
  };
  p.weapon='hands';
  for(const e of g.enemies)if(e.type==='boss'&&!e.dead){
    Object.assign(e,makeEnemy('boss',BOSS_POS.x,BOSS_POS.y,'boss'));
  }
  tell(g,'Вы пали. Вещи ждут на месте гибели.');
}
export function respawn(g,home=false) {
  if(!g.player.dead)return false;
  const bed=g.parts.find(p=>p.type==='bed'&&p.hp>0);
  const pos=home&&bed?bed:START;
  Object.assign(g.player,{
    x:pos.x,y:pos.y,hp:100,stamina:100,food:300,buff:0,foodBonus:0,dead:false,attack:0,parry:0,parryCooldown:0
  });
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
  const value=homeValue(g),count=2+Math.min(4,Math.floor(value/20));
  for(let i=0; i<count; i++){
    const a=i/count*Math.PI*2;
    const type=value>=28&&i===0?'breaker':i%2?'wolf':'draugr';
    g.enemies.push(makeEnemy(type,clamp(g.home.x+Math.cos(a)*9,3,60),clamp(g.home.y+Math.sin(a)*9,3,60),`raid${g.nextId++}`,true));
  }
  tell(g,'На дом нападают! Можно вернуться или освободить его позже.');
}
function updateEnemy(g,e,dt) {
  if(e.dead){
    if(e.type!=='boss'&&!e.raid&&g.time>=e.respawnAt&&distance(g.player,e.origin)>10)Object.assign(e,makeEnemy(e.type,e.origin.x,e.origin.y,e.id));
    return;
  }
  e.cooldown=Math.max(0,e.cooldown-dt);
  e.stun=Math.max(0,e.stun-dt);
  if(e.stun>0)return;
  const p=g.player,d=distance(e,p),night=isNight(g);
  let target=null,structure=null;
  if(e.type==='boss') {
    if(distance(p,BOSS_POS)>14){
      if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+40*dt);
      target=e.origin;
    }
    else if(d<10)target=p;
  }
  else if(d<(night?8:4)||e.hp<e.maxHp)target=p;
  if(e.raid&&g.home){
    if(!target)target=g.home;
    const parts=g.parts.filter(t=>t.hp>0&&t.type!=='floor'&&t.type!=='chest');
    if(e.type==='breaker'&&parts.length){
      structure=parts.sort((a,b)=>distance(a,e)-distance(b,e))[0];
      target=structure;
    }
  }
  if(!target){
    if(distance(e,e.origin)>1)target=e.origin;
    else return;
  }
  if(e.phase==='windup'){
    e.timer-=dt;
    if(e.timer>0)return;
    e.strikeAt=g.time;
    const r=e.type==='boss'?(e.attackIndex%3===0&&e.hp<e.maxHp*.5?4.2:2.8):1.5;
    if(structure&&distance(e,structure)<2)damagePart(g,structure,e.damage*2);
    else if(!p.dead&&distance(e,p)<r&&lineClear(g,e,p))damagePlayer(g,e.damage*(e.type==='boss'&&e.hp<e.maxHp*.5?1.25:1),e);
    e.phase='idle';
    e.cooldown=e.type==='boss'?1.6:1.1;
    return;
  }
  if(p.dead&&target===p)return;
  const td=distance(e,target);
  if((target===p||structure)&&td<(e.type==='boss'?2.4:1.25)&&e.cooldown===0){
    e.attackFacingX=target.x-e.x;
    e.attackFacingY=target.y-e.y;
    e.phase='windup';
    e.attackIndex++;
    e.timer=e.type==='boss'?(e.hp<e.maxHp*.5&&e.attackIndex%3===0?1.4:e.hp<e.maxHp*.5?.8:1.1):e.type==='wolf'?.55:.85;
    e.windupTime=e.timer;
    return;
  }
  if(td>.6){
    const speed=e.speed*(night?1.15:1)*dt,dx=(target.x-e.x)/td*speed,dy=(target.y-e.y)/td*speed;
    const barrier=solidAt(g,e.x+dx*4,e.y+dy*4);
    if(barrier){
      if(e.type==='breaker'&&e.cooldown===0){
        e.strikeAt=g.time;
        e.attackFacingX=barrier.x-e.x;
        e.attackFacingY=barrier.y-e.y;
        damagePart(g,barrier,35);
        e.cooldown=1;
      }
      else{
        move(g,e,-dy,dx);
      }
    }
    else move(g,e,dx,dy);
  }
}
export function tick(g,dt,input={
  x:0,y:0,block:false
}) {
  if(g.paused||g.player.dead)return;
  dt=clamp(dt,0,.1);
  g.time+=dt;
  const p=g.player;
  for(const k of ['attack','parry','parryCooldown','hurt','buff','food'])p[k]=Math.max(0,p[k]-dt);
  p.blocking=!!input.block&&p.parryCooldown<=0;
  p.stamina=Math.min(100,p.stamina+dt*(p.blocking?5:20));
  p.hp=Math.min(p.hp,maxHp(g));
  if(p.food<=0)damagePlayer(g,dt*.7);
  if(p.dead)return;
  const len=Math.hypot(input.x||0,input.y||0);
  if(len>0){
    const speed=(p.blocking?1.4:3.2)*dt;
    move(g,p,input.x/Math.max(1,len)*speed,input.y/Math.max(1,len)*speed);
    p.facing={
      x:input.x/len,y:input.y/len
    };
  }
  if(len===0&&p.food>0&&p.hp<maxHp(g)&&station(g,'fire')&&sheltered(g)&&!blocked(g,p)){
    const decor=g.parts.some(t=>t.type==='decor'&&t.hp>0);
    p.hp=Math.min(maxHp(g),p.hp+dt*(decor?1.15:1));
  }
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
  for(const e of g.enemies){
    updateEnemy(g,e,dt);
    if(p.dead)break;
  }
  g.enemies=g.enemies.filter(e=>!(e.raid&&e.dead));
  for(const fx of g.effects)fx.life-=dt;
  g.effects=g.effects.filter(f=>f.life>0);
}
export function saveGame(g) {
  return JSON.stringify({
    ...g,events:[],effects:[],paused:false
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
  for(const k of ['attack','parry','parryCooldown','hurt'])if(!number(p[k]))fail();
  if(!p.facing||!number(p.facing.x,-1,1)||!number(p.facing.y,-1,1))fail();
  if(g.home!==null&&!position(g.home))fail();
  if(!array(g.parts,250)||!array(g.resources,5000)||!array(g.enemies,500)||!array(g.graves,500)||!array(g.notes,NOTES.length))fail();
  for(const part of g.parts)if(!Object.hasOwn(PARTS,part.type)||!position(part)||!number(part.hp,0,PARTS[part.type].hp)||!number(part.id))fail();
  for(const r of g.resources)if(!position(r)||!['wood','stone','berry'].includes(r.type)||!number(r.ready)||typeof r.id!=='string')fail();
  for(const e of g.enemies){
    if(!Object.hasOwn(enemyData,e.type)||!position(e)||!position(e.origin)||!number(e.hp,-1000,1000)||!number(e.maxHp,1,1000)||!number(e.speed,0,10)||!number(e.damage,0,100)||!['idle','windup'].includes(e.phase)||typeof e.dead!=='boolean')fail();
    for(const k of ['timer','cooldown','stun','respawnAt','attackIndex'])if(!number(e[k],k==='timer'?-.1:0))fail();
  }
  for(const grave of g.graves)if(!position(grave)||!inventory(grave.inv)||!number(grave.id))fail();
  if(!g.notes.every(n=>Number.isInteger(n)&&n>=0&&n<NOTES.length)||!number(g.nextId,1)||!number(g.raidDay)||!number(g.raidWarning,-1)||typeof g.raidPending!=='boolean'||typeof g.bossDefeated!=='boolean')fail();
  if(!g.stats||!['gathered','crafted','kills','nights'].every(k=>number(g.stats[k])))fail();
  g.events=[];
  g.effects=[];
  g.paused=false;
  g.player.blocking=false;
  return g;
}
