// Original modal chamber pieces; each land has its own melody, harmony and rhythm.
export const THEMES={
 forest:{name:'Под сенью Иггдрасиля',bpm:76,chords:[[50,57,62,65],[48,55,60,64],[43,50,59,62],[50,57,62,65]],melody:[[69,67,65,62],[64,67,72,67],[71,69,67,62],[65,64,62,null]],lead:'flute'},
 snow:{name:'Дыхание Йотунхейма',bpm:58,chords:[[40,47,54,59],[43,50,55,59],[38,45,54,57],[40,47,52,59]],melody:[[76,null,74,71],[74,71,null,67],[69,null,66,69],[71,74,71,null]],lead:'bowed'},
 fire:{name:'Кузни Муспельхейма',bpm:92,chords:[[45,52,57,60],[46,53,58,62],[43,50,55,58],[45,52,57,60]],melody:[[57,58,60,57],[58,null,62,60],[58,55,58,null],[60,58,57,null]],lead:'horn'}
};
export function composeBar(region,bar,danger=false){
 const theme=THEMES[region]||THEMES.forest,chord=theme.chords[bar%4],phrase=Math.floor(bar/4)%4,events=[];
 const note=(instrument,pitch,at,duration,volume,pan)=>{if(pitch!==null)events.push({instrument,pitch,at,duration,volume,pan});};
 // Bass and softly bowed fifths provide a common acoustic space.
 note('bowed',chord[0],0,3.9,.17,-.22);note('bowed',chord[1],.06,3.7,.09,.28);
 if(region!=='fire')note('bowed',chord[3],.12,3.5,.065,.08);
 const pattern=region==='snow'?[0,2.5]:region==='fire'?[0,.75,1.5,2.75]:[0,1.5,2,3.5];
 pattern.forEach((at,i)=>note('lyre',chord[1+i%3]+12,at,2,.19*(i%2?.8:1),i%2?.38:-.4));
 // Phrases alternate full melody and responses; rests are part of the score.
 const melody=theme.melody[bar%4];
 if(phrase!==3)melody.forEach((pitch,i)=>{if(phrase===2&&i%2)return;note(theme.lead,pitch,i,region==='snow'?1.65:.85,region==='fire'?.18:.14,-.08);});
 else note(region==='snow'?'flute':'horn',chord[2],1,2.5,.11,.1);
 if(region==='forest'&&bar%4===3)note('horn',chord[0]+12,2,1.8,.075,.2);
 if(region==='fire'||danger||region==='forest'&&phrase%2){
  const beats=region==='fire'?[0,1.5,2,3.25]:[0,2.5];
  beats.forEach((at,i)=>note('drum',48,at,.7,i===0?.32:.17,i%2?.12:-.12));
  if(danger)note('drum',53,3.5,.5,.2,.1);
 }
 return {name:theme.name,secondsPerBeat:60/(theme.bpm+(danger?14:0)),events};
}
export const INSTRUMENTS={lyre:{root:60,loop:false},bowed:{root:48,loop:true},flute:{root:72,loop:true},horn:{root:48,loop:true},drum:{root:48,loop:false}};
// Small locally synthesized sample bank. Plucked string uses a damped delay
// loop; sustained instruments use different spectra, breath/bow noise and vibrato.
export function instrumentSamples(name,sampleRate=22050,root=INSTRUMENTS[name].root){
 const spec=INSTRUMENTS[name],length=sampleRate*4,data=new Float32Array(length),f=440*2**((root-69)/12);
 let seed=1701,noise=0,phase=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const delay=new Float32Array(Math.round(sampleRate/f));for(let i=0;i<delay.length;i++)delay[i]=random()*.3+Math.sin(i/delay.length*Math.PI*2)*.5+Math.sin(i/delay.length*Math.PI*4)*.15;
 for(let i=0;i<length;i++){
  const t=i/sampleRate;noise=noise*.72+random()*.28;let value=0;
  if(name==='lyre'){
   const k=i%delay.length,v=delay[k];delay[k]=(v+delay[(k+1)%delay.length])*.4975;
   value=v*.7+Math.sin(t*2*Math.PI*220)*Math.exp(-t*13)*.08+noise*Math.exp(-t*30)*.06;
   value*=Math.min(1,t/.004);
  }else if(name==='drum'){
   value=Math.sin(2*Math.PI*(78*t+1.3*(1-Math.exp(-t*25))))*Math.exp(-t*6)*.6;
   value+=Math.sin(t*2*Math.PI*126)*Math.exp(-t*9)*.22+Math.sin(t*2*Math.PI*171)*Math.exp(-t*12)*.12+noise*Math.exp(-t*45)*.5;
  }else{
   const vibrato=Math.sin(t*2*Math.PI*(name==='horn'?4.5:5.4))*.003*Math.min(1,t*2);phase+=2*Math.PI*f*(1+vibrato)/sampleRate;
   if(name==='flute')value=Math.sin(phase)*.65+Math.sin(phase*2)*.13+Math.sin(phase*3)*.035+noise*.085;
   else if(name==='bowed'){for(let h=1;h<=9;h++)value+=Math.sin(phase*h+.12*Math.sin(t*3+h))*(h===3?.23:.42/h**1.3);value+=noise*.065;}
   else {for(let h=1;h<=7;h++)value+=Math.sin(phase*h)*(.45/h**1.6)*(1+Math.sin(t*1.7)*.06);value+=noise*.025;}
   value*=Math.min(1,t/(name==='bowed'?.3:name==='horn'?.2:.08));
  }
  data[i]=Math.max(-.95,Math.min(.95,value));
 }
 if(spec.loop){const end=sampleRate*3,fade=Math.floor(sampleRate*.08),start=sampleRate;for(let i=0;i<fade;i++){const mix=i/(fade-1);data[end-fade+i]=data[end-fade+i]*(1-mix)+data[start-fade+i]*mix;}}
 // Every one-shot ends at zero, including low-energy resonance tails.
 for(let i=0;i<256;i++)data[length-1-i]*=i/256;
 return data;
}
export function instrumentBank(){
 const keys=new Map();
 for(const region of Object.keys(THEMES))for(let bar=0;bar<16;bar++)for(const e of composeBar(region,bar,true).events){const root=e.instrument==='drum'?48:Math.round(e.pitch/12)*12;keys.set(e.instrument+root,{name:e.instrument,root});}
 return [...keys.values()];
}
