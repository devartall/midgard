import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Rooms,roomRequest} from '../tools/rooms.mjs';
import {readRoomResponse} from '../src/online.js';
import {netlifyRedirects} from '../tools/deploy-config.mjs';

test('Netlify HTML fallback is explained instead of throwing a JSON syntax error',async()=>{
 for(const status of [200,404])await assert.rejects(readRoomResponse(new Response('<!doctype html><html>Not found</html>',{status,headers:{'content-type':'text/html'}}),'create'),/Сервер комнат не подключён.*Netlify Drop/);
 await assert.rejects(readRoomResponse(new Response('<html>Bad gateway</html>',{status:502}),'join'),/временно недоступен.*502/);
});
test('JSON responses preserve useful server errors and reject damaged/incompatible servers',async()=>{
 const json=body=>new Response(body,{headers:{'content-type':'application/json'}});
 await assert.rejects(readRoomResponse(json('{broken'),'create'),/повреждённый ответ/);
 await assert.rejects(readRoomResponse(json('{"ok":true}'),'create'),/несовместимый сервер/);
 await assert.rejects(readRoomResponse(new Response('{"error":"Комната не найдена"}',{status:400,headers:{'content-type':'application/json'}}),'join'),/Комната не найдена/);
 const data=new Rooms().create();assert.equal((await readRoomResponse(json(JSON.stringify(data)),'create')).code,data.code);
});
test('Netlify proxy rules only accept clean HTTPS server origins',()=>{
 assert.equal(netlifyRedirects('https://rooms.example.test'),'/api/* https://rooms.example.test/api/:splat 200!\n');
 for(const url of ['http://example.test','https://user:pass@example.test','https://example.test/api','https://example.test/?x=1','https://example.test/#test'])assert.throws(()=>netlifyRedirects(url));
});
test('a Netlify proxy can create and join rooms only from explicitly allowed origins',async()=>{
 const previous=process.env.ROOM_ALLOWED_ORIGINS;process.env.ROOM_ALLOWED_ORIGINS='https://game.example.netlify.app';
 const rooms=new Rooms(),server=createServer((req,res)=>roomRequest(rooms,req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const post=(path,origin,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const a=await readRoomResponse(await post('create','https://game.example.netlify.app',{}),'create');
  const b=await readRoomResponse(await post('join','https://game.example.netlify.app',{code:a.code}),'join');assert.equal(a.code,b.code);assert.notEqual(a.playerId,b.playerId);
  const denied=await post('create','https://stranger.example',{});assert.equal(denied.status,400);assert.equal(rooms.rooms.size,1);
 }finally{await new Promise(resolve=>server.close(resolve));if(previous===undefined)delete process.env.ROOM_ALLOWED_ORIGINS;else process.env.ROOM_ALLOWED_ORIGINS=previous;}
});
