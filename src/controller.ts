/** Standard NES shift-register bit order (MSB first on $4016/$4017). */
export const NES_BUTTON = {
  A: 0x80,
  B: 0x40,
  SELECT: 0x20,
  START: 0x10,
  UP: 0x08,
  DOWN: 0x04,
  LEFT: 0x02,
  RIGHT: 0x01,
} as const;

export const GAMEPAD_AXIS_DEADZONE = 0.5;

export interface NesButtonState {
  a?: boolean;
  b?: boolean;
  select?: boolean;
  start?: boolean;
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
}

export interface GamepadLike {
  buttons: ArrayLike<{ pressed?: boolean; value?: number }>;
  axes: ArrayLike<number>;
  mapping?: string;
  id?: string;
}

export function packNesButtons(input: NesButtonState): number {
  let state = 0;
  if (input.a) state |= NES_BUTTON.A;
  if (input.b) state |= NES_BUTTON.B;
  if (input.select) state |= NES_BUTTON.SELECT;
  if (input.start) state |= NES_BUTTON.START;
  if (input.up) state |= NES_BUTTON.UP;
  if (input.down) state |= NES_BUTTON.DOWN;
  if (input.left) state |= NES_BUTTON.LEFT;
  if (input.right) state |= NES_BUTTON.RIGHT;
  return clearOpposingDirections(state);
}

export function clearOpposingDirections(state: number): number {
  if ((state & NES_BUTTON.UP) && (state & NES_BUTTON.DOWN)) {
    state &= ~(NES_BUTTON.UP | NES_BUTTON.DOWN);
  }
  if ((state & NES_BUTTON.LEFT) && (state & NES_BUTTON.RIGHT)) {
    state &= ~(NES_BUTTON.LEFT | NES_BUTTON.RIGHT);
  }
  return state & 0xff;
}

function pressed(buttons: ArrayLike<{ pressed?: boolean; value?: number }>, index: number): boolean {
  const button = buttons[index];
  if (!button) return false;
  if (button.pressed) return true;
  return typeof button.value === 'number' && button.value >= 0.5;
}

function axisHeld(axes: ArrayLike<number>, index: number, direction: 'neg' | 'pos'): boolean {
  const value = axes[index];
  if (value === undefined || Number.isNaN(value)) return false;
  return direction === 'neg' ? value <= -GAMEPAD_AXIS_DEADZONE : value >= GAMEPAD_AXIS_DEADZONE;
}

/**
 * Xbox / DirectInput hat switches are usually axes 6 (X) and 7 (Y), idle at 0.
 * Skip analog-looking values so triggers that rest at -1 are not treated as a hold.
 */
function hatDirection(axes: ArrayLike<number>, index: number, direction: 'neg' | 'pos'): boolean {
  const value = axes[index];
  if (value === undefined || Number.isNaN(value)) return false;
  const magnitude = Math.abs(value);
  if (magnitude > 0.15 && Math.abs(magnitude - 1) > 0.15 && Math.abs(magnitude - Math.SQRT1_2) > 0.15) {
    return false;
  }
  return direction === 'neg' ? value <= -GAMEPAD_AXIS_DEADZONE : value >= GAMEPAD_AXIS_DEADZONE;
}

/**
 * True when the browser remapped the pad to the W3C standard layout.
 * Test fixtures omit `mapping` and are treated as standard.
 */
export function usesStandardGamepadMapping(gamepad: GamepadLike): boolean {
  return gamepad.mapping !== '';
}

/**
 * Map a gamepad to NES buttons.
 * Standard layout: South / RB = A, East or West / LB = B, Back = Select, Start = Start.
 * Raw Xbox HID (empty mapping, common for Series X|S on Chrome/macOS): View = 6, Menu = 7,
 * D-pad as hat axes 6/7. D-pad and left stick both drive the NES d-pad.
 */
export function nesButtonsFromGamepad(gamepad: GamepadLike): number {
  const buttons = gamepad.buttons;
  const axes = gamepad.axes;
  const standard = usesStandardGamepadMapping(gamepad);

  return packNesButtons({
    a: pressed(buttons, 0) || pressed(buttons, 5),
    b: pressed(buttons, 1) || pressed(buttons, 2) || pressed(buttons, 4),
    select: pressed(buttons, 8) || (!standard && pressed(buttons, 6)),
    start: pressed(buttons, 9) || (!standard && pressed(buttons, 7)),
    up: pressed(buttons, 12) || axisHeld(axes, 1, 'neg') || (!standard && hatDirection(axes, 7, 'neg')),
    down: pressed(buttons, 13) || axisHeld(axes, 1, 'pos') || (!standard && hatDirection(axes, 7, 'pos')),
    left: pressed(buttons, 14) || axisHeld(axes, 0, 'neg') || (!standard && hatDirection(axes, 6, 'neg')),
    right: pressed(buttons, 15) || axisHeld(axes, 0, 'pos') || (!standard && hatDirection(axes, 6, 'pos')),
  });
}

export function connectedGamepads(list: ArrayLike<GamepadLike | null>): GamepadLike[] {
  const pads: GamepadLike[] = [];
  for (let i = 0; i < list.length; i++) {
    const pad = list[i];
    if (pad && pad.buttons && pad.buttons.length > 0) pads.push(pad);
  }
  pads.sort((a, b) => Number(usesStandardGamepadMapping(b)) - Number(usesStandardGamepadMapping(a)));
  return pads;
}
