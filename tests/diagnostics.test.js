import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineDiagnostics,RateMeter} from '../src/diagnostics.js';
import {OnlineSession,mergeSnapshot} from '../src/online.js';
import {Rooms,roomRequest} from '../tools/rooms.mjs';
import {ServerDiagnostics} from '../tools/diagnostics.mjs';
import {createServer} from 'node:http';

test('diagnostics distinguish render frames from position updates and expire stale samples',()=>{
 const d=new OnlineDiagnostics();d.enabled=true;d.reset(0);let p={x:0,y:0};
 for(let i=0;i<=600;i++){const t=i*1000/60;if(i%6===0){p={x:i,y:0};d.received({rtt:90,parseMs:1,messageBytes:500,snapshotBytes:450,server:null},{player:p},t);}d.frame(t,p);}
 assert.ok(Math.abs(d.frames.rate(10000)-60)<1);assert.ok(Math.abs(d.snapshots.rate(10000)-10)<1);assert.ok(Math.abs(d.positions.rate(10000)-10)<1);assert.equal(d.outsideSnapshots.rate(10000),0);
 d.frame(10001,{x:1000,y:0});assert.ok(d.outsideSnapshots.rate(10001)>0);assert.equal(d.snapshots.rate(16000),0);
 assert.match(d.report(16000),/WebSocket отсутствует/);
});
test('a busy HTTP request prevents newer inputs and local positions remain unchanged until a snapshot',async()=>{
 const original=OnlineSession.request;let finish,calls=0;const game={player:{x:0,y:0},enemies:[],animals:[],peers:[]};
 OnlineSession.request=()=>{calls++;return new Promise(resolve=>finish=resolve);};
 try{const s=new OnlineSession({code:'test',token:'not-a-real-token'},state=>mergeSnapshot(game,state),()=>{});const pending=s.update(100,{x:1});
  for(const t of [120,200,300,400]){await s.update(t,{x:1});assert.equal(game.player.x,0);}assert.equal(calls,1);
  finish({state:{player:{x:2,y:0},enemies:[],animals:[],peers:[]},results:[],seq:0});await pending;assert.equal(game.player.x,2);
 }finally{OnlineSession.request=original;}
});
test('diagnostic headers are optional, observe the real room and leave snapshots unchanged',async()=>{
 const rooms=new Rooms();rooms.diagnostics=new ServerDiagnostics();const server=createServer((req,res)=>roomRequest(rooms,req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const post=(path,body,diagnostic=false)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',...(diagnostic?{'X-Midgard-Diagnostics':'1'}:{})},body:JSON.stringify(body)});
 try{const session=await(await post('create',{})).json();rooms.tick(.05);const response=await post('poll',{code:session.code,token:session.token},true),header=JSON.parse(response.headers.get('x-midgard-diagnostics')),data=await response.json();assert.ok(Number.isFinite(header.serializeMs));assert.ok(Number.isFinite(header.tickCpuP95Ms));assert.equal(data.state.diagnostics,undefined);assert.equal(data.state.player.id,session.playerId);
  const joined=await(await post('join',{code:session.code})).json(),normal=await post('poll',{code:joined.code,token:joined.token});assert.equal(normal.headers.get('x-midgard-diagnostics'),null);
 }finally{rooms.diagnostics.close();await new Promise(resolve=>server.close(resolve));}
});
