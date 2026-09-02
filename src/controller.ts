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
  buttons: ArrayLike<{ pressed: boolean }>;
  axes: ArrayLike<number>;
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

function pressed(buttons: ArrayLike<{ pressed: boolean }>, index: number): boolean {
  return Boolean(buttons[index] && buttons[index].pressed);
}

/**
 * Map a W3C Standard Gamepad to NES buttons.
 * South / RB = A, East or West / LB = B, Back = Select, Start = Start.
 * D-pad and left stick both drive the NES d-pad.
 */
export function nesButtonsFromGamepad(gamepad: GamepadLike): number {
  const buttons = gamepad.buttons;
  const ax = gamepad.axes[0] ?? 0;
  const ay = gamepad.axes[1] ?? 0;

  return packNesButtons({
    a: pressed(buttons, 0) || pressed(buttons, 5),
    b: pressed(buttons, 1) || pressed(buttons, 2) || pressed(buttons, 4),
    select: pressed(buttons, 8),
    start: pressed(buttons, 9),
    up: pressed(buttons, 12) || ay < -GAMEPAD_AXIS_DEADZONE,
    down: pressed(buttons, 13) || ay > GAMEPAD_AXIS_DEADZONE,
    left: pressed(buttons, 14) || ax < -GAMEPAD_AXIS_DEADZONE,
    right: pressed(buttons, 15) || ax > GAMEPAD_AXIS_DEADZONE,
  });
}

export function connectedGamepads(list: ArrayLike<GamepadLike | null>): GamepadLike[] {
  const pads: GamepadLike[] = [];
  for (let i = 0; i < list.length; i++) {
    const pad = list[i];
    if (pad) pads.push(pad);
  }
  return pads;
}
