export const ENEMY_REACH = {wolf:.95,draugr:1.1,breaker:1.25,boss:2.8};
import { toPlane, fromPlane, pointSegment } from './hex.js';
export const MELEE = {
  sword:{reach:1.05,windup:.16,active:.18,recovery:.24,damage:24},
  hands:{reach:.52,windup:.1,active:.14,recovery:.22,damage:7},
};
export function swingPose(swing,time) {
  if(!swing)return null;
  const spec=MELEE[swing.weapon];if(!spec)return null;
  const age=time-swing.started,total=spec.windup+spec.active+spec.recovery;
  if(age<0||age>total)return null;
  const phase=age<spec.windup?'windup':age<=spec.windup+spec.active?'active':'recovery';
  const progress=Math.max(0,Math.min(1,(age-spec.windup)/spec.active));
  const angle=swing.angle-.8+progress*1.6;
  return {phase,progress,angle,reach:spec.reach,age,total};
}
export function bladeSegment(origin,angle,reach) {
  const near=fromPlane(Math.cos(angle)*.23,Math.sin(angle)*.23),far=fromPlane(Math.cos(angle)*reach,Math.sin(angle)*reach);
  return [{x:origin.x+near.x,y:origin.y+near.y},{x:origin.x+far.x,y:origin.y+far.y}];
}
export function sweptHit(swing,origin,target,fromTime,toTime) {
  const spec=MELEE[swing.weapon],start=swing.started+spec.windup,end=start+spec.active;
  if(toTime<start||fromTime>end)return false;
  const lo=Math.max(start,fromTime),hi=Math.min(end,toTime);
  // Sample the swept blade, not a radial auto-hit. Sampling bounds angular gaps.
  for(let i=0;i<=12;i++) {
    const angle=swing.angle-.8+(lo+(hi-lo)*i/12-start)/spec.active*1.6;
    if(pointSegment(target,...bladeSegment(origin,angle,spec.reach))<=.16)return true;
  }
  return false;
}
export function aimAngle(facing) {const p=toPlane(facing.x,facing.y);return Math.atan2(p.y,p.x);}
