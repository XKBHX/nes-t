import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NES_BUTTON,
  connectedGamepads,
  nesButtonsFromGamepad,
  packNesButtons,
  usesStandardGamepadMapping,
} from '../src/controller';
import { Bus } from '../src/bus';
import { Cartridge } from '../src/cartridge';
import { buildINesRom } from './helpers';

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

describe('controller', () => {
  it('packs NES buttons in shift-register order', () => {
    assert.equal(packNesButtons({ a: true }), NES_BUTTON.A);
    assert.equal(packNesButtons({ b: true }), NES_BUTTON.B);
    assert.equal(packNesButtons({ select: true }), NES_BUTTON.SELECT);
    assert.equal(packNesButtons({ start: true }), NES_BUTTON.START);
    assert.equal(packNesButtons({ up: true }), NES_BUTTON.UP);
    assert.equal(packNesButtons({ down: true }), NES_BUTTON.DOWN);
    assert.equal(packNesButtons({ left: true }), NES_BUTTON.LEFT);
    assert.equal(packNesButtons({ right: true }), NES_BUTTON.RIGHT);
  });

  it('cancels opposite d-pad directions', () => {
    assert.equal(packNesButtons({ up: true, down: true }), 0);
    assert.equal(packNesButtons({ left: true, right: true }), 0);
  });

  it('maps a standard gamepad to NES buttons', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const axes = [0, 0];
    const press = (index: number) => {
      buttons[index].pressed = true;
    };

    press(0);
    assert.equal(nesButtonsFromGamepad({ buttons, axes }), NES_BUTTON.A);
    buttons[0].pressed = false;

    press(1);
    assert.equal(nesButtonsFromGamepad({ buttons, axes }), NES_BUTTON.B);
    buttons[1].pressed = false;

    press(8);
    press(9);
    assert.equal(
      nesButtonsFromGamepad({ buttons, axes }),
      NES_BUTTON.SELECT | NES_BUTTON.START
    );
  });

  it('treats analog button values of 0.5 or more as pressed', () => {
    const analogFace = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    analogFace[0] = { pressed: false, value: 1 };
    assert.equal(nesButtonsFromGamepad({ buttons: analogFace, axes: [0, 0] }), NES_BUTTON.A);
  });

  it('does not map standard LT/RT to Select/Start', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    buttons[6] = { pressed: true };
    buttons[7] = { pressed: true };
    assert.equal(
      nesButtonsFromGamepad({ buttons, axes: [0, 0], mapping: 'standard' }),
      0
    );
  });

  it('maps raw Xbox HID View/Menu and hat axes', () => {
    const rawButtons = Array.from({ length: 11 }, () => ({ pressed: false }));
    const rawAxes = [0, 0, 0, 0, 0, 0, 0, 0];
    rawButtons[7] = { pressed: true };
    rawAxes[6] = 1;
    rawAxes[7] = -1;
    assert.equal(
      nesButtonsFromGamepad({
        buttons: rawButtons,
        axes: rawAxes,
        mapping: '',
        id: 'Xbox Wireless Controller',
      }),
      NES_BUTTON.START | NES_BUTTON.UP | NES_BUTTON.RIGHT
    );

    rawButtons[7] = { pressed: false };
    rawButtons[6] = { pressed: true };
    rawAxes[6] = 0;
    rawAxes[7] = 0;
    assert.equal(
      nesButtonsFromGamepad({ buttons: rawButtons, axes: rawAxes, mapping: '' }),
      NES_BUTTON.SELECT
    );
  });

  it('prefers standard-mapped pads and skips empty slots', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const axes = [0, 0];
    const ghost = { buttons: [], axes: [], mapping: '' };
    const xbox = { buttons, axes, mapping: 'standard' as const };
    const pads = connectedGamepads([ghost, { buttons, axes, mapping: '' }, xbox]);
    assert.equal(pads[0], xbox);
    assert.equal(usesStandardGamepadMapping(xbox), true);
    assert.equal(usesStandardGamepadMapping({ buttons, axes, mapping: '' }), false);
    assert.equal(connectedGamepads([null, { buttons, axes }, null]).length, 1);
  });

  it('strobes $4016/$4017 as an 8-bit shift register', () => {
    const bus = new Bus();
    bus.insertCartridge(new Cartridge(buildINesRom()));

    bus.controller[0] = NES_BUTTON.A | NES_BUTTON.RIGHT;
    strobe(bus);
    assert.equal(readPort(bus, 0x4016), NES_BUTTON.A | NES_BUTTON.RIGHT);

    bus.controller[0] = NES_BUTTON.B | NES_BUTTON.START;
    assert.equal(bus.cpuRead(0x4016) & 0x01, 1);

    bus.controller[1] = NES_BUTTON.SELECT | NES_BUTTON.LEFT;
    strobe(bus);
    assert.equal(readPort(bus, 0x4017), NES_BUTTON.SELECT | NES_BUTTON.LEFT);
  });

  it('reloads live buttons while strobe is held and ignores read-only peeks', () => {
    const bus = new Bus();
    bus.insertCartridge(new Cartridge(buildINesRom()));

    bus.controller[0] = NES_BUTTON.A;
    bus.cpuWrite(0x4016, 1);
    assert.equal(bus.cpuRead(0x4016) & 0x01, 1);
    bus.controller[0] = 0;
    assert.equal(bus.cpuRead(0x4016) & 0x01, 0);

    bus.controller[0] = NES_BUTTON.START;
    strobe(bus);
    assert.equal(bus.cpuRead(0x4016, true) & 0x01, 0);
    assert.equal(readPort(bus, 0x4016), NES_BUTTON.START);
  });
});
