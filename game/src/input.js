// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (jump, dash, hide, start, pause) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_JUMP = 4;
export const ACTION_DASH = 8;
export const ACTION_HIDE = 16;
export const ACTION_MUTE = 32;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const DASH = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);
const HIDE = new Set(['ArrowDown', 'KeyS', 'KeyH']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let actions = 0;
  // Pointer x in canvas CSS pixels; null when the pointer is not held down.
  let pointerX = null;
  let pointerDown = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (JUMP.has(event.code)) { if (!event.repeat) actions |= ACTION_JUMP; }
    else if (DASH.has(event.code)) { if (!event.repeat) actions |= ACTION_DASH; }
    else if (HIDE.has(event.code)) { if (!event.repeat) actions |= ACTION_HIDE; }
    else if (CONFIRM.has(event.code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(event.code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (MUTE.has(event.code)) { if (!event.repeat) actions |= ACTION_MUTE; }
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  window.addEventListener('blur', () => { left = false; right = false; pointerDown = false; pointerX = null; });

  function trackPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
  }
  canvas.addEventListener('pointerdown', (event) => {
    pointerDown = true;
    trackPointer(event);
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => { if (pointerDown) trackPointer(event); });
  window.addEventListener('pointerup', () => { pointerDown = false; pointerX = null; });

  return {
    /** -1 for left, 1 for right, 0 for neither or both (keys win over pointer). */
    direction(canvasWidth, turkeyScreenX) {
      const keys = (right ? 1 : 0) - (left ? 1 : 0);
      if (keys !== 0 || pointerX === null) return keys;
      const target = (pointerX / Math.max(1, canvasWidth)) * 1280;
      if (target > turkeyScreenX + 24) return 1;
      if (target < turkeyScreenX - 24) return -1;
      return 0;
    },
    pointerHeld() { return pointerDown; },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
