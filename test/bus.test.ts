import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Bus } from '../src/bus';
import { Cartridge } from '../src/cartridge';
import { NES_BUTTON } from '../src/controller';
import { buildINesRom, createBus } from './helpers';

describe('bus', () => {
  it('mirrors CPU RAM every 2KB through $0000-$1FFF', () => {
    const bus = createBus();
    bus.cpuWrite(0x0000, 0xab);
    assert.equal(bus.cpuRead(0x0000), 0xab);
    assert.equal(bus.cpuRead(0x0800), 0xab);
    assert.equal(bus.cpuRead(0x1000), 0xab);
    assert.equal(bus.cpuRead(0x1800), 0xab);

    bus.cpuWrite(0x0801, 0xcd);
    assert.equal(bus.cpuRead(0x0001), 0xcd);
  });

  it('forwards $2000-$3FFF to the PPU with 8-byte mirroring', () => {
    const bus = createBus();
    bus.cpuWrite(0x2000, 0x80);
    const control = bus.ppu.cpuRead(0x0000, true);
    assert.equal(control, 0x80);

    bus.cpuWrite(0x2001, 0x1e);
    const mask = bus.ppu.cpuRead(0x0001, true);
    assert.equal(mask, 0x1e);
  });

  it('resets CPU, PPU, APU, and controller state', () => {
    const bus = new Bus();
    bus.insertCartridge(new Cartridge(buildINesRom({ prg: [0xea] })));
    bus.controller[0] = NES_BUTTON.A;
    bus.cpuWrite(0x0000, 0xff);
    bus.reset();

    assert.equal(bus.cpu.pc[0], 0x8000);
    assert.equal(bus.controller[0], 0);
    assert.equal(bus.cpu.stkp[0], 0xfd);
  });

  it('clocks the CPU once every three PPU cycles', () => {
    const bus = createBus({ prg: [0xea, 0xea, 0xea] });
    const startCycles = bus.cpu.cycles[0];

    bus.clock();
    assert.equal(bus.cpu.cycles[0], (startCycles - 1) & 0xff);

    bus.clock();
    bus.clock();
    assert.equal(bus.cpu.cycles[0], (startCycles - 1) & 0xff);

    bus.clock();
    assert.equal(bus.cpu.cycles[0], (startCycles - 2) & 0xff);
  });
});
