export class OnlineSession{
 constructor(session,onState,onResult){Object.assign(this,session);this.onState=onState;this.onResult=onResult;this.queue=[];this.seq=Date.now();this.busy=false;this.last=0;this.error='';}
 static async request(path,payload){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   return await readRoomResponse(response,path);
  }catch(error){
   if(error.name==='AbortError')throw Error('Сервер комнат не ответил за 8 секунд. Проверьте соединение и повторите попытку.');
   if(error instanceof TypeError)throw Error('Не удалось связаться с сервером комнат. Проверьте соединение и адрес сервера.');
   throw error;
  }finally{clearTimeout(timeout);}
 }

 send(name,args){if(name==='interact'&&this.queue.some(a=>a.name===name))return true;if(this.queue.length<24)this.queue.push({seq:++this.seq,name,args});return true;}
 async update(now,input){if(this.busy||now-this.last<100)return;this.busy=true;this.last=now;try{const response=await OnlineSession.request('poll',{code:this.code,token:this.token,input,actions:this.queue.slice(0,12)});this.queue=this.queue.filter(a=>a.seq>response.seq);this.error='';this.onState(response.state);for(const result of response.results)this.onResult(result);}catch(e){this.error=e.message;}finally{this.busy=false;}}
}
export function mergeSnapshot(game,state){
 for(const key of ['enemies','animals','peers']){const old=new Map((game[key]||[]).map(e=>[e.id,e]));state[key]=(state[key]||[]).map(e=>Object.assign(old.get(e.id)||{},e));}
 state.player=Object.assign(game.player||{},state.player);Object.assign(game,state);return game;
}

export async function readRoomResponse(response,path){
 const type=response.headers.get('content-type')||'',body=await response.text();
 if(!type.toLowerCase().includes('application/json')){
  if(response.status>=500)throw Error('Сервер комнат временно недоступен (HTTP '+response.status+'). Повторите попытку позже.');
  throw Error('Сервер комнат не подключён к этому сайту. Netlify Drop размещает только файлы игры; для онлайна нужно подключить отдельный сервер комнат. Соло доступно.');
 }
 let data;try{data=JSON.parse(body);}catch{throw Error('Сервер комнат вернул повреждённый ответ. Повторите попытку или сообщите владельцу сервера.');}
 if(!response.ok||data?.error)throw Error(typeof data?.error==='string'?data.error:'Сервер комнат отклонил запрос (HTTP '+response.status+').');
 const state=data?.state,session=path==='create'||path==='join';
 if(!state||typeof state!=='object'||!state.player||!Array.isArray(state.peers)||
    (session&&(!data.code||typeof data.code!=='string'||typeof data.token!=='string'||typeof data.playerId!=='string'))||
    (!session&&(!Array.isArray(data.results)||!Number.isFinite(data.seq))))throw Error('По этому адресу работает несовместимый сервер комнат. Проверьте настройку подключения.');
 return data;
}
