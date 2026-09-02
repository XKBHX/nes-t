/**
 * Headless checks for NES controller mapping and $4016/$4017 strobe.
 * Run: npm run validate:controller
 */
import { Bus } from '../src/bus';
import { Cartridge } from '../src/cartridge';
import {
  NES_BUTTON,
  connectedGamepads,
  nesButtonsFromGamepad,
  packNesButtons,
} from '../src/controller';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function buildINesRom(): ArrayBuffer {
  const prgSize = 16384;
  const chrSize = 8192;
  const buffer = new ArrayBuffer(16 + prgSize + chrSize);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x4e;
  bytes[1] = 0x45;
  bytes[2] = 0x53;
  bytes[3] = 0x1a;
  bytes[4] = 1;
  bytes[5] = 1;

  const vectorBase = 16 + prgSize - 6;
  bytes[vectorBase + 2] = 0x00;
  bytes[vectorBase + 3] = 0x80;

  return buffer;
}

function strobe(bus: Bus): void {
  bus.cpuWrite(0x4016, 1);
  bus.cpuWrite(0x4016, 0);
}

function readPort(bus: Bus, address: number, bits = 8): number {
  let value = 0;
  for (let i = 0; i < bits; i++) {
    value = (value << 1) | (bus.cpuRead(address) & 0x01);
  }
  return value;
}

function testButtonPacking(): void {
  assert(packNesButtons({ a: true }) === NES_BUTTON.A, 'A should set 0x80');
  assert(packNesButtons({ b: true }) === NES_BUTTON.B, 'B should set 0x40');
  assert(packNesButtons({ select: true }) === NES_BUTTON.SELECT, 'Select should set 0x20');
  assert(packNesButtons({ start: true }) === NES_BUTTON.START, 'Start should set 0x10');
  assert(packNesButtons({ up: true }) === NES_BUTTON.UP, 'Up should set 0x08');
  assert(packNesButtons({ down: true }) === NES_BUTTON.DOWN, 'Down should set 0x04');
  assert(packNesButtons({ left: true }) === NES_BUTTON.LEFT, 'Left should set 0x02');
  assert(packNesButtons({ right: true }) === NES_BUTTON.RIGHT, 'Right should set 0x01');
  assert(packNesButtons({ up: true, down: true }) === 0, 'opposite vertical directions cancel');
  assert(packNesButtons({ left: true, right: true }) === 0, 'opposite horizontal directions cancel');
}

function testGamepadMapping(): void {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  const axes = [0, 0];
  const press = (index: number) => { buttons[index].pressed = true; };

  press(0);
  assert(nesButtonsFromGamepad({ buttons, axes }) === NES_BUTTON.A, 'South face is NES A');
  buttons[0].pressed = false;

  press(1);
  assert(nesButtonsFromGamepad({ buttons, axes }) === NES_BUTTON.B, 'East face is NES B');
  buttons[1].pressed = false;

  press(8);
  press(9);
  assert(
    nesButtonsFromGamepad({ buttons, axes }) === (NES_BUTTON.SELECT | NES_BUTTON.START),
    'Back/Start map to Select/Start'
  );
  buttons[8].pressed = false;
  buttons[9].pressed = false;

  press(12);
  press(15);
  assert(
    nesButtonsFromGamepad({ buttons, axes }) === (NES_BUTTON.UP | NES_BUTTON.RIGHT),
    'D-pad up/right map correctly'
  );
  buttons[12].pressed = false;
  buttons[15].pressed = false;

  axes[0] = -0.9;
  axes[1] = 0.9;
  assert(
    nesButtonsFromGamepad({ buttons, axes }) === (NES_BUTTON.LEFT | NES_BUTTON.DOWN),
    'left stick past deadzone drives the d-pad'
  );

  const pads = connectedGamepads([null, { buttons, axes }, null]);
  assert(pads.length === 1, 'null gamepad slots are skipped');

  buttons.forEach((button) => { button.pressed = false; });
  axes[0] = 0;
  axes[1] = 0;

  const analogFace = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  analogFace[0] = { pressed: false, value: 1 };
  assert(nesButtonsFromGamepad({ buttons: analogFace, axes }) === NES_BUTTON.A, 'button.value >= 0.5 counts as pressed');

  const standardTriggers = Array.from({ length: 16 }, () => ({ pressed: false }));
  standardTriggers[6] = { pressed: true };
  standardTriggers[7] = { pressed: true };
  assert(
    nesButtonsFromGamepad({ buttons: standardTriggers, axes, mapping: 'standard' }) === 0,
    'standard LT/RT must not map to Select/Start'
  );

  const rawButtons = Array.from({ length: 11 }, () => ({ pressed: false }));
  const rawAxes = [0, 0, 0, 0, 0, 0, 0, 0];
  rawButtons[7] = { pressed: true };
  rawAxes[6] = 1;
  rawAxes[7] = -1;
  assert(
    nesButtonsFromGamepad({ buttons: rawButtons, axes: rawAxes, mapping: '', id: 'Xbox Wireless Controller' }) ===
      (NES_BUTTON.START | NES_BUTTON.UP | NES_BUTTON.RIGHT),
    'raw Xbox HID Menu + hat map to Start and D-pad'
  );

  rawButtons[7] = { pressed: false };
  rawButtons[6] = { pressed: true };
  rawAxes[6] = 0;
  rawAxes[7] = 0;
  assert(
    nesButtonsFromGamepad({ buttons: rawButtons, axes: rawAxes, mapping: '' }) === NES_BUTTON.SELECT,
    'raw Xbox HID View maps to Select'
  );

  const ghost = { buttons: [], axes: [], mapping: '' };
  const xbox = { buttons, axes, mapping: 'standard' as const };
  const ordered = connectedGamepads([ghost, { buttons, axes, mapping: '' }, xbox]);
  assert(ordered[0] === xbox, 'standard-mapped pads are preferred over raw or empty slots');
}

function testBusStrobe(): void {
  const bus = new Bus();
  bus.insertCartridge(new Cartridge(buildINesRom()));

  bus.controller[0] = NES_BUTTON.A | NES_BUTTON.RIGHT;
  strobe(bus);
  assert(readPort(bus, 0x4016) === (NES_BUTTON.A | NES_BUTTON.RIGHT), 'player 1 shift register matches latched buttons');

  bus.controller[0] = NES_BUTTON.B | NES_BUTTON.START;
  assert(
    (bus.cpuRead(0x4016) & 0x01) === 1,
    'reads after 8 bits return 1 on an official-style controller'
  );

  bus.controller[1] = NES_BUTTON.SELECT | NES_BUTTON.LEFT;
  strobe(bus);
  assert(readPort(bus, 0x4017) === (NES_BUTTON.SELECT | NES_BUTTON.LEFT), 'player 2 is strobed from $4016');

  bus.controller[0] = NES_BUTTON.A;
  bus.cpuWrite(0x4016, 1);
  assert((bus.cpuRead(0x4016) & 0x01) === 1, 'held strobe keeps reporting A');
  bus.controller[0] = 0;
  assert((bus.cpuRead(0x4016) & 0x01) === 0, 'held strobe reloads live button state');

  bus.controller[0] = NES_BUTTON.START;
  strobe(bus);
  assert((bus.cpuRead(0x4016, true) & 0x01) === 0, 'read-only peek of A bit is 0 when Start is held');
  assert(readPort(bus, 0x4016) === NES_BUTTON.START, 'read-only peeks must not consume the shift register');
}

function main(): void {
  testButtonPacking();
  testGamepadMapping();
  testBusStrobe();
  console.log('validate-controller: all checks passed');
}

main();
