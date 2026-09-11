import test from 'node:test';
import assert from 'node:assert/strict';
import {Rooms,roomCode} from '../tools/rooms.mjs';
test('four-digit room codes skip occupied IDs and wrap without overwriting rooms',()=>{
 assert.equal(roomCode(new Map([['9999',{}],['1000',{}]]),9999),'1001');
 const occupied=new Map(Array.from({length:9000},(_,i)=>[String(1000+i),{}]));
 assert.throws(()=>roomCode(occupied,1000),/Нет свободных/);
});
test('new numeric rooms and existing legacy codes can both be joined',()=>{
 const rooms=new Rooms(),session=rooms.create();assert.match(session.code,/^[1-9]\d{3}$/);
 assert.equal(rooms.join(session.code).code,session.code);
 const room=rooms.rooms.get(session.code);rooms.rooms.delete(session.code);room.id='ABCDEF1234';rooms.rooms.set(room.id,room);
 assert.equal(rooms.join('abcdef1234').code,room.id);
});
