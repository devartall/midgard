import {biomeAt} from './world.js';
// Original arranged score: eight-bar phrases, modal harmony, bowed pads,
// plucked strings, breathy flute and frame drums. All synthesis stays local.
export const SCORE=[62,69,65,64,62,57,60,64,65,72,69,67,65,62,64,57,62,65,69,74,72,69,65,64,60,64,67,69,65,64,62,57];
const CHORDS=[[50,57,62,65],[46,53,58,62],[53,60,65,69],[48,55,60,64],[50,57,62,69],[43,50,58,62],[46,53,60,65],[45,52,61,64]];
const hz=n=>440*2**((n-69)/12);
export class GameAudio {
 constructor(settings={music:true,effects:true}){this.settings={...settings};this.context=null;this.next=0;this.beat=0;this.voices=0;this.active=false;this.variation=0;this.ambientAt=0;}
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
    this.apply();
   }
   await this.context.resume();this.active=true;this.next=this.context.currentTime;return true;
  }catch{return false;}
 }
 apply(){if(!this.context)return;this.music.gain.setTargetAtTime(this.settings.music?.22:0,this.context.currentTime,.1);this.effects.gain.setTargetAtTime(this.settings.effects?.5:0,this.context.currentTime,.03);}
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
  source.buffer=this.noiseBuffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.008);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  source.connect(filter);filter.connect(gain);gain.connect(this.effects);source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();gain.disconnect();};source.start(when,(this.variation++%7)*.13);source.stop(when+duration);
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
  if(!this.active){this.context.resume().catch(()=>{});this.active=true;this.next=this.context.currentTime;}
  for(const event of events){const dx=event.x-g.player.x,dy=event.y-g.player.y,d=Math.sqrt(dx*dx+dx*dy+dy*dy);if(d<22)this.play(event.type,Math.max(.05,1-d/22));}
  if(this.settings.effects&&this.context.currentTime>=this.ambientAt){const region=biomeAt(g.player.x,g.player.y);if(region==='snow')this.noise(1.8,550,.09);else if(region==='fire'){this.noise(.7,170,.12);this.noise(.14,1900,.15,this.context.currentTime+.4);}else this.noise(1.2,1000,.035);this.ambientAt=this.context.currentTime+3.5;}
  if(!this.settings.music){this.next=this.context.currentTime;return;}
  const danger=g.enemies.some(e=>e.type==='boss'&&!e.dead&&Math.hypot(e.x-g.player.x,e.y-g.player.y)<17),biome=biomeAt(g.player.x,g.player.y);
  const c=this.context,step=danger?.25:biome==='snow'?.57:biome==='fire'?.4:.48;
  if(this.next<c.currentTime)this.next=c.currentTime;
  while(this.next<c.currentTime+.15){
   const b=this.beat,bar=Math.floor(b/8),section=Math.floor(bar/8)%4,chord=CHORDS[bar%8],transpose=biome==='snow'?5:biome==='fire'?-5:0,time=this.next;
   const instrument=(note,duration,volume,type='triangle',delay=0,attack=.012,pan=0)=>{const f=hz(note+transpose);this.tone(f,f*.999,duration,type,this.music,volume,time+delay,attack,pan);};
   // Slow harmonic bed; staggered attack and stereo voicing avoid a flat organ chord.
   if(b%8===0){for(let i=0;i<4;i++)instrument(chord[i],step*8+.4,.065,'sine',i*.025,.4,(i-1.5)*.35);instrument(chord[0]-12,step*6,.16,'triangle',0,.1);}
   const arpeggio=[0,2,1,3,2,1,3,2][b%8];
   if(section!==3||b%2===0){instrument(chord[arpeggio]+12,1.15,.16,'triangle',0,.008,b%2?.4:-.4);instrument(chord[arpeggio]+24,.38,.025,'sine',.007,.006);}
   // A melody enters after the opening, then leaves space for the environment.
   if(section===1||section===2||danger){if(b%2===0){const note=SCORE[(Math.floor(b/2)+section*8)%32];instrument(note+12,step*2.5,.13,'sine',.015,.1,-.15);instrument(note+24,step*1.8,.018,'sine',.03,.12,.15);}}
   if(b%4===0&&(section!==0||danger||biome==='fire')){this.tone(90,30,.45,'sine',this.music,.3,time);this.tone(165,80,.15,'triangle',this.music,.035,time+.007);}
   if(danger&&b%4===2)this.tone(150,65,.18,'triangle',this.music,.12,time);
   this.beat++;this.next+=step;
  }
 }
}
