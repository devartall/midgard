const stroke=(c,points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export function drawNature(r,o,g){
 const c=r.ctx,q=r.screen(o.x,o.y),t=g.time+(o.phase||0),type=o.variant||o.type;
 c.save();c.translate(q.x,q.y);
 if(type==='fern'){
  for(let i=0;i<7;i++){
   const x=(i-3)*5+Math.sin(t*1.4+i)*2,y=-11-Math.sin(i*.6)*9;stroke(c,[[0,2],[x*.5,y*.4],[x,y]],'#758b59',1.5);
   for(let j=1;j<5;j++){const k=j/5;stroke(c,[[x*k-5*(1-k),y*k+2],[x*k,y*k],[x*k+5*(1-k),y*k-1]],i%2?'#8ea06b':'#536f4b',2);}
  }
 }else if(type==='mushrooms'){
  for(let i=0;i<6;i++){const x=(i-2.5)*6,y=(i%2)*4;stroke(c,[[x,y],[x+Math.sin(t+i)*.4,y-8]],'#c0b08c',2);oval(c,x,y-8,5,2.8,i%2?'#aa774f':'#986051');oval(c,x-1,y-9,1,.6,'#ecd5ac');}
  for(let i=0;i<3;i++)oval(c,Math.sin(t*.4+i)*14,-12-((t*2+i*6)%13),.7,.7,'#d5c39b77');
 }else if(type==='log'){
  r.poly([[-23,-3],[14,-9],[24,-4],[-13,5]],'#6f5138','#b08a57');
  for(let i=0;i<4;i++)stroke(c,[[-21+i*2,-2+i],[18,-7+i*2]],'#3c3929');
  oval(c,-19,0,5,5,'#a28351');oval(c,-19,0,3,3,'#6a5437');
  for(let i=0;i<5;i++)oval(c,-6+i*5,-5-Math.sin(t*.6+i)*.4,4,1.7,'#658153');
  stroke(c,[[4,-6],[7,-15],[11,-17]],'#6e5738',3);
 }else if(type==='runes'){
  r.poly([[-9,2],[-8,-28],[0,-36],[10,-26],[9,3]],'#627778','#9fa591');
  stroke(c,[[0,-28],[0,-6],[-5,-13],[4,-21],[-4,-25]],`rgba(179,218,178,${.45+.25*Math.sin(t)})`,2);
  oval(c,-5,2,8,2,'#586b42');
 }else if(type==='spring'){
  oval(c,0,0,22,10,'#536f69');oval(c,0,-1,16,7,'#4c8d99');
  c.strokeStyle='#b3d9c199';c.lineWidth=1;for(let i=0;i<2;i++){c.beginPath();c.ellipse(0,-1,3+(t*5+i*7)%14,1+(t*2+i*3)%5,0,0,Math.PI*2);c.stroke();}
  for(let i=0;i<5;i++)oval(c,Math.cos(i*1.4)*19,Math.sin(i*1.4)*8,4,3,'#9bada1');
 }
 c.restore();
}
export function drawAnimal(r,a,g,pose){
 const c=r.ctx,q=r.screen(a.x,a.y),deer=a.type==='deer';c.save();c.translate(q.x,q.y+pose.bob);c.scale(pose.facing,1);
 oval(c,0,2,deer?19:10,4,'#132b2766');
 if(deer){
  for(let i=0;i<4;i++){const x=-12+i*8,step=pose.step*(i%2?5:-5);stroke(c,[[x,-16],[x+step,-7],[x+step*1.4,1]],i%2?'#9b7854':'#5f5040',3);}
  oval(c,0,-20,19,10,'#997954');oval(c,4,-17,10,5,'#bda37a');
  stroke(c,[[12,-21],[17,-33]],'#a08059',9);oval(c,21,-35,8,5,'#ba9970');oval(c,25,-37,1,1,'#192b25');
  stroke(c,[[17,-39],[14,-50],[10,-54],[14,-48],[20,-51]],'#d0bd90',2);stroke(c,[[21,-40],[24,-49],[28,-52]],'#c6b082',2);
  stroke(c,[[-17,-23],[-23,-27]],'#ccbc93',4);
 }else{
  oval(c,0,-7,10,6,'#ab9b80');oval(c,8,-12,5,4,'#bdad90');
  stroke(c,[[7,-15],[5,-25],[9,-18],[12,-26]],'#c8b99f',3);oval(c,10,-13,1,1,'#172622');
  oval(c,-10,-8,3,3,'#ded6be');stroke(c,[[-5,-3],[-9+pose.step*4,1],[4,-2],[9-pose.step*4,0]],'#c5b498',2);
 }
 c.restore();
 if(a.hp<a.maxHp){c.fillStyle='#283e36';c.fillRect(q.x-14,q.y-(deer?60:32),28,3);c.fillStyle='#ca9970';c.fillRect(q.x-14,q.y-(deer?60:32),28*a.hp/a.maxHp,3);}
}
export function drawDetailedResource(r,o,g){
 const c=r.ctx,q=r.screen(o.x,o.y);c.save();c.translate(q.x,q.y);
 if(o.type==='stone'){
  r.poly([[-17,3],[-19,-9],[-8,-21],[10,-19],[21,-8],[14,6]],'#6e827e','#adb7a5');
  r.poly([[-19,-9],[-8,-21],[3,-8],[-3,4]],'#9ba99a');r.poly([[3,-8],[10,-19],[21,-8],[14,6]],'#526b6b');
  stroke(c,[[-7,-18],[-5,-12],[0,-9],[-2,-3],[4,2]],'#3c5857',1.5);stroke(c,[[8,-16],[7,-10],[12,-7]],'#c6cabc');
  for(let i=0;i<6;i++)oval(c,-13+i*5,3+(i%2)*2,3,1.5,'#789064');
  for(let i=0;i<5;i++)oval(c,-7+i*4,-11+(i%3)*3,.8,.6,'#d4d0ab');
  oval(c,22,5,5,3,'#8c9b8b');
 }else{
  const sway=Math.sin(g.time*1.6+o.x)*1.7;
  for(let i=0;i<7;i++){
   const x=(i-3)*5+sway,y=-5-Math.sin(i*.65)*9;stroke(c,[[0,2],[x,y]],'#665f3d',2);
   oval(c,x,y,7,4,i%2?'#597b4e':'#77945b');oval(c,x-2,y-1,3,1.4,'#a3b67655');
   if(i%2)for(let j=0;j<3;j++){oval(c,x+j*2-2,y+1,2,2,'#9b454a');oval(c,x+j*2-2.5,y,.7,.7,'#efb9a1');}
  }
 }
 c.restore();
}
