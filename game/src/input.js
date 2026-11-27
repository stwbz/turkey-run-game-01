// Keyboard input as a per-frame action snapshot: gameplay reads actions,
// never raw events, so the autopilot can feed the same shape.
// Controls: Left/A lane left, Right/D lane right, Space/Up/W jump,
// Shift dash, S/Down hide, P pause, R restart, Enter/Space confirm, M mute.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(target) {
  const keys = new Set();
  let actions = 0;

  function onKeyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyR') actions |= ACTION_RESTART;
    if (e.code === 'KeyM') actions |= ACTION_MUTE;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onBlur() {
    keys.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  // Held state for this frame. `hide` is edge-triggered via the actions
  // snapshot below; the run reads `hidePressed` once per step.
  function held() {
    return {
      left: keys.has('ArrowLeft') || keys.has('KeyA'),
      right: keys.has('ArrowRight') || keys.has('KeyD'),
      jump: keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW'),
      dash: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      hide: keys.has('KeyS') || keys.has('ArrowDown'),
    };
  }

  function takeActions() {
    const a = actions;
    actions = 0;
    return a;
  }

  function dispose() {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', onBlur);
  }

  return { held, takeActions, dispose };
}
