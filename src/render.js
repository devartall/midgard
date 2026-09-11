import {GroundPainter,drawMountain} from './landscape.js';
import {drawNature,drawAnimal,drawDetailedResource} from './nature.js';
import { wallEdges, toPlane, fromPlane, corners, hexRound, edgePoints } from './hex.js';
import { ActorAnimator } from './animation.js';
import { drawActor, drawBuilding, drawFloor } from './art.js';
import {
  SCENERY,BOSSES,biomeAt, GATHER, context, CAMPS, PARTS, SIZE,DAY,START,BOSS_POS,NOTES,hash,terrain,isTrail,isNight,distance,inHome,homeValue
}
from './game.js';
const palette=['#354b32','#3a5034','#3d5135','#344a31','#3e5438','#41563a'];
export class Renderer {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{
      alpha:false
    });
    this.animator = new ActorAnimator();
    this.ground = new GroundPainter();
    this.w=0;
    this.h=0;
    this.scale=1;
    this.zoom=1.4;
    this.camera={
      x:START.x,y:START.y
    };
    this.resize();
  }
  resize(){
    this.w=innerWidth;
    this.h=innerHeight;
    this.scale=(this.h<500?25:32)*this.zoom;
    const dpr=Math.min(devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.w*dpr);
    this.canvas.height=Math.round(this.h*dpr);
    this.canvas.style.width=this.w+'px';
    this.canvas.style.height=this.h+'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  screen(x,y,z=0){
    const p=toPlane(x-this.camera.x,y-this.camera.y),s=this.scale;
    return {x:this.w*.5+(p.x-p.y)*s,y:this.h*.51+(p.x+p.y)*s*.5-z};
  }
  world(sx,sy){
    const a=(sx-this.w*.5)/this.scale,b=(sy-this.h*.51)/(this.scale*.5),p=fromPlane((a+b)/2,(b-a)/2);
    return {x:p.x+this.camera.x,y:p.y+this.camera.y};
  }
  hex(x,y,size,fill,stroke) {
    this.poly(corners(x,y,size).map(p=>{const q=this.screen(p.x,p.y);return[q.x,q.y];}),fill,stroke);
  }
  poly(points,fill,stroke){
    const c=this.ctx;
    c.beginPath();
    points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));
    c.closePath();
    c.fillStyle=fill;
    c.fill();
    if(stroke){
      c.strokeStyle=stroke;
      c.lineWidth=1;
      c.stroke();
    }
  }
  diamond(x,y,size,fill,stroke){
    const q=this.screen(x,y),s=this.scale*size;
    this.poly([[q.x,q.y-s/2],[q.x+s,q.y],[q.x,q.y+s/2],[q.x-s,q.y]],fill,stroke);
  }
  box(x,y,w,h,colors){
    const q=this.screen(x,y),s=this.scale*w;
    this.poly([[q.x-s,q.y],[q.x,q.y+s/2],[q.x,q.y+s/2-h],[q.x-s,q.y-h]],colors[1]);
    this.poly([[q.x,q.y+s/2],[q.x+s,q.y],[q.x+s,q.y-h],[q.x,q.y+s/2-h]],colors[2]);
    this.poly([[q.x-s,q.y-h],[q.x,q.y-s/2-h],[q.x+s,q.y-h],[q.x,q.y+s/2-h]],colors[0]);
  }
  text(x,y,str,color='#e8dfbf',size=11){
    const c=this.ctx;
    c.font=`${size}px system-ui`;
    c.textAlign='center';
    c.fillStyle='#0008';
    c.fillText(str,x+1,y+1);
    c.fillStyle=color;
    c.fillText(str,x,y);
  }
  tree(r,g){
    const c=this.ctx,q=this.screen(r.x,r.y),s=this.scale,h=hash(r.x,r.y),biome=biomeAt(r.x,r.y);
    if(r.ready>g.time){
      this.box(r.x,r.y,.17,8,['#756549','#423c29','#554b34']);
      return;
    }
    c.save();
    if(distance(r,g.player)<2&&r.x+r.y*1.3660254>g.player.x+g.player.y*1.3660254)c.globalAlpha=.34;
    c.fillStyle='#0e1b2044';
    c.beginPath();
    c.ellipse(q.x+15,q.y+7,s*.9,s*.24,-.12,0,Math.PI*2);
    c.fill();
    c.fillStyle='#534630';
    c.fillRect(q.x-3,q.y-s*1.5,6,s*1.5);
    c.strokeStyle='#96774b'; c.lineWidth=1;
    c.beginPath(); c.moveTo(q.x-1,q.y-3); c.lineTo(q.x-1,q.y-s*1.4); c.stroke();
    for (const side of [-1,1]) {
      c.strokeStyle='#655438'; c.lineWidth=2; c.beginPath();
      c.moveTo(q.x,q.y-4); c.lineTo(q.x+side*9,q.y+3); c.stroke();
    }
    if(biome!=='forest'){
      for(const side of [-1,1])for(let i=0;i<4;i++){const y=q.y-12-i*13,x=q.x+side*(22-i*3);c.strokeStyle=biome==='snow'?'#7d949d':'#51404a';c.lineWidth=4;c.beginPath();c.moveTo(q.x,y-7);c.lineTo(x,y-15);c.lineTo(x+side*5,y-26);c.stroke();if(biome==='snow'){c.strokeStyle='#e4f5f5';c.lineWidth=5;c.beginPath();c.moveTo(q.x,y-10);c.lineTo(x,y-18);c.stroke();}else{c.fillStyle='#ff9655';c.fillRect(x,y-21,2,5);}}
      c.restore();return;
    }
    const tall=1.7+h*.8;
    for(let i=0; i<3; i++){
      const yy=q.y-s*(.35+i*.43),ww=s*(.72-i*.13)*(1+h*.3);
      this.poly([[q.x-ww,yy],[q.x,yy-s*tall*.66],[q.x+ww,yy],[q.x+ww*.3,yy+5]],biome==='snow'?(i===2?'#e0eef0':'#a3bec9'):biome==='fire'?(i===2?'#776362':'#3d393e'):i===2?'#466047':i===1?'#304d39':'#254330');
      this.poly([[q.x,yy-s*tall*.66],[q.x+ww,yy],[q.x+ww*.3,yy+5],[q.x,yy-3]],'#1b382f66');
      for (let branch=1; branch<4; branch++) {
        const bx=ww*branch/5, by=yy-s*tall*.45+branch*s*.16;
        c.strokeStyle=i===2?'#95a47966':'#69866388'; c.lineWidth=1;
        c.beginPath(); c.moveTo(q.x-2,by-5); c.lineTo(q.x-bx,by+1);
        c.moveTo(q.x+1,by-4); c.lineTo(q.x+bx*.8,by+1); c.stroke();
      }
    }
    c.restore();
  }
  resource(r,g){return this.detail(r,view=>view.resourceLocal(r,g));}
  resourceLocal(r,g){
    if(r.ready>g.time){if(r.type==='wood'&&!r.variant)this.tree(r,g);return;}
    if(r.variant){drawNature(this,r,g);return;}
    if(r.type==='wood')this.tree(r,g);else drawDetailedResource(this,r,g);
  }
  part(p, g) { this.detail(p,view=>drawBuilding(view,p,g)); }
  actor(actor, g, player = false) {
    this.detail(actor,view=>drawActor(view,actor,g,player,this.animator.pose(actor,g.time)));
  }
  draw(g,buildType=null,pointer=null,buildEdge=null,preview=null){
    const c=this.ctx;
    this.camera.x+=(g.player.x-this.camera.x)*.12;
    this.camera.y+=(g.player.y-this.camera.y)*.12;
    c.fillStyle='#243e38';
    c.fillRect(0,0,this.w,this.h);
    // Visible region only. Static procedural details are deterministic.
    const corners=[this.world(-100,-120),this.world(this.w+100,-120),this.world(-100,this.h+270),this.world(this.w+100,this.h+270)];
    const minX=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))),maxX=Math.min(SIZE-1,Math.ceil(Math.max(...corners.map(p=>p.x))));
    const minY=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.y)))),maxY=Math.min(SIZE-1,Math.ceil(Math.max(...corners.map(p=>p.y))));
    this.ground.draw(this,g,corners);
    // Fine detail has irregular positions; the surface itself has no tile outlines.
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
      const h=hash(x,y);if(h<.74)continue;
      const kind=terrain(x,y,g),q=this.screen(x+(hash(x+33,y)-.5)*.7,y+(hash(x,y+21)-.5)*.7);
      c.lineWidth=1;c.beginPath();
      if(kind==='water'||kind==='lava'){
        const drift=Math.sin(g.time*.7+x*.3)*2;c.strokeStyle=kind==='water'?'#79afad36':'#ffc17a66';
        c.moveTo(q.x-6+drift,q.y);c.quadraticCurveTo(q.x,q.y-2,q.x+4+drift,q.y);
      }else if(kind==='grass'&&!isTrail(x,y)){
        c.strokeStyle='#98a97133';c.moveTo(q.x-3,q.y);c.lineTo(q.x-4,q.y-3);c.moveTo(q.x,q.y+1);c.lineTo(q.x+2,q.y-2);
      }
      c.stroke();
    }
    if(g.home&&buildType){
      for(let x=g.home.x-5; x<=g.home.x+5; x++)for(let y=g.home.y-5; y<=g.home.y+5; y++)if(inHome(g,{x,y}))this.hex(x,y,.98,'#b7ad7310',buildType?'#e2cf8240':null);
      const q=this.screen(g.home.x,g.home.y-5);
      this.text(q.x,q.y-13,`ВАШ УЧАСТОК · ${homeValue(g)}`,'#d1c596',9);
    }
    for (const p of g.parts) if (p.type === 'floor') this.detail(p,view=>drawFloor(view,p));
    for(const b of BOSSES){
      if(distance(b,g.player)>25)continue;
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.box(b.x+Math.cos(a)*4.6,b.y+Math.sin(a)*4.6,.35,(b.biome==='forest'?22:32)*this.zoom,b.biome==='snow'?['#c5e9ed','#52768b','#82aabd']:b.biome==='fire'?['#c7875d','#4e3942','#825151']:['#818c7e','#455e53','#5a7361']);}
      this.diamond(b.x,b.y,3.7,'#16382722',b.biome==='fire'?'#ef956833':'#adc09b33');
    }
    for(const camp of CAMPS){
      const spot=this.screen(camp.x,camp.y),shade=c.createRadialGradient(spot.x,spot.y,0,spot.x,spot.y,this.scale*2);shade.addColorStop(0,'#2c29284a');shade.addColorStop(1,'#2c292800');c.fillStyle=shade;c.fillRect(spot.x-this.scale*2,spot.y-this.scale*2,this.scale*4,this.scale*4);
      const q=this.screen(camp.x,camp.y);this.text(q.x,q.y-6,'ᛏ', '#a98c60',19);
      for(let i=0;i<3;i++)this.box(camp.x+(i-1)*1.1,camp.y+1,.17,13*this.zoom,['#8b927f','#3e5150','#596b60']);
    }
    for(const h of g.hazards||[]){const q=this.screen(h.x,h.y);c.fillStyle=g.time<h.at?'#ffcf8055':'#ed592988';c.strokeStyle='#ffce7b';c.beginPath();c.ellipse(q.x,q.y,this.scale*1.7*1.4,this.scale*.85*1.4,0,0,Math.PI*2);c.fill();c.stroke();this.text(q.x,q.y-15,g.time<h.at?'МЕТЕОР':'ОГОНЬ','#ffdfb3',12);}
    const objects=[];
    const visible=o=>o.x>=minX&&o.x<=maxX&&o.y>=minY&&o.y<=maxY;
    for(const r of g.resources)if(visible(r)&&!g.parts.some(p=>p.x===r.x&&p.y===r.y))objects.push({
      o:r,kind:'resource'
    });
    for(const p of g.parts)if(p.type!=='floor'&&visible(p)){
      if(['wall','door','reinforce'].includes(p.type))for(const edge of wallEdges(p)){
        const [a,b]=edgePoints(p,edge);objects.push({o:{...p,edge},kind:'part',depth:(a.x+b.x)/2+(a.y+b.y)/2*1.3660254});
      }else objects.push({o:p,kind:'part'});
    }
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++)if(terrain(x,y,g)==='mountain')objects.push({o:{x,y},kind:'mountain'});
    for(const scene of SCENERY)if(visible(scene)&&!['fern','mushrooms','log'].includes(scene.type)&&!g.parts.some(p=>p.x===scene.x&&p.y===scene.y))objects.push({o:scene,kind:'nature'});
    for(const animal of g.animals)if(!animal.dead&&visible(animal))objects.push({o:animal,kind:'animal'});
    for(const e of g.enemies)if(!e.dead&&visible(e))objects.push({
      o:e,kind:'enemy'
    });
    for(const n of NOTES)if(visible(n))objects.push({
      o:n,kind:'note'
    });
    for(const v of g.graves)if(visible(v))objects.push({
      o:v,kind:'grave'
    });
    for(const p of g.peers||[])if(!p.dead&&visible(p))objects.push({o:p,kind:'peer'});
    objects.push({
      o:g.player,kind:'player'
    });
    objects.sort((a,b)=>(a.depth??a.o.x+a.o.y*1.3660254)-(b.depth??b.o.x+b.o.y*1.3660254));
    for(const {
      o,kind
    }
    of objects){
      if(kind==='resource'){c.save();const elapsed=g.time-o.struckAt;if(elapsed>=0&&elapsed<.2)c.translate(Math.sin(elapsed*75)*3*(1-elapsed/.2),0);this.resource(o,g);c.restore();}
      else if(kind==='part')this.part(o,g);
      else if(kind==='mountain')this.mountain(o,g);
      else if(kind==='nature')this.detail(o,view=>drawNature(view,o,g));
      else if(kind==='animal')this.detail(o,view=>drawAnimal(view,o,g,this.animator.pose(o,g.time)));
      else if(kind==='enemy'||kind==='player'||kind==='peer'){this.actor(o,g,kind!=='enemy');if(kind==='peer'||kind==='player'){const q=this.screen(o.x,o.y);this.text(q.x,q.y-85,(o.name||'Странник')+(o.pvp?' ⚔':''),o.pvp?'#ffc096':'#c1eef0',12);}}
      else{
        this.box(o.x,o.y,.3,(kind==='note'?27:14)*this.zoom,['#a0a28a','#586b60','#718577']);
        const q=this.screen(o.x,o.y);
        this.text(q.x,q.y-12,kind==='note'?'ᚱ':'ᛟ','#d6d49e',15);
      }
    }
    const night=isNight(g),phase=g.time%DAY;
    let darkness=night?Math.min(.52,(phase-300)/35*.52):phase>270?(phase-270)/30*.18:0;
    if(phase<25&&g.time>DAY)darkness=.4*(1-phase/25);
    c.fillStyle=`rgba(8,20,40,${darkness})`;
    c.fillRect(0,0,this.w,this.h);
    for(const p of g.parts)if(p.type==='fire'&&p.hp>0){
      const q=this.screen(p.x,p.y);
      const grad=c.createRadialGradient(q.x,q.y,0,q.x,q.y,100);
      grad.addColorStop(0,'#e8b45b30');
      grad.addColorStop(1,'#e8b45b00');
      c.fillStyle=grad;
      c.fillRect(q.x-100,q.y-100,200,200);
    }
    // Soft horizon and vignette keep controls legible without obscuring play.
    const vignette=c.createRadialGradient(this.w*.5,this.h*.5,this.h*.25,this.w*.5,this.h*.5,this.w*.7);
    vignette.addColorStop(0,'#091d1400');
    vignette.addColorStop(1,'#071a1a77');
    c.fillStyle=vignette;
    c.fillRect(0,0,this.w,this.h);
    for(const fx of g.effects){
      const q=this.screen(fx.x,fx.y);
      if(fx.ring){
        c.save();c.globalAlpha=Math.max(0,fx.life*2);c.strokeStyle=fx.color;c.lineWidth=3;
        c.beginPath();c.ellipse(q.x,q.y,fx.ring*this.scale*Math.SQRT2*(1-fx.life*.4),fx.ring*this.scale/Math.SQRT2*(1-fx.life*.4),0,0,Math.PI*2);c.stroke();c.restore();
      }
      if(fx.to){
        const t=this.screen(fx.to.x,fx.to.y);
        c.strokeStyle=fx.color;
        c.lineWidth=2;
        c.beginPath();
        c.moveTo(q.x,q.y-20);
        c.lineTo(t.x,t.y-20);
        c.stroke();
      }
      else this.text(q.x,q.y-45-(1-fx.life)*15,fx.text,fx.color,12);
    }
    for(const bolt of g.projectiles){const q=this.screen(bolt.x,bolt.y,20);c.strokeStyle=bolt.biome==='snow'?'#b9e9ff':bolt.biome==='fire'?'#ff914d':'#b6db8999';c.lineWidth=4;c.beginPath();const tail=this.screen(bolt.x-bolt.vx*.12,bolt.y-bolt.vy*.12,20);c.moveTo(tail.x,tail.y);c.lineTo(q.x,q.y);c.stroke();c.fillStyle=bolt.biome==='fire'?'#ffda83':bolt.biome==='snow'?'#eefaff':'#e2eeb5';c.beginPath();c.arc(q.x,q.y,5,0,Math.PI*2);c.fill();}
    const region=biomeAt(g.player.x,g.player.y);
    if(region!=='forest'){c.save();c.fillStyle=region==='snow'?'#edf5f3bb':'#ffbd6877';for(let i=0;i<45;i++){const x=(i*127+Math.sin(g.time*.3+i)*25+g.time*(region==='snow'?9:3))%this.w,y=(i*83+g.time*(region==='snow'?24:-15)+this.h*100)%this.h;c.beginPath();c.arc(x,y,region==='snow'?1.4:1,0,Math.PI*2);c.fill();}c.restore();}
    const target=context(g);
    if(target?.kind==='resource'){
      const q=this.screen(target.x,target.y),active=target.ready<=g.time;
      c.strokeStyle=active?'#edcf88':'#8f9b9477';c.lineWidth=1;c.beginPath();c.ellipse(q.x,q.y,18,8,0,0,Math.PI*2);c.stroke();
      if(active){
        const hits=target.hits||0,total=GATHER[target.type].hits;
        c.fillStyle='#102026ee';c.fillRect(q.x-32,q.y+9,64,20);
        this.text(q.x,q.y+22,`${target.type==='wood'?'Дерево':target.type==='stone'?'Камень':target.type==='crystal'?'Кристалл':target.type==='obsidian'?'Обсидиан':target.type==='herb'?'Травы':target.type==='mushroom'?'Грибы':'Ягоды'} ${hits}/${total}`,'#f0d9a0',10);
        c.fillStyle='#415a52';c.fillRect(q.x-30,q.y+30,60,3);c.fillStyle='#e3bd78';c.fillRect(q.x-30,q.y+30,60*hits/total,3);
      }
    }
    if(preview){
      const cost={};for(const p of preview)for(const [k,n]of Object.entries(PARTS[p.type].cost))cost[k]=(cost[k]||0)+n;
      const allowed=Object.entries(cost).every(([k,n])=>(g.player.inv[k]||0)>=n);
      for(const p of preview){
        const color=allowed&&inHome(g,p)?'#b8d5a877':'#de896677';
        if(['wall','door','reinforce'].includes(p.type)){
          const[a,b]=edgePoints(p,p.edge).map(v=>this.screen(v.x,v.y)),h=this.scale*1.18;
          this.poly([[a.x,a.y],[b.x,b.y],[b.x,b.y-h],[a.x,a.y-h]],color,'#ecdbac');
        }else this.hex(p.x,p.y,.98,color,'#eee2b1');
      }
    }else if(buildType&&pointer){const p=this.world(pointer.x,pointer.y),cell=hexRound(p.x,p.y);this.hex(cell.x,cell.y,.98,'#c8b78444','#eee2b1');}
  }
  mountain(p,g){this.detail(p,view=>drawMountain(view,p,g));}
  // World positions and picking use the zoomed projection. Local artwork uses
  // its original units and receives the same zoom, including hands and props.
  detail(anchor,draw){
    const q=this.screen(anchor.x,anchor.y),zoom=this.zoom,c=this.ctx,view=Object.create(this);
    view.scale=this.scale/zoom;
    view.screen=(x,y,z=0)=>{const p=this.screen(x,y,z*zoom);return{x:q.x+(p.x-q.x)/zoom,y:q.y+(p.y-q.y)/zoom};};
    c.save();c.translate(q.x,q.y);c.scale(zoom,zoom);c.translate(-q.x,-q.y);draw(view);c.restore();
  }

  map(canvas,g){
    const c=canvas.getContext('2d'),unit=1.12;canvas.width=280;canvas.height=220;
    const project=p=>{const v=toPlane(p.x,p.y);return{x:140+(v.x-117)*unit,y:110+(v.y-65)*unit};};
    c.fillStyle='#152c25';c.fillRect(0,0,280,220);
    for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++){
      const vertices=corners(x,y);c.beginPath();vertices.forEach((v,i)=>{const q=project(v);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.closePath();
      const kind=terrain(x,y,g);c.fillStyle=kind==='water'?'#3e7181':kind==='snow'?'#c9dde7':kind==='ash'?'#6f5154':kind==='lava'?'#ff913c':kind==='mountain'?'#bac6ba':kind==='shore'?'#b2a77d':kind==='heath'?'#828165':isTrail(x,y)?'#8e8255':palette[Math.floor(hash(x,y)*6)];c.fill();
    }
    const dot=(p,color,r)=>{const q=project(p);c.fillStyle=color;c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.fill();};
    for(const camp of CAMPS){const q=project(camp);c.strokeStyle='#d3a165';c.beginPath();c.arc(q.x,q.y,6,0,Math.PI*2);c.stroke();}
    if(g.home)dot(g.home,'#e2ca84',5);for(const grave of g.graves)dot(grave,'#c397cb',3);
    for(const n of NOTES)dot(n,'#b6c1a1',2);
    for(const b of BOSSES)dot(b,g.defeated?.includes(b.biome)?'#839573':'#ce8974',5);dot(START,'#b9b795',3);dot(g.player,'#f8edcb',4);
  }
}
