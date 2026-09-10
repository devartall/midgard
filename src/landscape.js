import {fromPlane,toPlane} from './hex.js';
import {terrain,isTrail,hash,biomeAt} from './game.js';
const COLORS={water:[37,73,83],snow:[181,203,212],ash:[85,72,76],lava:[220,94,42],mountain:[76,92,94],shore:[154,148,117],heath:[108,115,96],grass:[56,79,51],trail:[121,113,79]};
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
// A continuous field, sampled independently of visible hex edges. Large-scale
// variation keeps adjacent grass cells from looking like differently painted tiles.
export class GroundField {
 constructor(g){this.game=g;this.vertices=new Map();}
 vertex(x,y){
  const key=`${x},${y}`;let color=this.vertices.get(key);if(color)return color;
  const kind=terrain(x,y,this.game),base=COLORS[kind==='grass'&&isTrail(x,y)?'trail':kind]||COLORS.grass;
  const shade=Math.sin(x*.31+y*.17)*2+Math.sin(x*.09-y*.22)*2;
  color=base.map(v=>v+shade);this.vertices.set(key,color);return color;
 }
 sample(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
  const a=this.vertex(ix,iy),b=this.vertex(ix+1,iy),c=this.vertex(ix,iy+1),d=this.vertex(ix+1,iy+1);
  return a.map((n,i)=>Math.round(lerp(lerp(n,b[i],u),lerp(c[i],d[i],u),v)));
 }
}
export const GROUND_TILE=8,GROUND_RES=8,GROUND_CACHE_LIMIT=96;
// One-pixel gutters make adjacent cached surfaces share identical edge samples.
export function groundPixels(field,tx,ty){
 const width=GROUND_TILE*GROUND_RES+2,data=new Uint8ClampedArray(width*width*4);
 for(let py=0;py<width;py++)for(let px=0;px<width;px++){
  const p=fromPlane(tx*GROUND_TILE+(px-.5)/GROUND_RES,ty*GROUND_TILE+(py-.5)/GROUND_RES),color=field.sample(p.x,p.y),i=(py*width+px)*4;
  data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
 }
 return {width,height:width,data};
}
function surface(width,height){
 if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);
 if(globalThis.document?.createElement){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
 return null;
}
export class GroundPainter {
 constructor(makeSurface=surface){this.makeSurface=makeSurface;this.tiles=new Map();this.game=null;}
 draw(r,g,bounds){
  const homeKey=g.legacyTerrainHome&&g.home?`${g.home.x},${g.home.y}`:'';
  if(this.game!==g||homeKey!==this.homeKey){this.game=g;this.homeKey=homeKey;this.field=new GroundField(g);this.tiles.clear();}
  const points=bounds.map(p=>toPlane(p.x,p.y)),left=Math.floor(Math.min(...points.map(p=>p.x))/GROUND_TILE),right=Math.floor(Math.max(...points.map(p=>p.x))/GROUND_TILE),top=Math.floor(Math.min(...points.map(p=>p.y))/GROUND_TILE),bottom=Math.floor(Math.max(...points.map(p=>p.y))/GROUND_TILE);
  const c=r.ctx,s=r.scale,cam=toPlane(r.camera.x,r.camera.y);
  c.save();c.transform(s,s*.5,-s,s*.5,r.w*.5-(cam.x-cam.y)*s,r.h*.51-(cam.x+cam.y)*s*.5);c.imageSmoothingEnabled=true;
  for(let ty=top;ty<=bottom;ty++)for(let tx=left;tx<=right;tx++){
   const key=`${tx},${ty}`;let tile=this.tiles.get(key);
   if(!tile){
    tile=this.makeSurface(GROUND_TILE*GROUND_RES+2,GROUND_TILE*GROUND_RES+2);if(!tile){c.restore();return;}const pixels=groundPixels(this.field,tx,ty);
    const ctx=tile.getContext('2d'),image=ctx.createImageData(pixels.width,pixels.height);image.data.set(pixels.data);ctx.putImageData(image,0,0);
    this.tiles.set(key,tile);
   }else{this.tiles.delete(key);this.tiles.set(key,tile);}
   c.drawImage(tile,tx*GROUND_TILE-1/GROUND_RES,ty*GROUND_TILE-1/GROUND_RES,GROUND_TILE+2/GROUND_RES,GROUND_TILE+2/GROUND_RES);
   if(this.tiles.size>GROUND_CACHE_LIMIT)this.tiles.delete(this.tiles.keys().next().value);
  }
  c.restore();
 }
}
export function mountainShape(x,y){
 const h=hash(x+7,y+11),variant=Math.floor(h*4),width=.67+hash(x+31,y)*.24,height=1.2+hash(x,y+63)*1.8;
 return {variant,width,height,offset:(hash(x+22,y)-.5)*.28,peak:(hash(x,y+19)-.5)*.35};
}
export function drawMountain(r,p,g){
 const c=r.ctx,s=r.scale,shape=mountainShape(p.x,p.y),q=r.screen(p.x+shape.offset,p.y),biome=biomeAt(p.x,p.y),w=s*shape.width,h=s*shape.height;
 const light=biome==='snow'?'#9bb7c3':biome==='fire'?'#8c6b65':'#86928a',mid=biome==='snow'?'#6b8c9f':biome==='fire'?'#614c50':'#627578',dark=biome==='snow'?'#405f78':biome==='fire'?'#352f3b':'#354e56';
 c.save();c.translate(q.x,q.y);
 // Tall foreground rocks become translucent near the hero, as trees do.
 if(g&&p.x+p.y*1.3660254>g.player.x+g.player.y*1.3660254&&Math.hypot(q.x-r.screen(g.player.x,g.player.y).x,q.y-r.screen(g.player.x,g.player.y).y)<h*.65)c.globalAlpha=.55;
 const shadow=c.createRadialGradient(w*.2,3,0,w*.2,3,w*1.25);shadow.addColorStop(0,'#13202570');shadow.addColorStop(1,'#13202500');c.fillStyle=shadow;c.save();c.scale(1,.36);c.fillRect(-w*1.3,-w*1.3,w*2.8,w*2.8);c.restore();
 const peak=shape.peak*w;
 const ridges=[
  [[-w,2],[-w*.74,-h*.32],[-w*.36,-h*.57],[peak,-h],[w*.36,-h*.64],[w*.64,-h*.27],[w,4]],
  [[-w,2],[-w*.81,-h*.54],[-w*.42,-h*.72],[w*.19,-h*.77],[w*.52,-h*.53],[w*.76,-h*.42],[w,4]],
  [[-w,2],[-w*.83,-h*.39],[-w*.49,-h*.85],[-w*.14,-h*.58],[w*.23,-h],[w*.49,-h*.62],[w,4]],
  [[-w,2],[-w*.76,-h*.27],[-w*.8,-h*.56],[-w*.25,-h*.57],[-w*.22,-h*.88],[w*.24,-h*.82],[w*.48,-h*.4],[w*.83,-h*.28],[w,4]]
 ][shape.variant];
 r.poly([...ridges,[w*.32,s*.34],[-w*.5,s*.2]],mid);
 // Irregular lit facets share the silhouette instead of repeating a triangle.
 for(let i=1;i<ridges.length-2;i++){
  const a=ridges[i],b=ridges[i+1],foot=[lerp(a[0],w*.25,.6),s*(.12+.04*(i%3))];
  r.poly([a,b,foot],i%2?light:dark);
 }
 c.save();c.beginPath();ridges.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineTo(w*.32,s*.34);c.lineTo(-w*.5,s*.2);c.closePath();c.clip();
 c.lineWidth=1;
 for(let i=0;i<6;i++){
  const y=-h*(.16+i*.12);c.strokeStyle=i%2?'#cfcdc033':'#16293755';c.beginPath();c.moveTo(-w,y+4);c.lineTo(-w*.2,y);c.lineTo(w*.3,y+6);c.lineTo(w,y+2);c.stroke();
 }
 for(let i=0;i<3;i++){
  const x=(hash(p.x+i,p.y+72)-.5)*w,y=-h*(.3+i*.15);c.strokeStyle=dark;c.beginPath();c.moveTo(x,y);c.lineTo(x+4,y+h*.13);c.lineTo(x+1,y+h*.21);c.stroke();
 }
 if(biome==='snow'||(biome==='forest'&&shape.height>2.1)){
  for(let i=1;i<ridges.length-2;i++){const a=ridges[i],b=ridges[i+1];if(a[1]>-h*.48)continue;r.poly([a,b,[b[0]+2,b[1]+h*.12],[lerp(a[0],b[0],.55),lerp(a[1],b[1],.55)+h*.08],[a[0]-3,a[1]+h*.16]],biome==='snow'?'#e2edf0':'#c7d3c9');}
 }
 c.restore();
 for(let i=0;i<4;i++){
  const x=(hash(p.x+i,p.y+5)-.5)*w*1.8,y=hash(p.x,p.y+i)*s*.24,size=2+hash(p.y+i,p.x)*4;
  r.poly([[x-size,y],[x-size*.6,y-size],[x+size*.5,y-size*.7],[x+size,y+1]],i%2?mid:light);
 }
 if(biome==='forest'){c.fillStyle='#70805c99';c.beginPath();c.ellipse(-w*.35,3,w*.3,3,0,0,Math.PI*2);c.fill();}
 c.restore();
}
