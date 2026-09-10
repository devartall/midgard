import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {icon,ICON_ART} from '../src/icons.js';
import {composeBar,instrumentSamples,INSTRUMENTS,THEMES} from '../src/music.js';
import {GameAudio} from '../src/audio.js';

test('demolition refunds the full recipe once, including damaged structures',()=>{
 for(const type of Object.keys(G.PARTS)){
  const g=G.createGame(1);g.enemies=[];g.player.inv={};g.parts=[{id:90,type,...G.START,hp:1}];
  assert.ok(G.removePart(g,90));assert.deepEqual(g.player.inv,G.PARTS[type].cost);assert.equal(G.removePart(g,90),false);assert.deepEqual(g.player.inv,G.PARTS[type].cost);
 }
});
test('every item and building has a dedicated multicolor illustration',()=>{
 for(const name of [...Object.keys(G.ITEMS),...Object.keys(G.PARTS)]){
  assert.ok(Object.hasOwn(ICON_ART,name),name);const svg=icon(name);assert.ok(!svg.includes('currentColor'));const colors=new Set([...svg.matchAll(/#[a-fA-F0-9]{6}/g)].map(m=>m[0]));assert.ok(colors.size>=3,name);assert.ok(svg.includes('viewBox="0 0 48 48"'));
 }
});
test('each region has its own composition with simultaneous instrumental parts and rests',()=>{
 const scores=Object.keys(THEMES).map(region=>Array.from({length:16},(_,bar)=>composeBar(region,bar)));
 assert.notDeepEqual(scores[0],scores[1]);assert.notDeepEqual(scores[1],scores[2]);
 for(const score of scores){const instruments=new Set(score.flatMap(bar=>bar.events.map(e=>e.instrument)));assert.ok(instruments.size>=3);assert.ok(score.every(bar=>bar.events.filter(e=>e.at<.2).length>=3));assert.ok(score.every(bar=>bar.events.every(e=>e.at>=0&&e.at<4&&e.volume>0&&e.duration>0)));}
});
test('instrument samples have distinct spectra/envelopes, finite levels and smooth loop joins',()=>{
 const signatures=new Set();
 for(const name of Object.keys(INSTRUMENTS)){
  const data=instrumentSamples(name),again=instrumentSamples(name);assert.deepEqual(data,again);
  let sum=0;for(const v of data){assert.ok(Number.isFinite(v)&&Math.abs(v)<=.951);sum+=v*v;}assert.ok(sum/data.length>.0001);
  signatures.add(data.slice(2000,2020).join(','));assert.equal(data.at(-1),0);
  if(INSTRUMENTS[name].loop)assert.ok(Math.abs(data[22050*3-1]-data[22050])<.2,name);
  else {const rms=(a,b)=>Math.sqrt(data.slice(a,b).reduce((s,v)=>s+v*v,0)/(b-a));assert.ok(rms(0,22050)>rms(66000,88000)*3,name);}
 }assert.equal(signatures.size,5);
});
test('music plays sample voices, fades between themes and honors mute/background state',()=>{
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 let starts=0,oscillators=0;const sources=[];
 const node=()=>({connect(){},disconnect(){this.disconnected=true;},gain:param(),pan:param()});
 const context={currentTime:0,state:'running',createGain:node,createStereoPanner:node,createBuffer:(channels,length)=>({getChannelData:()=>new Float32Array(length)}),createBufferSource(){const source={...node(),playbackRate:param(),start(){starts++;},stop(t){this.end=t;}};sources.push(source);return source;},createOscillator(){oscillators++;},async suspend(){this.state='suspended';},async resume(){this.state='running';}};
 const audio=new GameAudio({music:true,effects:false}),g=G.createGame(1);g.enemies=[];Object.assign(audio,{context,music:node(),effects:node(),active:true,musicReady:true});
 audio.update(g,true);assert.ok(starts>0);assert.equal(oscillators,0);const first=audio.track;
 Object.assign(g.player,G.BOSSES[1]);context.currentTime=.5;audio.update(g,true);assert.equal(audio.musicRegion,'snow');assert.equal(first.gain.value,0);assert.notEqual(audio.track,first);
 audio.set('music',false);const count=starts;context.currentTime=1;audio.update(g,true);assert.equal(starts,count);assert.equal(audio.pending.length,0);
 audio.update(g,false);assert.equal(context.state,'suspended');audio.update(g,true);assert.equal(context.state,'running');
 for(const source of sources)source.onended();assert.equal(audio.voices,0);
});

test('background worker produces the complete transferable instrument bank', {timeout:10000}, async()=>{
 const {Worker}=await import('node:worker_threads');const {instrumentBank}=await import('../src/music.js');
 const module=new URL('../src/music-worker.js',import.meta.url).href;
 const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');global.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};import(workerData).then(()=>self.onmessage());`,{eval:true,workerData:module});
 try{const received=await new Promise((resolve,reject)=>{const keys=[];worker.on('error',reject);worker.on('message',data=>{if(data.ready)resolve(keys);else{if(!(data.samples instanceof Float32Array)||data.samples.length!==88200)return reject(Error('Invalid sample bank'));keys.push(data.name+data.root);}});});assert.deepEqual(received.sort(),instrumentBank().map(i=>i.name+i.root).sort());}finally{await worker.terminate();}
});
