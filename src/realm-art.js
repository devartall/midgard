const line=(c,points,color,width=3)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
export function realmActor(r,e,pose){
 const c=r.ctx,ice=e.biome==='snow',boss=e.type==='boss',step=pose.step,glow=ice?'#c6f8ff':'#ffb149';
 if(boss){
  if(ice){
   // Broad ice titan with a low crown and a stone maul, no forest antlers.
   for(const side of [-1,1]){line(c,[[side*12,-26],[side*15+step*4,0]],'#638da2',15);r.poly([[side*19,-53],[side*31,-44],[side*30,-18],[side*20,-24]],'#8ebecb','#dcf5f5');}
   r.poly([[-24,-63],[22,-63],[29,-27],[0,-17],[-27,-30]],'#90bac9','#d7f8fa');
   for(let i=-2;i<=2;i++)r.poly([[i*9-5,-61],[i*9,-80-Math.abs(i)*3],[i*9+6,-60]],'#ccecf2');
   oval(c,0,-66,12,13,'#5b8398');line(c,[[-7,-66],[-2,-66]],glow,3);line(c,[[3,-66],[8,-66]],glow,3);
   const swing=pose.windup*14-pose.strike*20;line(c,[[27,-34],[39,-46-swing],[41,-75-swing]],'#627d8b',6);r.poly([[29,-84-swing],[54,-84-swing],[58,-65-swing],[28,-65-swing]],'#b7dce5','#edffff');
  }else{
   // Armoured volcanic king: horned mask, floating embers and a greatsword.
   for(const side of [-1,1]){line(c,[[side*11,-25],[side*15+step*4,0]],'#473e4a',13);r.poly([[side*17,-57],[side*33,-66],[side*28,-36],[side*17,-30]],'#5e4654','#b36e50');}
   r.poly([[-20,-65],[21,-65],[25,-26],[0,-15],[-25,-26]],'#403943','#a15b48');line(c,[[0,-61],[-4,-44],[6,-35],[0,-19]],glow,3);
   r.poly([[-12,-72],[-18,-93],[-6,-82],[7,-82],[20,-93],[12,-69],[5,-57],[-6,-57]],'#62505b','#bf825d');line(c,[[-7,-71],[-2,-68],[4,-68],[9,-71]],glow,3);
   const angle=-pose.windup*.8+pose.strike*1.5;c.save();c.translate(28,-38);c.rotate(angle);line(c,[[0,8],[0,-52]],'#e59960',7);r.poly([[-7,-45],[0,-75],[8,-46],[5,-4],[-4,-4]],'#4e4554',glow);line(c,[[-11,-3],[12,-3]],'#c79559',4);c.restore();
  }return;
 }
 if(e.type==='wolf'){
  if(ice){ // Six-legged crystalline crawler.
   oval(c,0,-12,19,12,'#759bb0');for(const side of [-1,1])for(let i=0;i<3;i++)line(c,[[side*8,-14],[side*(20+i*2),-9],[side*(22+i*2)+step*(i%2?3:-3),3]],'#a5d7df',3);
   for(let i=-1;i<=1;i++)r.poly([[i*9-6,-17],[i*9,-35],[i*9+7,-16]],glow);oval(c,15,-14,3,2,'#244952');
  }else{ // Long salamander body and a burning tail.
   line(c,[[-10,-9],[-27,-8],[-36,-18]],'#9a4c38',7);oval(c,0,-12,22,8,'#6f3f37');oval(c,23,-12,9,6,'#af6240');
   for(const side of [-1,1])for(const x of [-10,10])line(c,[[x,-10],[x+side*7+step*2,1]],'#a46c46',4);for(let i=-2;i<=2;i++)r.poly([[i*7-3,-18],[i*7,-29],[i*7+4,-18]],glow);oval(c,27,-15,2,2,'#fff2b0');
  }return;
 }
 if(ice&&e.type==='draugr'){
  r.poly([[-8,-37],[8,-37],[17,-2],[6,-7],[0,1],[-7,-8],[-16,-2]],'#779dab','#d1edf2');oval(c,0,-38,8,11,'#d9ece7');
  line(c,[[-7,-27],[-20,-20-step*2]],glow,4);line(c,[[7,-27],[20,-20+step*2]],glow,4);line(c,[[-4,-38],[4,-38]],'#3a697f',2);
 }else{
  const heavy=e.type==='breaker';for(const side of [-1,1])line(c,[[side*6,-17],[side*8+step*side*4,0]],ice?'#6b94a9':'#5b4247',heavy?9:5);
  r.poly([[-(heavy?17:10),-35],[heavy?17:10,-35],[heavy?20:11,-12],[0,-8],[-(heavy?20:11),-12]],ice?'#92bdc8':'#734b49',ice?'#d3edf3':'#e7995a');
  r.poly([[-9,-36],[0,-52],[10,-36],[7,-26],[-6,-26]],ice?'#bddce0':'#453940',glow);line(c,[[-5,-35],[5,-35]],glow,2);
  for(const side of [-1,1])line(c,[[side*12,-30],[side*20,-19+pose.windup*9],[side*21,-8-pose.strike*18]],ice?'#8eb8c5':'#a86548',heavy?9:5);
 }
}
