import { HEX_DIRS, hexRound, edgePoints, pointSegment, sameEdge } from './hex.js';

// A drag selects an axial parallelogram; walls follow its six-neighbour perimeter.
export function placementPlan(g,type,start,end,edge=null) {
  const a=hexRound(start.x,start.y),b=hexRound(end.x,end.y),drag=a.x!==b.x||a.y!==b.y;
  if(!['floor','wall','reinforce','door'].includes(type))return [{type,...b}];
  if(Math.abs(a.x-b.x)>10||Math.abs(a.y-b.y)>10)return [];
  if(type==='floor'){
    const result=[];
    for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)if(!g.parts.some(p=>p.type==='floor'&&p.x===x&&p.y===y))result.push({type,x,y});
    return result;
  }
  const floors=g.parts.filter(p=>p.type==='floor');
  if(!drag||type==='door'){
    const candidates=[];
    for(const p of floors)for(let i=0;i<6;i++){
      if(edge!==null&&i!==edge)continue;
      const candidate={type,x:p.x,y:p.y,edge:i};
      const occupied=g.parts.find(w=>['wall','door','reinforce'].includes(w.type)&&sameEdge(w,candidate));
      if(occupied&&(occupied.type===type||!Number.isInteger(occupied.edge)))continue;
      if(occupied)candidate.replaces=occupied.type;
      const [dx,dy]=HEX_DIRS[i];
      // Prefer outer edges, but allow interior partitions when explicitly oriented.
      if(edge===null&&!occupied&&floors.some(f=>f.x===p.x+dx&&f.y===p.y+dy))continue;
      const d=pointSegment(end,...edgePoints(p,i));if(d<1.25)candidates.push({...candidate,d});
    }
    candidates.sort((a,b)=>a.d-b.d);return candidates.slice(0,1);
  }
  const selected=floors.filter(p=>p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y));
  const keys=new Set(selected.map(p=>`${p.x},${p.y}`)),result=[];
  for(const p of selected)for(let i=0;i<6;i++){
    const [dx,dy]=HEX_DIRS[i],candidate={type,x:p.x,y:p.y,edge:i};
    if(!keys.has(`${p.x+dx},${p.y+dy}`)&&!g.parts.some(w=>['wall','door','reinforce'].includes(w.type)&&sameEdge(w,candidate)))result.push(candidate);
  }
  return result;
}
export function planCost(plan,parts){
 const cost={};for(const p of plan){
  for(const[k,n]of Object.entries(parts[p.type].cost))cost[k]=(cost[k]||0)+n;
  if(p.replaces)for(const[k,n]of Object.entries(parts[p.replaces].cost))cost[k]=(cost[k]||0)-n;
 }return Object.fromEntries(Object.entries(cost).filter(([,n])=>n!==0));
}
