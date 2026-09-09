// Pointer Events own gameplay input; Touch Events only suppress WebKit defaults.
export function preventGesture(event) {
  if (event.cancelable) event.preventDefault();
}

export function installGestureGuard(surfaces) {
  for (const surface of surfaces) {
    for (const name of ['touchmove', 'gesturestart', 'gesturechange', 'gestureend']) {
      surface.addEventListener(name, preventGesture, { passive: false });
    }
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
