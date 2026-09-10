import {hexRound,metric,toPlane} from './hex.js';
export const SIZE=196,START={x:12,y:43},BOSS_POS={x:78,y:27};
export const BOSSES=[{...BOSS_POS,biome:'forest',name:'Йотун корней'},{x:143,y:25,biome:'snow',name:'Хрим — ледяной великан'},{x:142,y:122,biome:'fire',name:'Сурт — хранитель пламени'}];
export function biomeAt(x,y){
 const p=toPlane(x-48,y-48),a=Math.atan2(p.y,p.x),r=45+2*Math.sin(a*3)+1.5*Math.sin(a*7+.8);
 if(Math.hypot(p.x,p.y)<=r||metric({x,y},START)<6)return 'forest';
 return y<75?'snow':'fire';
}
export const BIOME_NAMES={forest:'Мидгард · лес',snow:'Йотунхейм · снега',fire:'Муспельхейм · пламя'};
export const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
export const CAMPS=[
 {x:24,y:31,name:'Волчья лощина',type:'wolf'}, {x:39,y:39,name:'Курган драугров',type:'draugr'},
 {x:43,y:21,name:'Стражи корней',type:'draugr'}, {x:22,y:57,name:'Тихая чаща',type:'wolf'},
 {x:45,y:66,name:'Старый курган',type:'draugr'}, {x:61,y:49,name:'Каменный дозор',type:'breaker'},
 {x:65,y:20,name:'Северная тропа',type:'wolf'}, {x:76,y:47,name:'Волчий берег',type:'wolf'},
 {x:57,y:76,name:'Забытый круг',type:'draugr'}, {x:37,y:79,name:'Дальние ели',type:'wolf'},
];
CAMPS.push(...[{x:107,y:40,type:'wolf'},{x:122,y:20,type:'draugr'},{x:145,y:48,type:'breaker'},{x:130,y:86,type:'draugr'},{x:111,y:113,type:'breaker'},{x:151,y:104,type:'wolf'}].map(c=>({...c,name:biomeAt(c.x,c.y)==='snow'?'Морозный дозор':'Пепельный дозор'})));
export function isTrail(x,y){return (x<46&&Math.abs(y-(53-x*.8))<1.4)||(x>=43&&x<=80&&Math.abs(y-(18+(x-44)*9/34))<1.4);}
export function terrainBase(x,y){
 ({x,y}=hexRound(x,y));if(x<2||y<2||x>=SIZE-2||y>=SIZE-2)return 'water';
 const region=biomeAt(x,y);
 if(region!=='forest'){
   const center=region==='snow'?{x:128,y:32}:{x:128,y:112},d=metric({x,y},center);
   const passage=(x>=90&&x<=109&&Math.abs(y-40)<3)||(x>=125&&x<=131&&y>=64&&y<=81);
   if(d>39+Math.sin(x*.3)*2&&!passage)return 'water';
   const arena=BOSSES.find(b=>b.biome===region);
   if(metric({x,y},arena)<8||passage)return region==='snow'?'snow':'ash';
   if(region==='snow'&&((x-116)**2/30+(y-49)**2/45<1))return 'mountain';
   if(region==='fire'&&((x-125)**2/25+(y-104)**2/90<1))return 'lava';
   return region==='snow'?'snow':'ash';
 }
 const p=toPlane(x-48,y-48),angle=Math.atan2(p.y,p.x),radius=45+2*Math.sin(angle*3)+1.5*Math.sin(angle*7+.8);
 if(Math.hypot(p.x,p.y)>radius&&metric({x,y},START)>6)return 'water';
 if(metric({x,y},START)<7||metric({x,y},BOSS_POS)<7||isTrail(x,y)||[{x:15,y:41},{x:33,y:27},{x:44,y:18}].some(n=>metric(n,{x,y})<2))return 'grass';
 const ellipse=(cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2;
 if(ellipse(23,19,6,4)<1||ellipse(43,47,7,4)<1||ellipse(10,28,3,5)<1||ellipse(65,64,5,7)<1)return 'water';
 if(ellipse(31,43,3,7)<1||ellipse(45,7,9,3)<1||ellipse(53,34,4,7)<1||ellipse(82,48,3,8)<1)return 'mountain';
 if(ellipse(23,19,7.5,5.5)<1||ellipse(43,47,8.5,5.5)<1||ellipse(10,28,4.5,6.5)<1||ellipse(65,64,6.5,8.5)<1)return 'shore';
 if(ellipse(31,43,5,9)<1||ellipse(53,34,6,9)<1)return 'heath';
 return 'grass';
}
export const SCENERY=[];
for(let x=8;x<SIZE-5;x+=5)for(let y=8;y<SIZE-5;y+=5){
 if(!['grass','snow','ash'].includes(terrainBase(x,y))||isTrail(x,y)||metric({x,y},START)<5||metric({x,y},BOSS_POS)<8||hash(x+99,y)>.68)continue;
 const type=['fern','mushrooms','log','runes','spring'][Math.floor(hash(x,y+80)*5)];
 SCENERY.push({id:`scene${x}_${y}`,type,x,y,phase:hash(x+11,y)*Math.PI*2});
}
