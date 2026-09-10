// Original procedural score: D minor / Dorian plucked strings, drone and frame drum.
// Web Audio only. No recordings, downloads, timers or playback before a user gesture.
export const SCORE=[62,69,65,64,62,57,60,64,65,72,69,67,65,62,64,57,62,65,69,74,72,69,65,64,60,64,67,69,65,64,62,57];
const FX={swing:[170,65,.16,'triangle'],bow:[420,80,.2,'triangle'],impact:[110,42,.15,'square'],wood:[180,55,.12,'triangle'],stone:[1100,320,.16,'sine'],gather:[520,850,.13,'sine'],craft:[440,880,.25,'triangle'],build:[150,65,.22,'triangle'],eat:[240,90,.13,'triangle'],potion:[450,950,.45,'sine'],equip:[620,240,.12,'triangle'],door:[130,70,.28,'sawtooth'],block:[900,430,.18,'sine'],hurt:[120,55,.23,'sawtooth'],enemy:[190,45,.24,'triangle'],warning:[65,90,.55,'sawtooth'],cast:[180,600,.45,'triangle'],slam:[80,25,.65,'sine'],raid:[130,65,1,'sawtooth'],death:[150,35,1.2,'triangle'],respawn:[220,660,.8,'sine'],ui:[620,700,.06,'sine'],step:[90,55,.05,'triangle']};
export class GameAudio {
 constructor(settings={music:true,effects:true}){this.settings={...settings};this.context=null;this.next=0;this.beat=0;this.voices=0;this.active=false;}
 async unlock(){
  const Type=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Type)return false;
  try{
   if(!this.context){this.context=new Type();this.music=this.context.createGain();this.effects=this.context.createGain();this.music.connect(this.context.destination);this.effects.connect(this.context.destination);this.apply();}
   await this.context.resume();this.active=true;this.next=this.context.currentTime;return true;
  }catch{return false;}
 }
 apply(){if(!this.context)return;this.music.gain.setTargetAtTime(this.settings.music?.13:0,this.context.currentTime,.05);this.effects.gain.setTargetAtTime(this.settings.effects?.32:0,this.context.currentTime,.03);}
 set(channel,on){this.settings[channel]=!!on;this.apply();}
 tone(freq,end,duration,type,bus,volume=.3,when=this.context.currentTime){
  if(this.voices>=40)return;
  const c=this.context,osc=c.createOscillator(),gain=c.createGain();this.voices++;
  osc.type=type;osc.frequency.setValueAtTime(freq,when);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);
  gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.012);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  osc.connect(gain);gain.connect(bus);osc.onended=()=>{this.voices--;osc.disconnect();gain.disconnect();};osc.start(when);osc.stop(when+duration+.03);
 }
 play(type,volume=1){if(!this.context||!this.active||!this.settings.effects)return;const f=FX[type]||FX.ui;this.tone(...f,this.effects,Math.min(.5,.28*volume));}
 update(g,active){
  const events=g.sounds?.splice(0)||[];
  if(!this.context)return;
  if(!active){if(this.active){this.context.suspend().catch(()=>{});this.active=false;}return;}
  if(!this.active){this.context.resume().catch(()=>{});this.active=true;this.next=this.context.currentTime;}
  for(const event of events){const dx=event.x-g.player.x,dy=event.y-g.player.y,d=Math.sqrt(dx*dx+dx*dy+dy*dy);if(d<22)this.play(event.type,Math.max(.08,1-d/22));}
  if(!this.settings.music){this.next=this.context.currentTime;return;}
  const boss=g.enemies.find(e=>e.type==='boss'&&!e.dead),danger=boss&&Math.hypot(boss.x-g.player.x,boss.y-g.player.y)<17;
  const c=this.context,step=danger?.28:.52;
  if(this.next<c.currentTime)this.next=c.currentTime;
  while(this.next<c.currentTime+.15){
   const note=SCORE[this.beat%SCORE.length]+(danger?-12:0),frequency=440*2**((note-69)/12);
   this.tone(frequency,frequency*.998,.65,'triangle',this.music,.35,this.next);
   if(this.beat%8===0){this.tone(73.42,73.42,step*8,'sine',this.music,.25,this.next);this.tone(110,110,step*8,'sine',this.music,.12,this.next);}
   if(this.beat%4===0||(danger&&this.beat%2===0))this.tone(100,32,.24,'sine',this.music,.55,this.next);
   if(this.beat%8===6)this.tone(frequency*2,frequency*2,.8,'sine',this.music,.08,this.next);
   this.beat++;this.next+=step;
  }
 }
}
