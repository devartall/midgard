// Axial coordinates; neighbouring cell centres are one world unit apart.
export const HEX_DIRS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
export const toPlane = (x,y) => ({ x:x+y*.5, y:y*Math.sqrt(3)/2 });
export const fromPlane = (x,y) => ({ x:x-y/Math.sqrt(3), y:y*2/Math.sqrt(3) });
export function hexRound(x,y) {
  let a=Math.round(x),b=Math.round(y),c=Math.round(-x-y);
  const da=Math.abs(a-x),db=Math.abs(b-y),dc=Math.abs(c+x+y);
  if(da>db&&da>dc)a=-b-c; else if(db>dc)b=-a-c;
  return {x:a,y:b};
}
export function hexDistance(a,b) { const dx=a.x-b.x,dy=a.y-b.y;return Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dx+dy)); }
export function metric(a,b) { const dx=a.x-b.x,dy=a.y-b.y;return Math.sqrt(Math.max(0,dx*dx+dx*dy+dy*dy)); }
export function corners(x,y,size=1) {
  return Array.from({length:6},(_,i)=>{const angle=(i*60-30)*Math.PI/180;const p=fromPlane(Math.cos(angle)*size/Math.sqrt(3),Math.sin(angle)*size/Math.sqrt(3));return{x:x+p.x,y:y+p.y};});
}
export function edgePoints(p,edge) {const v=corners(p.x,p.y);return[v[edge],v[(edge+1)%6]];}
export function pointSegment(p,a,b) {
  const q=toPlane(p.x,p.y),u=toPlane(a.x,a.y),v=toPlane(b.x,b.y),dx=v.x-u.x,dy=v.y-u.y;
  if(dx===0&&dy===0)return Math.hypot(q.x-u.x,q.y-u.y);
  const t=Math.max(0,Math.min(1,((q.x-u.x)*dx+(q.y-u.y)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(q.x-u.x-t*dx,q.y-u.y-t*dy);
}
export const wallEdges = p => Number.isInteger(p.edge)?[p.edge]:[0,1,2,3,4,5]; // Old saves keep the outline of their old wall cells.
const segmentCache=new WeakMap();
export function wallSegments(p) {
  let cache=segmentCache.get(p);
  if(!cache||cache.x!==p.x||cache.y!==p.y||cache.edge!==p.edge){cache={x:p.x,y:p.y,edge:p.edge,segments:wallEdges(p).map(edge=>edgePoints(p,edge))};segmentCache.set(p,cache);}
  return cache.segments;
}
export function wallDistance(p,point) {let result=Infinity;for(const [a,b] of wallSegments(p))result=Math.min(result,pointSegment(point,a,b));return result;}
export function sameEdge(a,b) {
  for(const i of wallEdges(a))for(const j of wallEdges(b)) {
    if(a.x===b.x&&a.y===b.y&&i===j)return true;
    const [dx,dy]=HEX_DIRS[i];if(a.x+dx===b.x&&a.y+dy===b.y&&(i+3)%6===j)return true;
  }
  return false;
}
export function intersects(a,b,u,v) {
  const p=toPlane(a.x,a.y),q=toPlane(b.x,b.y),r=toPlane(u.x,u.y),s=toPlane(v.x,v.y);
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const x=cross(p,q,r),y=cross(p,q,s),z=cross(r,s,p),w=cross(r,s,q);
  return (x*y<0&&z*w<0)||Math.min(pointSegment(a,u,v),pointSegment(b,u,v),pointSegment(u,a,b),pointSegment(v,a,b))<.06;
}

export function segmentDistance(a,b,u,v){
  const p=toPlane(a.x,a.y),q=toPlane(b.x,b.y),r=toPlane(u.x,u.y),s=toPlane(v.x,v.y);
  const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)return 0;
  return Math.min(pointSegment(a,u,v),pointSegment(b,u,v),pointSegment(u,a,b),pointSegment(v,a,b));
}
