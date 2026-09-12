import {fromPlane,metric} from './hex.js';
export function joystickVector(x,y){
 const length=Math.hypot(x,y);if(length<=.09)return {x:0,y:0};
 const amount=(Math.min(1,length)-.09)/.91;
 return {x:x/length*amount,y:y/length*amount};
}
export function movementVector(x,y){
 const d=fromPlane(x+y*2,-x+y*2),length=metric(d,{x:0,y:0}),amount=Math.min(1,Math.hypot(x,y));
 return length?{x:d.x/length*amount,y:d.y/length*amount}:{x:0,y:0};
}
// Pointer Events own gameplay input; Touch Events only suppress WebKit defaults.
export function preventGesture(event) {
  if (event.cancelable) event.preventDefault();
}

export function installGestureGuard(surfaces) {
  for (const surface of surfaces) {
    for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
      surface.addEventListener(name, preventGesture, { passive: false });
    }
    surface.addEventListener('touchmove', event => {
      if (event.target.closest?.('#world, #joystick, .action')) preventGesture(event);
    }, { passive: false });
    // Native edge navigation/long-press must not take a joystick or action touch.
    // Keep ordinary HUD buttons' synthetic clicks intact.
    surface.addEventListener('touchstart', event => {
      if (event.target.closest?.('#world, #joystick, .action')) preventGesture(event);
    }, { passive: false });
    surface.addEventListener('contextmenu', preventGesture);
  }
}

// Exactly one pointer owns a control. Other fingers can own other controls.
export function bindPointer(element, { enabled = () => true, start, move, end }) {
  let owner = null;
  function release(event = null) {
    if (owner === null) return;
    const id = owner;
    owner = null; // releasePointerCapture may synchronously deliver lost capture.
    if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
    end?.(event);
  }
  element.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    preventGesture(event);
    if (owner !== null || !enabled()) return;
    owner = event.pointerId;
    element.setPointerCapture(owner);
    start?.(event);
  }, { passive: false });
  element.addEventListener('pointermove', event => {
    if (event.pointerId !== owner) return;
    preventGesture(event);
    move?.(event);
  }, { passive: false });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(name, event => {
      if (event.pointerId !== owner) return;
      preventGesture(event);
      release(event);
    });
  }
  return { reset: release };
}
// HUD taps do not depend on WebKit's compatibility mouse click.
export function bindTap(element,activate){
 let origin=null,cancelled=false;
 const binding=bindPointer(element,{
  start:event=>{origin={x:event.clientX,y:event.clientY};cancelled=false;},
  move:event=>{if(Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>10)cancelled=true;},
  end:event=>{if(event?.type==='pointerup'&&!cancelled){const r=element.getBoundingClientRect();if(event.clientX>=r.left&&event.clientX<=r.left+r.width&&event.clientY>=r.top&&event.clientY<=r.top+r.height)activate();}origin=null;}
 });
 element.onclick=event=>{if(!event||event.detail===0)activate();}; // Keyboard / assistive activation only.
 return binding;
}
