// Original 36-bar modal chamber suites. Pitches, rests and note lengths are
// scored explicitly; orchestration enters and recedes over a complete phrase.
export const THEMES={
 forest:{name:'Под сенью Иггдрасиля',bpm:72,lead:'flute',chords:[[50,57,62,65],[48,55,60,64],[43,50,59,62],[50,57,62,65],[53,60,65,69],[48,55,64,67],[43,50,59,65],[50,57,62,65]],
 a:[[[62,0,1],[65,1,1.5],[67,2.5,.5],[69,3,.8]],[[67,0,2],[64,2,1],[62,3,.7]],[[59,.5,.5],[62,1,1],[67,2,1.8]],[[65,0,1.5],[64,1.5,.5],[62,2,1.7]],[[65,0,.5],[69,.5,1.5],[72,2,1],[69,3,.8]],[[67,0,1.5],[64,1.5,.5],[60,2,1.7]],[[62,0,1],[65,1,.5],[67,1.5,1.5],[64,3,.7]],[[62,0,2.8]]],
 b:[[[74,0,1.5],[72,1.5,.5],[69,2,1.8]],[[72,.5,1],[67,1.5,1],[64,3,.8]],[[71,0,1],[69,1,.5],[67,1.5,1.5],[62,3,.7]],[[69,0,2],[65,2,1.7]],[[72,0,.75],[74,.75,.75],[77,1.5,1.5],[74,3,.8]],[[72,0,1],[67,1,2],[64,3,.7]],[[67,0,1.5],[65,1.5,.5],[64,2,1]],[[65,0,1],[62,1,2.5]]]},
 snow:{name:'Дыхание Йотунхейма',bpm:56,lead:'bowed',chords:[[40,47,54,59],[43,50,55,59],[38,45,54,57],[40,47,52,59],[48,55,59,64],[43,50,55,62],[38,45,54,57],[40,47,52,59]],
 a:[[[71,0,2.5],[74,3,.8]],[[71,0,1.5],[67,2,1.7]],[[69,.5,2],[66,3,.7]],[[64,0,3]],[[67,0,1],[71,1,2.5]],[[74,0,2],[71,2.5,1]],[[69,0,1.5],[66,2,1.7]],[[64,0,2.8]]],
 b:[[[76,0,2],[78,2.5,1]],[[79,0,1.5],[74,2,1.8]],[[78,0,1],[76,1,1],[74,2,1.5]],[[71,0,3]],[[76,.5,1.5],[79,2,1.7]],[[74,0,2],[71,2,1]],[[69,0,1.5],[66,1.5,.5],[62,2,1.7]],[[64,0,3]]]},
 fire:{name:'Кузни Муспельхейма',bpm:88,lead:'horn',chords:[[45,52,57,60],[46,53,58,62],[43,50,55,58],[45,52,57,60],[41,48,53,57],[46,53,58,62],[43,50,55,58],[45,52,57,60]],
 a:[[[57,0,.75],[58,.75,.5],[60,1.5,1],[57,3,.75]],[[58,0,1.5],[62,2,1],[60,3,.6]],[[58,.5,.75],[55,1.5,1.5]],[[57,0,2.5]],[[60,0,.5],[65,.75,1],[64,2,1],[60,3,.7]],[[62,0,1.5],[58,2,1.7]],[[55,0,.75],[58,1,.75],[62,2,1]],[[60,0,1],[58,1.5,.5],[57,2,1.7]]],
 b:[[[69,0,1.5],[72,2,.75],[69,3,.75]],[[70,0,.75],[74,1,1.5],[70,3,.7]],[[67,0,1],[70,1.5,1],[67,3,.6]],[[64,0,2],[60,2.5,1]],[[65,0,1],[69,1,1],[72,2.5,1]],[[74,0,1.5],[70,2,.75],[65,3,.7]],[[67,0,.75],[62,1,1],[58,2.5,1]],[[60,0,1],[57,1.5,2]]]}
};
export const SCORE_BARS=36;
export function composeBar(region,bar,danger=false){
 region=Object.hasOwn(THEMES,region)?region:'forest';
 const theme=THEMES[region],position=((bar%SCORE_BARS)+SCORE_BARS)%SCORE_BARS;
 const section=position<4?'intro':position<12?'theme':position<20?'answer':position<24?'bridge':position<32?'reprise':'coda';
 const index=position<4?position:position<20?(position-4)%8:position<24?position-20:position<32?position-24:position-32;
 const chord=theme.chords[index],events=[],quiet=['intro','bridge','coda'].includes(section);
 const arc=[.78,.86,.92,.8,.94,1,.88,.66][index],level=quiet?.68:section==='reprise'?1: .88;
 const note=(instrument,pitch,at,duration,volume,pan=0)=>events.push({instrument,pitch,at,duration,volume:volume*level*arc,pan});
 note('cello',chord[0],0,3.85,.19,-.18);
 if(!quiet){note('bowed',chord[1],.04,3.7,.07,.28);if(index%2===0)note('bowed',chord[3],.08,3.6,.05,-.32);}
 const pattern=quiet?[.5,2.5]:region==='snow'?[.25,2,3.25]:index%2?[.25,1.75,3]:[0,.75,2,2.75];
 pattern.forEach((at,i)=>note('lyre',chord[1+(i+index)%3]+12,at,1.8,.19*(i%2?.75:1),i%2?.38:-.38));
 if(!quiet){
  const melody=theme[section==='answer'?'b':'a'][index];
  melody.forEach(([pitch,at,duration],i)=>note(theme.lead,pitch,at,duration*.94,.19*(i===0?1:.9),-.06));
  // A short plucked answer occupies the gap after the sung phrase.
  if(index===3||index===7)note('dulcimer',chord[2]+12,3.25,.7,.16,.35);
  if(section==='reprise'&&index%2===0)note('horn',chord[2],2.5,1.25,.075,.22);
 }else if(section==='bridge'){
  note('flute',theme.b[index][0][0]-12,.5,2.5,.16,.1);
  note('dulcimer',chord[3]+12,3,1,.13,-.3);
 }else if(index%2===0)note('bell',chord[2]+12,1,2.8,.11,.25);
 if(section==='answer'||section==='reprise'){
  if(region==='snow'){if(index%2===0)note('bell',chord[3]+12,2.75,2,.07,.4);}
  else {for(const at of [0,1.5,3])note('drum',48,at,.65,at===0?.25:.12,-.12);for(const at of [.5,1.5,2.5,3.5])note('shaker',48,at,.25,.075,.3);}
 }else if(region==='fire'&&!quiet){note('drum',48,0,.8,.23);note('drum',48,2.5,.5,.12,.1);}
 if(danger){note('drum',48,0,.7,.2);note('drum',48,2,.7,.15);}
 return {name:theme.name,section,secondsPerBeat:60/theme.bpm,events};
}
export const INSTRUMENTS={lyre:{root:60,loop:false},bowed:{root:48,loop:true},flute:{root:72,loop:true},horn:{root:48,loop:true},drum:{root:48,loop:false},cello:{root:48,loop:true},dulcimer:{root:60,loop:false},bell:{root:72,loop:false},shaker:{root:48,loop:false}};
// Small locally synthesized sample bank. Plucked string uses a damped delay
// loop; sustained instruments use different spectra, breath/bow noise and vibrato.
export function instrumentSamples(name,sampleRate=22050,root=INSTRUMENTS[name].root){
 const spec=INSTRUMENTS[name],length=sampleRate*4,data=new Float32Array(length),f=440*2**((root-69)/12);
 let seed=1701,noise=0,phase=0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const delay=new Float32Array(Math.round(sampleRate/f));for(let i=0;i<delay.length;i++)delay[i]=random()*.3+Math.sin(i/delay.length*Math.PI*2)*.5+Math.sin(i/delay.length*Math.PI*4)*.15;
 const ratios=name==='bell'?[1,2.01,2.76,4.07,5.43]:[1,2.002,3.008,4.016,5.025];
 for(let i=0;i<length;i++){
  const t=i/sampleRate;noise=noise*.72+random()*.28;let value=0;
  if(name==='lyre'){
   const k=i%delay.length,v=delay[k];delay[k]=(v+delay[(k+1)%delay.length])*.4975;
   value=v*.7+Math.sin(t*2*Math.PI*220)*Math.exp(-t*13)*.08+noise*Math.exp(-t*30)*.06;
   value*=Math.min(1,t/.004);
   }else if(name==='dulcimer'||name==='bell'){
   ratios.forEach((ratio,h)=>{value+=Math.sin(2*Math.PI*f*ratio*t)*(.5/(h+1))*Math.exp(-t*(name==='bell'?1.5:2.1)*(1+h*.3));});
   value*=Math.min(1,t/.003);
  }else if(name==='shaker'){
   value=noise*Math.exp(-t*18)*Math.sin(Math.min(1,t/.015)*Math.PI/2)*1.8;
  }else if(name==='drum'){
   value=Math.sin(2*Math.PI*(78*t+1.3*(1-Math.exp(-t*25))))*Math.exp(-t*6)*.6;
   value+=Math.sin(t*2*Math.PI*126)*Math.exp(-t*9)*.22+Math.sin(t*2*Math.PI*171)*Math.exp(-t*12)*.12+noise*Math.exp(-t*45)*.5;
  }else{
   const vibrato=Math.sin(t*2*Math.PI*(name==='horn'?4.5:5.4))*.003*Math.min(1,t*2);phase+=2*Math.PI*f*(1+vibrato)/sampleRate;
   if(name==='flute')value=Math.sin(phase)*.65+Math.sin(phase*2)*.13+Math.sin(phase*3)*.035+noise*.085;
   else if(name==='cello'){for(let h=1;h<=7;h++)value+=Math.sin(phase*h+.018*Math.sin(t*7))*(.55/h**1.8);value+=noise*.018;}
   else if(name==='bowed'){for(let h=1;h<=9;h++)value+=Math.sin(phase*h+.12*Math.sin(t*3+h))*(h===3?.23:.42/h**1.3);value+=noise*.065;}
   else {for(let h=1;h<=7;h++)value+=Math.sin(phase*h)*(.45/h**1.6)*(1+Math.sin(t*1.7)*.06);value+=noise*.025;}
   value*=Math.min(1,t/(['bowed','cello'].includes(name)?.3:name==='horn'?.2:.08));
  }
  data[i]=Math.max(-.95,Math.min(.95,value));
 }
 if(spec.loop){const end=sampleRate*3,fade=Math.floor(sampleRate*.08),start=sampleRate;for(let i=0;i<fade;i++){const mix=i/(fade-1);data[end-fade+i]=data[end-fade+i]*(1-mix)+data[start-fade+i]*mix;}}
 // Every one-shot ends at zero, including low-energy resonance tails.
 for(let i=0;i<256;i++)data[length-1-i]*=i/256;
 data[length-1]=0;return data;
}
export function instrumentBank(){
 const keys=new Map();
 for(const region of Object.keys(THEMES))for(let bar=0;bar<SCORE_BARS;bar++)for(const e of composeBar(region,bar,true).events){const root=['drum','shaker'].includes(e.instrument)?48:Math.round(e.pitch/12)*12;keys.set(e.instrument+root,{name:e.instrument,root});}
 return [...keys.values()];
}
