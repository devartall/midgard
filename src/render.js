import { toPlane, fromPlane, corners, hexRound, edgePoints } from './hex.js';
import { ActorAnimator } from './animation.js';
import { drawActor, drawBuilding, drawFloor } from './art.js';
import {
  SIZE,DAY,START,BOSS_POS,NOTES,hash,terrain,isTrail,isNight,distance,inHome,homeValue
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
    this.w=0;
    this.h=0;
    this.scale=1;
    this.camera={
      x:START.x,y:START.y
    };
    this.resize();
  }
  resize(){
    this.w=innerWidth;
    this.h=innerHeight;
    this.scale=this.h<500?25:32;
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
    const c=this.ctx,q=this.screen(r.x,r.y),s=this.scale,h=hash(r.x,r.y);
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
    const tall=1.7+h*.8;
    for(let i=0; i<3; i++){
      const yy=q.y-s*(.35+i*.43),ww=s*(.72-i*.13)*(1+h*.3);
      this.poly([[q.x-ww,yy],[q.x,yy-s*tall*.66],[q.x+ww,yy],[q.x+ww*.3,yy+5]],i===2?'#466047':i===1?'#304d39':'#254330');
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
  resource(r,g){
    const q=this.screen(r.x,r.y),c=this.ctx;
    if(r.type==='wood')return this.tree(r,g);
    if(r.ready>g.time)return;
    if(r.type==='stone'){
      this.box(r.x,r.y,.38,12,['#929589','#626e65','#758076']);
      this.box(r.x+.3,r.y-.2,.2,8,['#aaa99a','#78857a','#697a72']);
      c.strokeStyle='#d1cfb688'; c.lineWidth=1; c.beginPath();
      c.moveTo(q.x-8,q.y-12); c.lineTo(q.x-2,q.y-15); c.lineTo(q.x+6,q.y-12); c.stroke();
      c.strokeStyle='#475b50'; c.beginPath(); c.moveTo(q.x+2,q.y-10); c.lineTo(q.x,q.y-5); c.lineTo(q.x+4,q.y-1); c.stroke();
    }
    else{
      for(let i=0; i<5; i++){
        c.fillStyle=i%2?'#617449':'#4e673e';
        c.beginPath();
        c.arc(q.x+(i-2)*5,q.y-5-Math.sin(i)*4,8,0,Math.PI*2);
        c.fill();
        c.strokeStyle='#a0ad7566'; c.lineWidth=1; c.beginPath();
        c.moveTo(q.x+(i-2)*5,q.y); c.lineTo(q.x+(i-2)*6,q.y-9); c.stroke();
      }
      for(let i=0; i<6; i++){
        c.fillStyle='#bc675d';
        c.beginPath();
        c.arc(q.x-10+i*4,q.y-8+(i%2)*5,2,0,Math.PI*2);
        c.fill();
      }
    }
  }
  part(p, g) { drawBuilding(this, p, g); }
  actor(actor, g, player = false) {
    drawActor(this, actor, g, player, this.animator.pose(actor, g.time));
  }
  draw(g,buildType=null,pointer=null,buildEdge=0){
    const c=this.ctx;
    this.camera.x+=(g.player.x-this.camera.x)*.12;
    this.camera.y+=(g.player.y-this.camera.y)*.12;
    c.fillStyle='#243e38';
    c.fillRect(0,0,this.w,this.h);
    // Visible region only. Static procedural details are deterministic.
    const corners=[this.world(-100,-120),this.world(this.w+100,-120),this.world(-100,this.h+180),this.world(this.w+100,this.h+180)];
    const minX=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))),maxX=Math.min(SIZE-1,Math.ceil(Math.max(...corners.map(p=>p.x))));
    const minY=Math.max(0,Math.floor(Math.min(...corners.map(p=>p.y)))),maxY=Math.min(SIZE-1,Math.ceil(Math.max(...corners.map(p=>p.y))));
    for(let x=minX; x<=maxX; x++)for(let y=minY; y<=maxY; y++){
      const h=hash(x,y),water=terrain(x,y)==='water';
      this.hex(x,y,1.01,water?'#2d4e48':isTrail(x,y)?'#6a6949':palette[Math.floor(h*palette.length)],'#152e232e');
      if(!water&&!isTrail(x,y)&&h>.6){
        const q=this.screen(x,y);
        c.strokeStyle='#8c9c6237';
        c.lineWidth=1;
        c.beginPath();
        c.moveTo(q.x-4,q.y);
        c.lineTo(q.x-5,q.y-4);
        c.moveTo(q.x,q.y+2);
        c.lineTo(q.x+2,q.y-3);
        c.stroke();
      }
    }
    if(g.home&&(buildType||distance(g.player,g.home)<9)){
      for(let x=g.home.x-5; x<=g.home.x+5; x++)for(let y=g.home.y-5; y<=g.home.y+5; y++)if(inHome(g,{x,y}))this.hex(x,y,.98,'#b7ad7310',buildType?'#e2cf8240':null);
      const q=this.screen(g.home.x,g.home.y-5);
      this.text(q.x,q.y-13,`ВАШ УЧАСТОК · ${homeValue(g)}`,'#d1c596',9);
    }
    for (const p of g.parts) if (p.type === 'floor') drawFloor(this, p);
    for(let i=0; i<8; i++){
      const a=i/8*Math.PI*2;
      this.box(BOSS_POS.x+Math.cos(a)*4.6,BOSS_POS.y+Math.sin(a)*4.6,.35,22,['#818c7e','#455e53','#5a7361']);
    }
    this.diamond(BOSS_POS.x,BOSS_POS.y,3.7,'#16382722','#adc09b33');
    const objects=[];
    const visible=o=>o.x>=minX&&o.x<=maxX&&o.y>=minY&&o.y<=maxY;
    for(const r of g.resources)if(visible(r)&&!g.parts.some(p=>p.x===r.x&&p.y===r.y))objects.push({
      o:r,kind:'resource'
    });
    for(const p of g.parts)if(p.type!=='floor'&&visible(p))objects.push({
      o:p,kind:'part'
    });
    for(const e of g.enemies)if(!e.dead&&visible(e))objects.push({
      o:e,kind:'enemy'
    });
    for(const n of NOTES)if(visible(n))objects.push({
      o:n,kind:'note'
    });
    for(const v of g.graves)if(visible(v))objects.push({
      o:v,kind:'grave'
    });
    objects.push({
      o:g.player,kind:'player'
    });
    objects.sort((a,b)=>(a.o.x+a.o.y*1.3660254)-(b.o.x+b.o.y*1.3660254));
    for(const {
      o,kind
    }
    of objects){
      if(kind==='resource')this.resource(o,g);
      else if(kind==='part')this.part(o,g);
      else if(kind==='enemy'||kind==='player')this.actor(o,g,kind==='player');
      else{
        this.box(o.x,o.y,.3,kind==='note'?27:14,['#a0a28a','#586b60','#718577']);
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
    if(buildType&&pointer){
      const p=this.world(pointer.x,pointer.y),{x,y}=hexRound(p.x,p.y);
      this.hex(x,y,.98,inHome(g,{
        x,y
      })?'#c9d79555':'#e38c6e66','#eee2b1');
      if(['wall','door','reinforce'].includes(buildType)){const[a,b]=edgePoints({x,y},buildEdge).map(p=>this.screen(p.x,p.y));this.poly([[a.x,a.y],[b.x,b.y],[b.x,b.y-30],[a.x,a.y-30]],'#d8cc9277','#f5e8b8');}
    }
  }
  map(canvas,g){
    const c=canvas.getContext('2d'),unit=3.2;canvas.width=320;canvas.height=190;
    const project=p=>{const v=toPlane(p.x,p.y);return{x:8+v.x*unit,y:7+v.y*unit};};
    c.fillStyle='#152c25';c.fillRect(0,0,320,190);
    for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++){
      const vertices=corners(x,y);c.beginPath();vertices.forEach((v,i)=>{const q=project(v);if(i)c.lineTo(q.x,q.y);else c.moveTo(q.x,q.y);});c.closePath();
      c.fillStyle=terrain(x,y)==='water'?'#294a45':isTrail(x,y)?'#8e8255':palette[Math.floor(hash(x,y)*6)];c.fill();
    }
    const dot=(p,color,r)=>{const q=project(p);c.fillStyle=color;c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.fill();};
    if(g.home)dot(g.home,'#e2ca84',5);for(const grave of g.graves)dot(grave,'#c397cb',3);
    for(const n of NOTES)dot(n,'#b6c1a1',2);
    dot(BOSS_POS,g.bossDefeated?'#839573':'#ce8974',5);dot(START,'#b9b795',3);dot(g.player,'#f8edcb',4);
  }
}
