import { MELEE, swingPose } from './combat.js';
import { toPlane } from './hex.js';
// Presentation state follows simulation time, so pause freezes every pose.
// Weak keys avoid retaining actors after death, respawn or a new world.
export class ActorAnimator {
  constructor() { this.states = new WeakMap(); }

  pose(actor, time) {
    let state = this.states.get(actor);
    if (!state) {
      state = { x: actor.x, y: actor.y, time, phase: 0, pace: 0, facing: 1, strike: 0, windup: 0 };
      this.states.set(actor, state);
    }
    const dt = time - state.time;
    if (dt > 0) {
      const {x:dx,y:dy} = toPlane(actor.x - state.x, actor.y - state.y);
      const travel = Math.hypot(dx, dy);
      // Do not animate a sprint across a teleport or an offscreen interval.
      if (dt <= .25 && travel < 1) {
        state.phase += travel * 5.5;
        state.pace += (Math.min(1, travel / dt / 2.5) - state.pace) * (1 - Math.exp(-dt * 20));
        if (Math.abs(dx - dy) > .001) state.facing = Math.sign(dx - dy);
      } else state.pace = 0;
      state.x = actor.x; state.y = actor.y; state.time = time;
    }
    const swing=swingPose(actor.swing,time);
    const elapsed = time - actor.strikeAt;
    state.strike = Number.isFinite(elapsed) && elapsed >= 0 && elapsed < .4 ? 1 - elapsed / .4 : 0;
    state.windup = actor.phase === 'windup' ? Math.max(0, Math.min(1, 1 - actor.timer / (actor.windupTime || 1))) : 0;
    const f=actor.facing?toPlane(actor.facing.x,actor.facing.y):toPlane(actor.attackFacingX||0,actor.attackFacingY||0);
    const look=swing?Math.cos(actor.swing.angle)-Math.sin(actor.swing.angle):f.x-f.y;
    if(swing){state.windup=swing.phase==='windup'?swing.age/MELEE[actor.swing.weapon].windup:0;state.strike=swing.phase==='active'?1-swing.progress:0;}
    if ((state.strike || state.windup || actor.blocking) && Number.isFinite(look) && Math.abs(look) > .01) state.facing = Math.sign(look);
    if(actor.harvest){const age=time-actor.harvest.started,direction=toPlane(actor.harvest.facing.x,actor.harvest.facing.y),side=direction.x-direction.y;state.windup=age<.12?age/.12:0;state.strike=age>=.12?Math.max(0,1-(age-.12)/.43):0;if(Math.abs(side)>.01)state.facing=Math.sign(side);}
    state.step = Math.sin(state.phase) * state.pace;
    state.bob = -Math.abs(Math.cos(state.phase)) * state.pace * 2;
    state.lunge = actor.swing?0:Math.sin(state.strike * Math.PI) * 5;
    return state;
  }
}
