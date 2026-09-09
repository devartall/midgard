import { HEX_DIRS, hexRound, hexDistance, metric, wallDistance, sameEdge, wallSegments, intersects, segmentDistance } from './hex.js';
import { MELEE, ENEMY_REACH, sweptHit, aimAngle } from './combat.js';
// Pure simulation. Seconds of active play only; no wall-clock progression.
export const SIZE = 64, DAY = 480, START = {
  x: 12, y: 43
};
export const BOSS_POS = {
  x: 48, y: 14
};
export const ITEMS = {
  wood:'Дерево', stone:'Камень', berry:'Ягоды', meat:'Мясо', hide:'Шкура', resin:'Смола', sword:'Меч', bow:'Лук', arrow:'Стрелы', armor:'Кожаная броня', roast:'Жаркое', stew:'Лесная похлёбка', trophy:'Сердце леса', potion:'Зелье здоровья'
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
  potion:{cost:{berry:3,resin:1},station:'fire',count:1},
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
export const GATHER={wood:{hits:4,label:'Рубить',yield:4},stone:{hits:5,label:'Добывать',yield:3},berry:{hits:1,label:'Собрать',yield:3}};
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
export function hash(x,y) {
  const n=Math.sin(x*127.1+y*311.7)*43758.5453;
  return n-Math.floor(n);
}
export const CAMPS=[{x:24,y:31,name:'Волчья лощина',type:'wolf',count:5},{x:39,y:39,name:'Курган драугров',type:'draugr',count:5},{x:43,y:21,name:'Стражи корней',type:'draugr',count:4}];
export function terrain(x,y,g=null) {
  ({x,y}=hexRound(x,y));
  if(x<2||y<2||x>61||y>61)return 'water';
  if(g?.legacyTerrainHome&&g.home&&inHome(g,{x,y}))return 'grass';
  if(distance({x,y},START)<7||distance({x,y},BOSS_POS)<6||NOTES.some(n=>distance(n,{x,y})<2)||isTrail(x,y))return 'grass';
  const ellipse=(cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2;
  if(ellipse(23,19,6,4)<1||ellipse(43,47,7,4)<1||ellipse(10,28,3,5)<1)return 'water';
  if(ellipse(31,43,3,7)<1||ellipse(45,7,9,3)<1||ellipse(53,34,4,7)<1)return 'mountain';
  if(ellipse(23,19,7.5,5.5)<1||ellipse(43,47,8.5,5.5)<1||ellipse(10,28,4.5,6.5)<1)return 'shore';
  if(ellipse(31,43,5,9)<1||ellipse(53,34,6,9)<1)return 'heath';
  return 'grass';
}
export const walkable=(x,y,g=null)=>!['water','mountain'].includes(terrain(x,y,g));
export function nearestLand(pos,g=null){
  if(walkable(pos.x,pos.y,g))return {x:pos.x,y:pos.y};
  const c=hexRound(pos.x,pos.y);
  for(let r=1;r<SIZE;r++)for(let x=c.x-r;x<=c.x+r;x++)for(let y=c.y-r;y<=c.y+r;y++)if(hexDistance(c,{x,y})===r&&walkable(x,y,g))return{x,y};
  return {...START};
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
    version:1,grid:'hex',landscape:2,time:0,player:{
      ...START,hp:100,stamina:100,food:600,buff:0,foodBonus:0,inv:{
        wood:0,stone:0,berry:3
      },quickbar:['sword','bow','berry','roast','stew','potion',null,null,null],potionCooldown:0,weapon:'hands',durability:100,skills:{
        sword:0,bow:0,guard:0
      },focus:'sword',dead:false,attack:0,hurt:0,blocking:false,facing:{
        x:0,y:-1
      }
    },home:null,parts:[],resources:[],enemies:[],graves:[],notes:[],storage:{
    },events:[],effects:[],nextId:1,raidDay:0,raidWarning:0,raidPending:false,bossDefeated:false,stats:{
      gathered:0,crafted:0,kills:0,nights:0
    },paused:false
  };
  for(let x=4; x<60; x++) for(let y=4; y<60; y++) {
    if(!walkable(x,y)||distance({
      x,y
    },START)<2.5||distance({
      x,y
    },BOSS_POS)<5||NOTES.some(n=>distance(n,{
      x,y
    })<1.4)||isTrail(x,y))continue;
    const h=hash(x,y);
    let type=h<.047?'wood':h<.065?'stone':h<.084?'berry':null;
    if(type)g.resources.push({
      id:`r${x}_${y}`,x,y,type,ready:0
    });
  }
  for(const [x,y,type] of [[10,42,'wood'],[11,40,'wood'],[15,44,'stone'],[13,45,'berry']])g.resources.push({
    id:`start${x}`,x,y,type,ready:0
  });
  [[22,37,'wolf'],[27,33,'draugr'],[32,24,'wolf'],[39,24,'draugr'],[42,34,'wolf'],[29,18,'draugr'],[48,29,'wolf'],[19,23,'draugr']].forEach(([x,y,t],i)=>g.enemies.push(makeEnemy(t,x,y,`e${i}`)));
  for(const camp of CAMPS)for(let i=0;i<camp.count;i++){
    const pos=nearestLand({x:camp.x+(i%3)-1,y:camp.y+Math.floor(i/3)-1});
    g.enemies.push(makeEnemy(camp.type,pos.x,pos.y,`camp${camp.x}_${i}`));
  }
  for(const e of g.enemies){const pos=nearestLand(e);Object.assign(e,pos,{origin:{...pos}});}
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
  if(distance(g.player,BOSS_POS)<15||g.player.x<8||g.player.x>55||g.player.y<8||g.player.y>55)return tell(g,'Нужна поляна вдали от древнего круга и берега.'),false;
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
export const usableItem=item=>['sword','bow','potion'].includes(item)||Object.hasOwn(FOODS,item);
export function useItem(g,item){
  const p=g.player;if(p.dead||!p.inv[item])return false;
  if(item==='sword'||item==='bow'){p.weapon=item;return true;}
  if(FOODS[item])return eat(g,item);
  if(item==='potion'){
    if(p.potionCooldown>0)return tell(g,`Зелье будет доступно через ${Math.ceil(p.potionCooldown)} с.`),false;
    if(p.hp>=maxHp(g))return tell(g,'Здоровье уже полное.'),false;
    add(p.inv,item,-1);p.hp=Math.min(maxHp(g),p.hp+40);p.potionCooldown=20;
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
    if(r.type==='berry'){finishGather(g,r);return 'gather';}
    const d=distance(p,r);if(d>.001)p.facing={x:(r.x-p.x)/d,y:(r.y-p.y)/d};
    p.harvest={id:r.id,type:r.type,started:g.time,hit:false,facing:{...p.facing}};return 'harvest';
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
    if(part.open&&(wallDistance(part,p)<.2||g.enemies.some(e=>!e.dead&&wallDistance(part,e)<.2))){
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
function finishGather(g,r){
  const n=GATHER[r.type].yield;r.hits=0;r.ready=g.time+240;
  add(g.player.inv,r.type,n);
  if(r.type==='wood'&&hash(r.x+g.stats.gathered,r.y)>.6)add(g.player.inv,'resin',1);
  g.stats.gathered++;
  g.effects.push({x:r.x,y:r.y,text:`+${n} ${ITEMS[r.type]}`,color:'#f2da96',life:1.4});
}
function updateHarvest(g){
  const p=g.player,h=p.harvest;if(!h)return;
  const age=g.time-h.started,r=g.resources.find(r=>r.id===h.id);
  if(!r||p.dead||(r.ready>g.time&&!h.hit)||distance(p,r)>=GATHER_RANGE||!lineClear(g,p,r)||g.parts.some(part=>part.x===r.x&&part.y===r.y)){p.harvest=null;return;}
  if(age>=.22&&!h.hit){
    h.hit=true;r.hits=(r.hits||0)+1;r.struckAt=g.time;
    if(r.hits>=GATHER[r.type].hits)finishGather(g,r);
  }
  if(age>=.55)p.harvest=null;
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
  const p=g.player,weapon=p.inv[p.weapon]?p.weapon:'hands',cost=weapon==='bow'?12:15;
  if(p.dead||p.harvest||p.attack>0||p.stamina<cost)return false;
  if(weapon==='bow'&&!p.inv.arrow)return tell(g,'Нет стрел. Создайте их у верстака.'),false;
  const range=weapon==='bow'?9:MELEE[weapon].reach+.16;
  const target=g.enemies.filter(e=>!e.dead&&distance(e,p)<=range&&lineClear(g,p,e)).sort((a,b)=>distance(a,p)-distance(b,p))[0];
  if(target&&distance(p,target)>.001)p.facing={x:(target.x-p.x)/distance(p,target),y:(target.y-p.y)/distance(p,target)};
  p.stamina-=cost;
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
  for(const e of g.enemies)if(!e.dead&&!swing.hit.includes(e.id)&&sweptHit(swing,p,e,fromTime,g.time)&&lineClear(g,p,e)) {
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
  if(enemy&&p.blocking&&p.stamina>=10){
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
  p.weapon='hands';p.swing=null;p.harvest=null;
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
    x:pos.x,y:pos.y,hp:100,stamina:100,food:300,buff:0,foodBonus:0,dead:false,attack:0,harvest:null
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
    const spawn=nearestLand({x:clamp(g.home.x+Math.cos(a)*9,3,60),y:clamp(g.home.y+Math.sin(a)*9,3,60)},g);
    g.enemies.push(makeEnemy(type,spawn.x,spawn.y,`raid${g.nextId++}`,true));
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
  for(const k of ['attack','hurt','buff','food','potionCooldown'])p[k]=Math.max(0,p[k]-dt);
  p.blocking=!!input.block;
  p.stamina=Math.min(100,p.stamina+dt*(p.blocking?5:20));
  p.hp=Math.min(p.hp,maxHp(g));
  if(p.food<=0)damagePlayer(g,dt*.7);
  if(p.dead)return;
  const len=metric({x:input.x||0,y:input.y||0},{x:0,y:0});
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
  updateHarvest(g);
  resolveSwing(g,g.time-dt);
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
  for(const k of ['attack','hurt'])if(!number(p[k]))fail();
  if(!p.facing||!number(p.facing.x,-2,2)||!number(p.facing.y,-2,2))fail();
  if(g.home!==null&&!position(g.home))fail();
  if(!array(g.parts,750)||!array(g.resources,5000)||!array(g.enemies,500)||!array(g.graves,500)||!array(g.notes,NOTES.length))fail();
  for(const part of g.parts)if(!Object.hasOwn(PARTS,part.type)||!position(part)||!number(part.hp,0,PARTS[part.type].hp)||!number(part.id)||(part.edge!==undefined&&(!Number.isInteger(part.edge)||part.edge<0||part.edge>5)))fail();
  for(const r of g.resources)if(!position(r)||!['wood','stone','berry'].includes(r.type)||!number(r.ready)||typeof r.id!=='string'||(r.hits!==undefined&&(!Number.isInteger(r.hits)||!number(r.hits,0,GATHER[r.type].hits-1))))fail();
  for(const e of g.enemies){
    if(!Object.hasOwn(enemyData,e.type)||!position(e)||!position(e.origin)||!number(e.hp,-1000,1000)||!number(e.maxHp,1,1000)||!number(e.speed,0,10)||!number(e.damage,0,100)||!['idle','windup'].includes(e.phase)||typeof e.dead!=='boolean')fail();
    for(const k of ['timer','cooldown','stun','respawnAt','attackIndex'])if(!number(e[k],k==='timer'?-.1:0))fail();
  }
  for(const grave of g.graves)if(!position(grave)||!inventory(grave.inv)||!number(grave.id))fail();
  if(!g.notes.every(n=>Number.isInteger(n)&&n>=0&&n<NOTES.length)||!number(g.nextId,1)||!number(g.raidDay)||!number(g.raidWarning,-1)||typeof g.raidPending!=='boolean'||typeof g.bossDefeated!=='boolean')fail();
  if(!g.stats||!['gathered','crafted','kills','nights'].every(k=>number(g.stats[k])))fail();
  if(g.grid!=='hex'&&g.home)g.legacySquarePlot=true;g.grid='hex';
  delete p.parry; delete p.parryCooldown; p.swing=null;p.harvest=null;
  if(p.quickbar===undefined)p.quickbar=['sword','bow','berry','roast','stew','potion',null,null,null];
  if(!Array.isArray(p.quickbar)||p.quickbar.length!==9||!p.quickbar.every(k=>k===null||usableItem(k)))fail();
  if(p.potionCooldown===undefined)p.potionCooldown=0;
  if(!number(p.potionCooldown,0,20))fail();
  if(g.landscape!==2){
    const fresh=createGame();g.resources=fresh.resources;g.landscape=2;g.legacyTerrainHome=!!g.home;
    for(const e of fresh.enemies.filter(e=>e.id.startsWith('camp')))if(!g.enemies.some(old=>old.id===e.id))g.enemies.push(e);
    for(const e of g.enemies){const pos=nearestLand(e,g);Object.assign(e,pos);e.origin=nearestLand(e.origin,g);}
    Object.assign(p,nearestLand(p,g));
    for(const grave of g.graves)Object.assign(grave,nearestLand(grave,g));
  }
  g.events=[];
  g.effects=[];
  g.paused=false;
  g.player.blocking=false;
  return g;
}
