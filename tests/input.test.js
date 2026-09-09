import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPointer, installGestureGuard } from '../src/input.js';

class Surface {
  listeners = new Map();
  captures = new Set();
  addEventListener(name, listener, options) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push({ listener, options });
  }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); this.send('lostpointercapture', { pointerId: id }); }
  send(name, data = {}) {
    const event = { type:name, pointerId: 1, pointerType: 'touch', button: 0, cancelable: true, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...data };
    for (const { listener } of this.listeners.get(name) || []) listener(event);
    return event;
  }
}

test('a second finger cannot steal or release a captured control', () => {
  const surface = new Surface(); let starts = 0, moves = 0, ends = 0;
  bindPointer(surface, { start: () => starts++, move: () => moves++, end: () => ends++ });
  assert.ok(surface.send('pointerdown').defaultPrevented);
  surface.send('pointerdown', { pointerId: 2 });
  surface.send('pointermove', { pointerId: 2 });
  surface.send('pointerup', { pointerId: 2 });
  assert.equal(starts, 1); assert.equal(moves, 0); assert.equal(ends, 0);
  assert.ok(surface.hasPointerCapture(1));
  assert.ok(surface.send('pointermove').defaultPrevented);
  surface.send('pointerup');
  assert.equal(moves, 1); assert.equal(ends, 1); assert.equal(surface.captures.size, 0);
});

test('joystick and block can be held independently; cancel and reset cannot stick input', () => {
  const stick = new Surface(), block = new Surface(); let walking = false, guarding = false;
  const movement = bindPointer(stick, { start: () => walking = true, end: () => walking = false });
  bindPointer(block, { start: () => guarding = true, end: () => guarding = false });
  stick.send('pointerdown', { pointerId: 10 }); block.send('pointerdown', { pointerId: 20 });
  assert.ok(walking && guarding);
  block.send('pointercancel', { pointerId: 20 }); assert.ok(walking); assert.equal(guarding, false);
  movement.reset(); assert.equal(walking, false); assert.equal(stick.captures.size, 0);
  stick.send('pointerdown', { pointerId: 30 }); stick.send('lostpointercapture', { pointerId: 30 });
  assert.equal(walking, false);
});

test('desktop left mouse dragging is supported; right click and disabled input do not act', () => {
  const surface = new Surface(); let enabled = true, starts = 0, moves = 0;
  bindPointer(surface, { enabled: () => enabled, start: () => starts++, move: () => moves++ });
  surface.send('pointerdown', { pointerType: 'mouse', button: 2 }); assert.equal(starts, 0);
  surface.send('pointerdown', { pointerType: 'mouse' });
  surface.send('pointermove', { pointerType: 'mouse', clientX: -100 });
  surface.send('pointerup', { pointerType: 'mouse' });
  assert.equal(starts, 1); assert.equal(moves, 1);
  enabled = false; surface.send('pointerdown'); assert.equal(starts, 1);
});

test('WebKit fallback cancels game gestures without suppressing HUD taps or touching menu scroll', () => {
  const world = new Surface(), hud = new Surface(), menu = new Surface();
  installGestureGuard([world, hud]);
  for (const name of ['touchmove', 'gesturestart', 'gesturechange', 'gestureend']) {
    assert.equal(world.listeners.get(name)[0].options.passive, false);
    assert.ok(world.send(name).defaultPrevented);
  }
  assert.ok(hud.send('touchstart', { target: { closest: () => ({}) } }).defaultPrevented);
  assert.equal(hud.send('touchstart', { target: { closest: () => null } }).defaultPrevented, false);
  assert.equal(menu.listeners.size, 0);
  assert.equal(world.send('touchmove', { cancelable: false }).defaultPrevented, false);
});

test('construction release distinguishes commit from cancellation, lost capture and pause reset',()=>{
  const surface=new Surface(),results=[];const binding=bindPointer(surface,{end:event=>results.push(event?.type||'reset')});
  for(const name of ['pointerup','pointercancel','lostpointercapture']){surface.send('pointerdown');surface.send(name);}
  surface.send('pointerdown');binding.reset();assert.deepEqual(results,['pointerup','pointercancel','lostpointercapture','reset']);
});
