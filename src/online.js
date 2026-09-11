export class OnlineSession{
 constructor(session,onState,onResult){Object.assign(this,session);this.onState=onState;this.onResult=onResult;this.queue=[];this.seq=Date.now();this.busy=false;this.last=0;this.error='';}
 static async request(path,payload){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);try{const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});const data=await r.json();if(!r.ok||data.error)throw Error(data.error||'Сервер недоступен');return data;}finally{clearTimeout(timeout);}}
 send(name,args){if(name==='interact'&&this.queue.some(a=>a.name===name))return true;if(this.queue.length<24)this.queue.push({seq:++this.seq,name,args});return true;}
 async update(now,input){if(this.busy||now-this.last<100)return;this.busy=true;this.last=now;try{const response=await OnlineSession.request('poll',{code:this.code,token:this.token,input,actions:this.queue.slice(0,12)});this.queue=this.queue.filter(a=>a.seq>response.seq);this.error='';this.onState(response.state);for(const result of response.results)this.onResult(result);}catch(e){this.error=e.message;}finally{this.busy=false;}}
}
export function mergeSnapshot(game,state){
 for(const key of ['enemies','animals','peers']){const old=new Map((game[key]||[]).map(e=>[e.id,e]));state[key]=(state[key]||[]).map(e=>Object.assign(old.get(e.id)||{},e));}
 state.player=Object.assign(game.player||{},state.player);Object.assign(game,state);return game;
}
