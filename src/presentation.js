// Delayed presentation only: authoritative state, input and collision checks stay untouched.
export class OnlinePresentation{
 constructor(){this.reset();}
 reset(){this.time=-Infinity;this.samples=[];this.actors=new Map();this.view={};}
 push(game,now=performance.now()){
  const sample={time:game.time,now};
  for(const key of ['player','peers','enemies','animals'])sample[key]=key==='player'?{...game.player}:(game[key]||[]).map(a=>({...a}));
  if(this.samples.length&&game.time<this.samples.at(-1).time)this.reset();
  this.samples.push(sample);if(this.samples.length>32)this.samples.shift();
 }
 draw(game,now=performance.now()){
  if(!this.samples.length)return game;
  const last=this.samples.at(-1),time=Math.max(this.time,this.samples[0].time,Math.min(last.time,last.time+(now-last.now)/1000-.2));
  this.time=time;
  let a=this.samples[0],b=a;
  for(const next of this.samples){b=next;if(next.time>=time)break;a=next;}
  const t=b.time>a.time?Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))):1,live=new Set();
  const actor=(from,to,key)=>{
   live.add(key);let view=this.actors.get(key);if(!view){view={};this.actors.set(key,view);}
   Object.assign(view,t<1?from:to);
   const snap=Math.hypot(to.x-from.x,to.y-from.y)>3||from.dead!==to.dead;
   if(snap)Object.assign(view,to);
   view.x=snap?to.x:from.x+(to.x-from.x)*t;view.y=snap?to.y:from.y+(to.y-from.y)*t;
   return view;
  };
  Object.assign(this.view,game,{time});
  this.view.player=actor(a.player,b.player,'player:'+b.player.id);
  for(const key of ['peers','enemies','animals']){
   const old=new Map(a[key].map(p=>[p.id,p]));
   this.view[key]=b[key].map(p=>actor(old.get(p.id)||p,p,key+':'+p.id));
  }
  for(const key of this.actors.keys())if(!live.has(key))this.actors.delete(key);
  return this.view;
 }
}
