// Local HTTP latency experiment, one player, no renderer or external service.
// Run: node tools/diagnose-online.mjs (about 22 seconds). No saved rooms are touched.
import {Rooms,roomRequest} from './rooms.mjs';
import {ServerDiagnostics} from './diagnostics.mjs';
import {OnlineSession,mergeSnapshot} from '../src/online.js';
import {createServer} from 'node:http';
const rooms=new Rooms();rooms.diagnostics=new ServerDiagnostics();
const server=createServer((q,s)=>roomRequest(rooms,q,s));await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,originalFetch=globalThis.fetch;
const sim=setInterval(()=>rooms.tick(.05),50);
try{for(const delay of [0,160,320]){
 globalThis.fetch=async(path,opts)=>{await new Promise(r=>setTimeout(r,delay));return originalFetch(base+path,opts);};
 const data=rooms.create(),game=structuredClone(data.state);const s=new OnlineSession(data,state=>mergeSnapshot(game,state),()=>{});s.diagnostics.setEnabled(true);
 const start=performance.now(),frames=setInterval(()=>{const now=performance.now();s.update(now,{x:Math.floor((now-start)/1000)%2?1:-1,y:0});s.diagnostics.frame(now,game.player);},1000/60);
 await new Promise(r=>setTimeout(r,7000));clearInterval(frames);
 console.log('Injected delay '+delay+' ms\n'+s.diagnostics.report().replace('Client FPS:', 'Synthetic callbacks (NOT browser FPS):'));
 while(s.busy)await new Promise(r=>setTimeout(r,10));rooms.rooms.delete(data.code);
}}finally{globalThis.fetch=originalFetch;clearInterval(sim);rooms.diagnostics.close();await new Promise(r=>server.close(r));}
