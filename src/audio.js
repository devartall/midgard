import {biomeAt} from './world.js';
import {composeBar,INSTRUMENTS,instrumentSamples,instrumentBank} from './music.js';
const hz=n=>440*2**((n-69)/12);
export function audioSettings(value={}){const v=value&&typeof value==='object'?value:{};const volume=(key,fallback)=>typeof v[key]==='number'&&Number.isFinite(v[key])?Math.max(0,Math.min(1,v[key])):fallback;return {music:v.music!==false,effects:v.effects!==false,musicVolume:volume('musicVolume',.8),effectsVolume:volume('effectsVolume',.8)};}
export class GameAudio {
 constructor(settings={music:true,effects:true}){this.settings=audioSettings(settings);this.context=null;this.next=0;this.beat=0;this.voices=0;this.active=false;this.variation=0;this.ambientAt=0;this.bank=new Map();this.musicRegion=null;this.bar=0;this.pending=[];this.musicReady=false;this.retiredTracks=[];}
 async unlock(){
  const Type=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Type)return false;
  try{
   if(!this.context){
    const c=this.context=new Type();this.music=c.createGain();this.effects=c.createGain();
    const master=c.createDynamicsCompressor?.()||c.createGain();master.connect(c.destination);
    this.music.connect(master);this.effects.connect(master);
    if(c.createConvolver){
     const reverb=c.createConvolver(),wet=c.createGain(),length=Math.floor(c.sampleRate*2.8),impulse=c.createBuffer(2,length,c.sampleRate);
     for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);let smooth=0;for(let i=0;i<length;i++){smooth=smooth*.65+(Math.random()*2-1)*.35;data[i]=smooth*(1-i/length)**2.6;}}
     reverb.buffer=impulse;wet.gain.value=.32;this.music.connect(reverb);reverb.connect(wet);wet.connect(master);
     if(c.createPeriodicWave){const real=new Float32Array(13),imag=new Float32Array(13);for(let n=1;n<13;n++)imag[n]=(n%2?1:.4)/n**1.7;this.strings=c.createPeriodicWave(real,imag);}
     const noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=noise.getChannelData(0);let brown=0;
     for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.12)/1.03;data[i]=brown;}this.noiseBuffer=noise;
    }
    this.apply();this.prepareBank();
   }
   await this.context.resume();this.active=true;this.next=this.context.currentTime;return true;
  }catch{return false;}
 }
 prepareBank(){
  const c=this.context;if(!c.createBuffer){this.musicReady=true;return;}
  const receive=({name,root,samples})=>{const buffer=c.createBuffer(1,samples.length,22050);buffer.getChannelData(0).set(samples);this.bank.set(name+root,buffer);};
  const fallback=()=>{const queue=instrumentBank();const next=()=>{const item=queue.shift();if(!item){this.musicReady=true;return;}receive({...item,samples:instrumentSamples(item.name,22050,item.root)});setTimeout(next,10);};next();};
  if(typeof Worker==='undefined'){fallback();return;}
  try{const worker=new Worker(new URL('./music-worker.js',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{if(data.ready){this.musicReady=true;worker.terminate();}else receive(data);};
   worker.onerror=()=>{worker.terminate();fallback();};worker.postMessage('prepare');
  }catch{fallback();}
 }
 apply(){if(!this.context)return;this.music.gain.setTargetAtTime(this.settings.music?.32*this.settings.musicVolume**1.5:0,this.context.currentTime,.1);this.effects.gain.setTargetAtTime(this.settings.effects?.5*this.settings.effectsVolume**1.5:0,this.context.currentTime,.03);}
 setVolume(channel,value){if(!['music','effects'].includes(channel)||!Number.isFinite(value))return;this.settings[channel+'Volume']=Math.max(0,Math.min(1,value));this.apply();}
 set(channel,on){this.settings[channel]=!!on;this.apply();}
 tone(freq,end,duration,type,bus,volume=.3,when=this.context.currentTime,attack=.012,pan=0){
  if(this.voices>=40)return;
  const c=this.context,osc=c.createOscillator(),gain=c.createGain(),stereo=c.createStereoPanner?.();this.voices++;
  osc.type=type;if(type==='triangle'&&bus===this.music&&this.strings)osc.setPeriodicWave(this.strings);osc.frequency.setValueAtTime(freq,when);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+Math.min(duration*.4,attack));gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  osc.connect(gain);if(stereo){stereo.pan.value=pan;gain.connect(stereo);stereo.connect(bus);}else gain.connect(bus);
  osc.onended=()=>{this.voices--;osc.disconnect();gain.disconnect();stereo?.disconnect();};osc.start(when);osc.stop(when+duration+.03);
 }
 noise(duration,frequency,volume,when=this.context.currentTime){
  if(!this.noiseBuffer||this.voices>=40)return;
  const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();this.voices++;
  source.buffer=this.noiseBuffer;source.loop=true;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.008);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  source.connect(filter);filter.connect(gain);gain.connect(this.effects);source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();gain.disconnect();};source.start(when,(this.variation++%7)*.13);source.stop(when+duration);
 }
 instrument(event){
  const c=this.context,{instrument:name,pitch,duration,volume,pan}=event,when=Math.max(c.currentTime+.005,event.when);
  if(this.voices>=40)return;
  if(!c.createBufferSource||!c.createBuffer){this.tone(hz(pitch),hz(pitch),duration,'sine',this.music,volume,when,.08,pan);return;}
  const root=['drum','shaker'].includes(name)?48:Math.round(pitch/12)*12,key=name+root;let buffer=this.bank.get(key);
  if(!buffer){const samples=instrumentSamples(name,22050,root);buffer=c.createBuffer(1,samples.length,22050);buffer.getChannelData(0).set(samples);this.bank.set(key,buffer);}
  const amplitude=volume*({lyre:1.4,bowed:.8,flute:.8,horn:1,drum:1.2,cello:.85,dulcimer:1,bell:.7,shaker:.8}[name]);
  const source=c.createBufferSource(),gain=c.createGain(),stereo=c.createStereoPanner?.(),rate=2**((pitch-root)/12);this.voices++;
  source.buffer=buffer;source.playbackRate.value=rate;source.loop=INSTRUMENTS[name].loop;if(source.loop){source.loopStart=1;source.loopEnd=3;}
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(amplitude,when+(source.loop?.12:.008));
  gain.gain.setValueAtTime(amplitude,when+Math.max(.15,duration-.25));gain.gain.exponentialRampToValueAtTime(.0001,when+duration+.3);
  source.connect(gain);if(stereo){stereo.pan.value=pan;gain.connect(stereo);stereo.connect(this.track||this.music);}else gain.connect(this.track||this.music);
  source.onended=()=>{this.voices--;source.disconnect();gain.disconnect();stereo?.disconnect();};source.start(when);source.stop(when+duration+.35);
 }
 play(type,volume=1){
  if(!this.context||!this.active||!this.settings.effects)return;
  const t=this.context.currentTime,v=Math.min(1,volume),pitch=.95+(this.variation++%11)*.01;
  const tone=(a,b,d,w='sine',amp=.2,delay=0)=>this.tone(a*pitch,b*pitch,d,w,this.effects,amp*v,t+delay);
  const noise=(d,f,a=.5,delay=0)=>this.noise(d,f,a*v,t+delay);
  if(type==='step'){noise(.11,650,.23);tone(90,42,.08,'sine',.1);}
  else if(['swing','bow','cast'].includes(type)){noise(type==='cast'?.6:.22,1300,.6);if(type==='bow')tone(370,105,.28,'triangle',.16);if(type==='cast')for(let i=0;i<3;i++)tone(220*(i+1),440*(i+1),.6,'sine',.08,i*.05);}
  else if(['wood','build','door','eat'].includes(type)){noise(.15,450,.7);tone(155,65,.18,'triangle',.25);if(type==='build'||type==='door'){noise(.3,210,.3,.07);tone(240,100,.12,'sine',.12,.08);}}
  else if(['stone','block','equip'].includes(type)){noise(.09,2400,.45);for(let i=0;i<3;i++)tone([740,1193,1831][i],[730,1180,1810][i],.45-i*.09,'sine',.14/(i+1));}
  else if(['impact','hurt','enemy','slam'].includes(type)){noise(type==='slam'?.7:.24,300,.8);tone(type==='slam'?75:135,30,type==='slam'?.85:.25,'sine',.4);noise(.1,1100,.4);}
  else if(['gather','craft','potion','respawn'].includes(type)){const notes=type==='potion'?[62,65,69,74]:[62,69,74];notes.forEach((n,i)=>tone(hz(n),hz(n)*.999,.5,'triangle',.14,i*.065));if(type==='potion')noise(.5,1800,.18);}
  else if(['warning','raid','death'].includes(type)){tone(73,55,1.1,'triangle',.22);tone(110,82,1.2,'sine',.17,.08);noise(.6,180,.3);}
  else tone(540,510,.08,'sine',.08);
 }
 update(g,active){
  const events=g.sounds?.splice(0)||[];if(!this.context)return;
  if(!active){if(this.active){this.context.suspend().catch(()=>{});this.active=false;}return;}
  if(!this.active){this.context.resume().catch(()=>{});this.active=true;this.next=this.context.currentTime;this.pending=[];}
  for(const event of events){const dx=event.x-g.player.x,dy=event.y-g.player.y,d=Math.sqrt(dx*dx+dx*dy+dy*dy);if(d<22)this.play(event.type,Math.max(.05,1-d/22));}
  if(this.settings.effects&&this.context.currentTime>=this.ambientAt){const region=biomeAt(g.player.x,g.player.y);if(region==='snow')this.noise(1.8,550,.09);else if(region==='fire'){this.noise(.7,170,.12);this.noise(.14,1900,.15,this.context.currentTime+.4);}else this.noise(1.2,1000,.035);this.ambientAt=this.context.currentTime+3.5;}
  if(!this.settings.music||!this.musicReady){this.next=this.context.currentTime;this.pending=[];return;}
  const danger=g.enemies.some(e=>e.type==='boss'&&!e.dead&&Math.hypot(e.x-g.player.x,e.y-g.player.y)<17),biome=biomeAt(g.player.x,g.player.y),c=this.context;
  for(const retired of this.retiredTracks)if(c.currentTime>retired.until)retired.bus.disconnect();this.retiredTracks=this.retiredTracks.filter(t=>c.currentTime<=t.until);
  if(biome!==this.musicRegion){
   if(this.track){this.track.gain.setTargetAtTime(0,c.currentTime,.18);this.retiredTracks.push({bus:this.track,until:c.currentTime+10});}
   this.track=c.createGain();this.track.gain.setValueAtTime(.0001,c.currentTime);this.track.gain.setTargetAtTime(1,c.currentTime,.4);this.track.connect(this.music);
   this.musicRegion=biome;this.bar=0;this.pending=[];this.next=c.currentTime+.08;
  }
  if(this.next<c.currentTime-.5){this.pending=[];this.next=c.currentTime+.05;}
  if(this.next<c.currentTime+.2){
   const score=composeBar(biome,this.bar++,danger),start=this.next;
   this.pending.push(...score.events.map(event=>({...event,when:start+event.at*score.secondsPerBeat,duration:event.duration*score.secondsPerBeat})));
   this.pending.sort((a,b)=>a.when-b.when);this.next+=score.secondsPerBeat*4;
  }
  while(this.pending.length&&this.pending[0].when<c.currentTime+.2){const event=this.pending.shift();this.instrument(event);}

 }
}
