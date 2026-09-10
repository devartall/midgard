// Two fixed-length bones; the hand is clamped to a reachable arc.
export function armPose(shoulder,target,side=1,upper=10,lower=10){
 const dx=target.x-shoulder.x,dy=target.y-shoulder.y,raw=Math.hypot(dx,dy),d=Math.max(2,Math.min(upper+lower-.5,raw));
 const ux=raw>1e-6?dx/raw:0,uy=raw>1e-6?dy/raw:1,a=(upper*upper-lower*lower+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-a*a));
 return {shoulder,elbow:{x:shoulder.x+ux*a-uy*h*side,y:shoulder.y+uy*a+ux*h*side},hand:{x:shoulder.x+ux*d,y:shoulder.y+uy*d}};
}
