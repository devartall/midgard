// Temporary, opt-in observations only. No movement or scheduling decisions.
export class RateMeter{
 constructor(now=performance.now()){this.start=now;this.events=[];}
 mark(now=performance.now()){this.events.push(now);this.prune(now);}
 prune(now){while(this.events.length&&this.events[0]<now-5000)this.events.shift();}
 rate(now=performance.now()){this.prune(now);const seconds=Math.min(5000,now-this.start)/1000;return seconds>=.5?this.events.length/seconds:null;}
}
export function percentile(values,fraction=.95){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*fraction))];}
const sample=(list,value)=>{if(Number.isFinite(value)){list.push(value);if(list.length>120)list.shift();}};
export class OnlineDiagnostics{
 constructor(){this.enabled=false;this.reset();}
 reset(now=performance.now()){
  for(const key of ['frames','inputs','snapshots','positions','snapshotPositions','outsideSnapshots','errors','visualPositions'])this[key]=new RateMeter(now);
  this.visualPrevious=null;this.rtts=[];this.drawTimes=[];this.parseTimes=[];this.mergeTimes=[];this.serial=0;this.frameSerial=0;this.previous=null;this.snapshotPrevious=null;this.server=null;this.messageBytes=null;this.snapshotBytes=null;this.inputBytes=null;this.lastSnapshot=null;
 }
 setEnabled(on){this.enabled=on;this.reset();}
 frame(now,player){if(!this.enabled)return;this.frames.mark(now);
  if(this.previous&&(player.x!==this.previous.x||player.y!==this.previous.y)){this.positions.mark(now);if(this.serial===this.frameSerial)this.outsideSnapshots.mark(now);}
  this.previous={x:player.x,y:player.y};this.frameSerial=this.serial;
 }
 visualFrame(now,player){if(!this.enabled)return;if(this.visualPrevious&&(player.x!==this.visualPrevious.x||player.y!==this.visualPrevious.y))this.visualPositions.mark(now);this.visualPrevious={x:player.x,y:player.y};}
 sent(bytes,now=performance.now()){if(!this.enabled)return;this.inputs.mark(now);this.inputBytes=bytes;}
 received(metric,state,now=performance.now()){
  if(!this.enabled)return;this.snapshots.mark(now);this.serial++;this.lastSnapshot=now;
  const p=state.player;if(this.snapshotPrevious&&(p.x!==this.snapshotPrevious.x||p.y!==this.snapshotPrevious.y))this.snapshotPositions.mark(now);this.snapshotPrevious={x:p.x,y:p.y};
  sample(this.rtts,metric.rtt);sample(this.parseTimes,metric.parseMs);this.messageBytes=metric.messageBytes;this.snapshotBytes=metric.snapshotBytes;this.server=metric.server;
 }
 merged(ms){if(this.enabled)sample(this.mergeTimes,ms);}
 drawn(ms){if(this.enabled)sample(this.drawTimes,ms);}
 report(now=performance.now()){
  const n=(v,unit='')=>Number.isFinite(v)?v.toFixed(1)+unit:'—',hz=m=>n(m.rate(now),' /с'),size=v=>Number.isFinite(v)?(v/1024).toFixed(1)+' KiB':'—';
  return [
   'ONLINE DIAGNOSTICS · окно частот 5 с',
   'Транспорт: HTTP POST polling; WebSocket отсутствует',
   'Client FPS: '+hz(this.frames),
   'HTTP RTT полного ответа avg / p95: '+n(this.rtts.length?this.rtts.reduce((a,b)=>a+b,0)/this.rtts.length:null,' ms')+' / '+n(percentile(this.rtts),' ms'),
   'Input отправлено: '+hz(this.inputs)+' · ошибки: '+hz(this.errors),
   'Server simulation tick: '+n(this.server?.simulationHz,' /с')+' (цель 20)',
   'Server snapshots этому клиенту: '+n(this.server?.snapshotsHz,' /с'),
   'Snapshots получено: '+hz(this.snapshots)+' · возраст: '+n(this.lastSnapshot===null?null:now-this.lastSnapshot,' ms'),
   'Input / snapshot / весь JSON: '+size(this.inputBytes)+' / '+size(this.snapshotBytes)+' / '+size(this.messageBytes),
   'Размеры: UTF-8 JSON, без HTTP/TLS и сжатия',
   'Server event-loop delay p95 / max: '+n(this.server?.loopP95Ms,' ms')+' / '+n(this.server?.loopMaxMs,' ms')+' (probe 10 ms)',
   'Server tick CPU p95: '+n(this.server?.tickCpuP95Ms,' ms')+' · JSON encode: '+n(this.server?.serializeMs,' ms'),
   'Позиция героя в мире: '+hz(this.positions)+' · изменения в snapshots: '+hz(this.snapshotPositions),
   'Отображаемая позиция: '+hz(this.visualPositions),
   'Позиция без нового snapshot: '+hz(this.outsideSnapshots),
   'Client draw / JSON parse / merge p95: '+n(percentile(this.drawTimes),' ms')+' / '+n(percentile(this.parseTimes),' ms')+' / '+n(percentile(this.mergeTimes),' ms'),
   'RTT включает сервер и загрузку тела; это не чистый сетевой ping.',
   'Проверка: двигайтесь непрерывно 10–15 с. Данные после сворачивания сбрасываются.'
  ].join('\n');
 }
}
