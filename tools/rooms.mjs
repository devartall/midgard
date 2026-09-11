import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import * as G from '../src/game.js';
import {appearance,characterName} from '../src/character.js';
const code=()=>randomBytes(5).toString('hex').toUpperCase();
export class Rooms{
 constructor(){this.rooms=new Map();}
 create(profile={}){if(this.rooms.size>=50)throw Error('Сервер заполнен');const id=code(),room={id,game:G.createGame(),members:new Map()};this.rooms.set(id,room);return this.join(id,profile);}
 join(id,profile={},token=null){profile=profile&&typeof profile==='object'?profile:{};const room=this.rooms.get(String(id).toUpperCase());if(!room)throw Error('Комната не найдена');let member=token&&room.members.get(token);
  if(!member){if(room.members.size>=4)throw Error('В комнате уже четыре героя');token=randomBytes(24).toString('hex');const p=G.createGame(1).player;p.id=randomBytes(8).toString('hex');p.name=characterName(profile.name);p.appearance=appearance(profile.appearance);member={player:p,input:{},seen:Date.now(),seq:0,sounds:[]};room.members.set(token,member);}
  for(const biome of room.game.defeated)G.claimBossReward(member.player,biome);member.seen=Date.now();return {code:room.id,token,playerId:member.player.id,state:this.snapshot(room,member)};
 }
 member(id,token){const room=this.rooms.get(id),member=room?.members.get(token);if(!member)throw Error('Нет доступа к комнате');return {room,member};}
 command(g,name,args){
  if(!Array.isArray(args)||args.length>5)throw Error('Некорректная команда');
  if(g.player.dead&&!['respawn','pvp','assignQuickSlot'].includes(name))return false;
  const item=args[0],number=v=>Number.isFinite(v),part=id=>g.parts.find(p=>p.id===id);
  if(['craft','useItem','eat'].includes(name)&&Object.hasOwn(G.ITEMS,item))return G[name](g,item);
  if(name==='assignQuickSlot'&&Number.isInteger(item)&&(args[1]===null||G.usableItem(args[1])))return G.assignQuickSlot(g,item,args[1]);
  if(name==='useQuickSlot'&&Number.isInteger(item))return G.useQuickSlot(g,item);
  if(['attack','interact','claimHome'].includes(name))return G[name](g);
  if(name==='respawn')return G.respawn(g,item===true);
  if(name==='storeItems')return G.storeItems(g,item===true);
  if(name==='removePart'&&number(item))return G.removePart(g,item);
  if(name==='repair'&&number(item?.id))return G.repair(g,part(item.id));
  if(name==='build'&&Object.hasOwn(G.PARTS,item)&&number(args[1])&&number(args[2]))return G.build(g,...args);
  if(name==='buildBatch'&&Array.isArray(item)&&item.length<=250&&item.every(p=>p&&Object.hasOwn(G.PARTS,p.type)&&number(p.x)&&number(p.y)))return G.buildBatch(g,item);
  if(name==='transferSkill'&&Object.hasOwn(G.SKILLS,item)&&Object.hasOwn(G.SKILLS,args[1]))return G.transferSkill(g,item,args[1]);
  if(name==='focus'&&Object.hasOwn(G.SKILLS,item)){g.player.focus=item;return true;}
  if(name==='pvp'&&typeof item==='boolean'){g.player.pvp=item;return true;}
  if(name==='armorRepair'&&G.station(g,'bench')&&G.afford(g.player.inv,{hide:2})){G.add(g.player.inv,'hide',-2);g.player.durability=100;return true;}
  throw Error('Команда недоступна');
 }
 poll(id,token,payload={}){const {room,member}=this.member(id,token),now=Date.now();if(member.lastPoll&&now-member.lastPoll<40)throw Error('Слишком частые запросы');member.lastPoll=now;member.seen=now;
  const input=payload.input||{};member.input={x:Number.isFinite(input.x)?Math.max(-3,Math.min(3,input.x)):0,y:Number.isFinite(input.y)?Math.max(-3,Math.min(3,input.y)):0,block:input.block===true};
  const previous=room.game.player;room.game.player=member.player;room.game.paused=false;const results=[];
  try{for(const action of (Array.isArray(payload.actions)?payload.actions:[]).slice(0,12)){if(!Number.isInteger(action.seq)||action.seq<=member.seq)continue;member.seq=action.seq;try{results.push({seq:action.seq,value:this.command(room.game,action.name,action.args)});}catch{results.push({seq:action.seq,error:'Действие отклонено'});}}}finally{room.game.player=previous;}
  this.distributeSounds(room);
  this.diagnostics?.snapshot(member);
  return {state:this.snapshot(room,member),results,seq:member.seq};
 }
 tick(dt,now=Date.now()){for(const room of this.rooms.values()){const members=[...room.members.values()].filter(m=>now-m.seen<30000);if(!members.length)continue;const g=room.game;g.players=members.map(m=>m.player);g.player=g.players[0];const inputs={};for(const m of members)inputs[m.player.id]=now-m.seen<800?m.input:{};const tickStart=performance.now();G.tickPlayers(g,dt,inputs);this.diagnostics?.tick(room,performance.now()-tickStart);this.distributeSounds(room);if(g.events.length>30)g.events.splice(0,g.events.length-30);}}
 distributeSounds(room){for(const m of room.members.values())m.sounds=[...(m.sounds||[]),...room.game.sounds].slice(-60);room.game.sounds=[];}
 snapshot(room,member){const g=room.game,p=member.player;const sounds=member.sounds||[];member.sounds=[];return {...g,sounds,player:p,players:undefined,peers:[...room.members.values()].filter(m=>m!==member&&Date.now()-m.seen<30000).map(m=>m.player),resources:g.resources.filter(r=>G.distance(p,r)<32),online:{code:room.id,count:room.members.size},paused:false};}
 async save(dir){await mkdir(dir,{recursive:true});const value=[...this.rooms.values()].map(r=>({id:r.id,game:{...r.game,players:undefined},members:[...r.members]}));await writeFile(dir+'/rooms.tmp',JSON.stringify(value));await rename(dir+'/rooms.tmp',dir+'/rooms.json');}
 async load(dir){try{const data=JSON.parse(await readFile(dir+'/rooms.json','utf8'));for(const r of data){const room={id:r.id,game:r.game,members:new Map(r.members)};for(const m of room.members.values()){m.seen=0;m.input={};m.player.pvp=false;m.sounds=[];}room.game.players=[];this.rooms.set(r.id,room);}}catch(e){if(e.code!=='ENOENT')throw e;}}
}
const attempts=new Map();
export async function roomRequest(rooms,req,res){
 const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith('/api/'))return false;
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 try{
  const ip=req.socket.remoteAddress,now=Date.now();let rate=attempts.get(ip);if(!rate||now-rate.start>60000){rate={start:now,total:0,joins:0};attempts.set(ip,rate);}if(++rate.total>1800||(pathname!=='/api/poll'&&++rate.joins>12))throw Error('Слишком много запросов. Подождите минуту.');if(attempts.size>5000)for(const [key,value]of attempts)if(now-value.start>60000)attempts.delete(key);
  if(req.method!=='POST'||!String(req.headers['content-type']).startsWith('application/json'))throw Error('Нужен JSON POST');
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){const allowed=(process.env.ROOM_ALLOWED_ORIGINS||'').split(',').map(value=>value.trim()).filter(Boolean);if(!allowed.includes(req.headers.origin))throw Error('Этот сайт не разрешён сервером комнат. Добавьте его адрес в ROOM_ALLOWED_ORIGINS.');}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>32768)throw Error('Запрос слишком большой');}const p=JSON.parse(body||'{}');if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Некорректный запрос');let result;
  if(pathname==='/api/create')result=rooms.create(p.profile);
  else if(pathname==='/api/join')result=rooms.join(p.code,p.profile,p.token);
  else if(pathname==='/api/poll')result=rooms.poll(p.code,p.token,p);
  else throw Error('Неизвестный запрос');
  const serializeStart=performance.now(),serialized=JSON.stringify(result),serializeMs=performance.now()-serializeStart;
  if(pathname==='/api/poll'&&req.headers['x-midgard-diagnostics']==='1'&&rooms.diagnostics){const {room,member}=rooms.member(p.code,p.token);res.setHeader('X-Midgard-Diagnostics',JSON.stringify({...rooms.diagnostics.read(room,member),serializeMs}));}
  res.end(serialized);
 }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}return true;
}
