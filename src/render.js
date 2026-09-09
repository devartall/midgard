import {
  SIZE,DAY,START,BOSS_POS,PARTS,NOTES,hash,terrain,isTrail,isNight,distance,inHome,homeValue,blocked
}
from './game.js';
const palette=['#354b32','#3a5034','#3d5135','#344a31','#3e5438','#41563a'];
export class Renderer {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{
      alpha:false
    });
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
    const s=this.scale;
    return {
      x:this.w*.5+(x-y-this.camera.x+this.camera.y)*s,y:this.h*.51+(x+y-this.camera.x-this.camera.y)*s*.5-z
    };
  }
  world(sx,sy){
    const a=(sx-this.w*.5)/this.scale+this.camera.x-this.camera.y,b=(sy-this.h*.51)/(this.scale*.5)+this.camera.x+this.camera.y;
    return{
      x:(a+b)/2,y:(b-a)/2
    };
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
    if(distance(r,g.player)<2&&r.x+r.y>g.player.x+g.player.y)c.globalAlpha=.34;
    c.fillStyle='#0e1b2044';
    c.beginPath();
    c.ellipse(q.x+15,q.y+7,s*.9,s*.24,-.12,0,Math.PI*2);
    c.fill();
    c.fillStyle='#534630';
    c.fillRect(q.x-3,q.y-s*1.5,6,s*1.5);
    const tall=1.7+h*.8;
    for(let i=0; i<3; i++){
      const yy=q.y-s*(.35+i*.43),ww=s*(.72-i*.13)*(1+h*.3);
      this.poly([[q.x-ww,yy],[q.x,yy-s*tall*.66],[q.x+ww,yy],[q.x+ww*.3,yy+5]],i===2?'#466047':i===1?'#304d39':'#254330');
      this.poly([[q.x,yy-s*tall*.66],[q.x+ww,yy],[q.x+ww*.3,yy+5],[q.x,yy-3]],'#1b382f66');
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
    }
    else{
      for(let i=0; i<5; i++){
        c.fillStyle=i%2?'#617449':'#4e673e';
        c.beginPath();
        c.arc(q.x+(i-2)*5,q.y-5-Math.sin(i)*4,8,0,Math.PI*2);
        c.fill();
      }
      for(let i=0; i<6; i++){
        c.fillStyle='#bc675d';
        c.beginPath();
        c.arc(q.x-10+i*4,q.y-8+(i%2)*5,2,0,Math.PI*2);
        c.fill();
      }
    }
  }
  part(p,g){
    const c=this.ctx,q=this.screen(p.x,p.y),s=this.scale;
    const destroyed=p.hp<=0;
    c.save();
    if(destroyed)c.globalAlpha=.35;
    if(p.type==='wall'||p.type==='reinforce'||p.type==='door'){
      if(distance(p,g.player)<2.8&&p.x+p.y>g.player.x+g.player.y)c.globalAlpha*=.48;
      if(p.type==='door'&&p.open){
        this.box(p.x-.3,p.y,.15,s*1.1,['#9b8456','#554c32','#706040']);
      }
      else{
        this.box(p.x,p.y,.92,s*(p.type==='reinforce'?1.3:1.1),p.type==='reinforce'?['#879183','#53675e','#667a6b']:['#a29365','#635e3d','#7b7149']);
        if(p.type==='door'){
          c.strokeStyle='#332e23';
          c.lineWidth=2;
          c.strokeRect(q.x-7,q.y-s,14,s*.82);
          c.fillStyle='#d3b77b';
          c.fillRect(q.x+3,q.y-s*.5,3,3);
        }
      }
    }
    else if(p.type==='fire'){
      this.diamond(p.x,p.y,.6,'#383e32');
      for(let i=0; i<7; i++){
        const a=i/7*Math.PI*2;
        c.fillStyle='#939482';
        c.beginPath();
        c.ellipse(q.x+Math.cos(a)*12,q.y+Math.sin(a)*6,4,3,0,0,Math.PI*2);
        c.fill();
      }
      const flicker=Math.sin(g.time*11)*3;
      this.poly([[q.x-7,q.y],[q.x-4,q.y-16],[q.x,q.y-9],[q.x+3,q.y-25-flicker],[q.x+9,q.y],[q.x,q.y+3]],'#da9552');
      this.poly([[q.x-3,q.y],[q.x,q.y-14],[q.x+4,q.y]],'#f7d28a');
    }
    else if(p.type==='chest'){
      this.box(p.x,p.y,.57,15,['#a08a50','#5d5434','#7d6a3b']);
      c.fillStyle='#c6ad69';
      c.fillRect(q.x-2,q.y-7,4,5);
      if(blocked(g,p)){
        this.diamond(p.x,p.y,.8,'#883d6530','#d388a7');
        this.text(q.x,q.y-25,'Недоступно','#e3a5b3',9);
      }
    }
    else if(p.type==='bed'){
      this.box(p.x,p.y,.7,5,['#846e4c','#5c4d36','#6b5d43']);
      this.diamond(p.x,p.y,.55,'#b5b397');
    }
    else if(p.type==='bench'||p.type==='kitchen'){
      this.box(p.x,p.y,.55,18,['#b4a477','#766849','#95845a']);
      this.box(p.x-.1,p.y,.25,25,p.type==='kitchen'?['#a3aaa0','#455b55','#70877d']:['#8c9890','#56635d','#687971']);
    }
    else if(p.type==='decor'){
      this.box(p.x,p.y,.2,37,['#c0ae77','#77734a','#9a8c5b']);
      this.text(q.x,q.y-16,'ᚱ','#e2ce93',15);
    }
    if(p.hp<PARTS[p.type].hp){
      c.fillStyle='#12221c';
      c.fillRect(q.x-13,q.y+10,26,3);
      c.fillStyle='#c69a64';
      c.fillRect(q.x-13,q.y+10,26*Math.max(0,p.hp/PARTS[p.type].hp),3);
    }
    c.restore();
  }
  actor(e,g,player=false){
    const c=this.ctx,q=this.screen(e.x,e.y),s=this.scale;
    const boss=e.type==='boss',wolf=e.type==='wolf';
    if(e.dead)return;
    c.save();
    c.fillStyle='#071c1c66';
    c.beginPath();
    c.ellipse(q.x,q.y+2,boss?26:12,boss?10:5,0,0,Math.PI*2);
    c.fill();
    if(!player&&e.phase==='windup'){
      const r=boss&&e.hp<e.maxHp*.5&&e.attackIndex%3===0?4.2:boss?2.8:1.5;
      c.fillStyle='#bd664335';
      c.strokeStyle='#e7ad6b99';
      c.beginPath();
      c.ellipse(q.x,q.y,this.scale*r*Math.SQRT2,this.scale*r/Math.SQRT2,0,0,Math.PI*2);
      c.fill();
      c.stroke();
      c.strokeStyle='#f1b177';
      c.lineWidth=2;
      c.beginPath();
      c.arc(q.x,q.y-28,18,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-e.timer/(e.windupTime||(boss?1.1:.85))));
      c.stroke();
    }
    if(wolf){
      this.poly([[q.x-16,q.y-7],[q.x-11,q.y-17],[q.x+10,q.y-18],[q.x+18,q.y-9],[q.x+11,q.y-3],[q.x-9,q.y-2]],'#8f9990');
      this.poly([[q.x+8,q.y-16],[q.x+9,q.y-25],[q.x+15,q.y-18]],'#aeb6a2');
      c.fillStyle='#dfb878';
      c.fillRect(q.x+12,q.y-13,3,2);
    }
    else if(boss){
      const wave=Math.sin(g.time*2)*2;
      this.box(e.x,e.y,.7,50,['#697453','#344b3b','#4a5c40']);
      this.poly([[q.x-18,q.y-40],[q.x-34,q.y-70+wave],[q.x-24,q.y-57],[q.x-27,q.y-87],[q.x-14,q.y-59],[q.x,q.y-69],[q.x+14,q.y-60],[q.x+30,q.y-87],[q.x+25,q.y-55],[q.x+35,q.y-66],[q.x+20,q.y-39]],'#81916b');
      c.fillStyle=e.hp<e.maxHp*.5?'#ef9c68':'#d4d38b';
      c.fillRect(q.x-10,q.y-41,5,3);
      c.fillRect(q.x+5,q.y-41,5,3);
      this.diamond(e.x,e.y,.25,'#bdbb6944');
    }
    else{
      const body=player?(g.player.hurt>0?'#d1947e':'#849993'):e.type==='breaker'?'#837854':'#677768';
      c.fillStyle=player?'#273f3a':'#263c2e';
      c.fillRect(q.x-7,q.y-11,5,12);
      c.fillRect(q.x+2,q.y-11,5,12);
      this.poly([[q.x-10,q.y-25],[q.x+8,q.y-25],[q.x+12,q.y-10],[q.x-11,q.y-9]],body);
      c.fillStyle=player?'#c7b992':'#a3ab83';
      c.beginPath();
      c.arc(q.x,q.y-31,7,0,Math.PI*2);
      c.fill();
      if(player){
        this.poly([[q.x-8,q.y-33],[q.x-6,q.y-40],[q.x+6,q.y-40],[q.x+9,q.y-33]],'#53665c');
        if(g.player.inv.armor)this.poly([[q.x-8,q.y-25],[q.x+7,q.y-25],[q.x+4,q.y-13],[q.x-5,q.y-13]],'#a48c5a');
        c.strokeStyle='#d3d5ba';
        c.lineWidth=3;
        c.beginPath();
        c.moveTo(q.x+10,q.y-12);
        c.lineTo(q.x+22,q.y-32);
        c.stroke();
        if(g.player.weapon==='bow'){
          c.strokeStyle='#d2b47c';
          c.beginPath();
          c.arc(q.x+14,q.y-19,12,-1.6,1.6);
          c.stroke();
        }
        if(g.player.blocking||g.player.parry>0){
          c.strokeStyle=g.player.parry>0?'#b1eee8':'#c7c6a4';
          c.lineWidth=3;
          c.beginPath();
          c.arc(q.x,q.y-17,23,-1.5,1.4);
          c.stroke();
        }
      }
      else{
        c.fillStyle='#cfb37f';
        c.fillRect(q.x-5,q.y-32,3,2);
        c.fillRect(q.x+3,q.y-32,3,2);
      }
    }
    if(!player&&e.hp<e.maxHp&&!boss){
      c.fillStyle='#13281d';
      c.fillRect(q.x-15,q.y-46,30,3);
      c.fillStyle='#bf8267';
      c.fillRect(q.x-15,q.y-46,30*e.hp/e.maxHp,3);
    }
    if(e.stun>0)this.text(q.x,q.y-(boss?94:52),'✧','#d9df9b',20);
    c.restore();
  }
  draw(g,buildType=null,pointer=null){
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
      this.diamond(x,y,1.025,water?'#2d4e48':isTrail(x,y)?'#6a6949':palette[Math.floor(h*palette.length)]);
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
      for(let x=g.home.x-5; x<=g.home.x+5; x++)for(let y=g.home.y-5; y<=g.home.y+5; y++)this.diamond(x,y,.99,'#b7ad7310',buildType?'#e2cf8240':null);
      const q=this.screen(g.home.x,g.home.y-5);
      this.text(q.x,q.y-13,`ВАШ УЧАСТОК · ${homeValue(g)}`,'#d1c596',9);
    }
    for(const p of g.parts)if(p.type==='floor') {
      this.diamond(p.x,p.y,.97,p.hp<=0?'#5a5b3b':'#998858','#c1aa7333');
      const q=this.screen(p.x,p.y);
      c.strokeStyle='#554c3440';
      c.beginPath();
      c.moveTo(q.x-this.scale*.5,q.y);
      c.lineTo(q.x+this.scale*.5,q.y+this.scale*.5);
      c.stroke();
    }
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
    objects.sort((a,b)=>(a.o.x+a.o.y)-(b.o.x+b.o.y));
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
      const p=this.world(pointer.x,pointer.y),x=Math.round(p.x),y=Math.round(p.y);
      this.diamond(x,y,.98,inHome(g,{
        x,y
      })?'#c9d79555':'#e38c6e66','#eee2b1');
    }
  }
  map(canvas,g){
    const c=canvas.getContext('2d'),s=5;
    canvas.width=SIZE*s;
    canvas.height=SIZE*s;
    for(let x=0; x<SIZE; x++)for(let y=0; y<SIZE; y++){
      c.fillStyle=terrain(x,y)==='water'?'#294a45':isTrail(x,y)?'#8e8255':palette[Math.floor(hash(x,y)*6)];
      c.fillRect(x*s,y*s,s,s);
    }
    const dot=(p,color,r)=>{
      c.fillStyle=color;
      c.beginPath();
      c.arc(p.x*s,p.y*s,r,0,Math.PI*2);
      c.fill();
    };
    if(g.home){
      c.strokeStyle='#d8c48c';
      c.strokeRect((g.home.x-5)*s,(g.home.y-5)*s,11*s,11*s);
      dot(g.home,'#e2ca84',4);
    }
    for(const grave of g.graves)dot(grave,'#c397cb',4);
    for(const n of NOTES)dot(n,'#b6c1a1',2);
    dot(BOSS_POS,g.bossDefeated?'#839573':'#ce8974',6);
    dot(START,'#b9b795',3);
    dot(g.player,'#f8edcb',5);
  }
}
