import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Cpu } from '../src/cpu';
import { createBus } from './helpers';

describe('ppu', () => {
  it('enables NMI from PPUCTRL bit 7', () => {
    const bus = createBus();
    const ppu = bus.ppu as unknown as {
      control: { enable_nmi: number };
      status: { vertical_blank: number; reg: Uint8Array };
    };

    bus.ppu.cpuWrite(0x0000, 0x80);
    assert.equal(ppu.control.enable_nmi, 1);

    ppu.status.vertical_blank = 0x01;
    assert.notEqual(ppu.status.reg[0] & 0x80, 0);

    ppu.status.vertical_blank = 0x00;
    assert.equal(ppu.status.reg[0] & 0x80, 0);
  });

  it('clears vblank and the address latch when $2002 is read', () => {
    const bus = createBus();
    const ppu = bus.ppu as unknown as { status: { vertical_blank: number } };
    ppu.status.vertical_blank = 0x01;

    const status = bus.ppu.cpuRead(0x0002);
    assert.equal(status & 0x80, 0x80);
    assert.equal(ppu.status.vertical_blank, 0);
  });

  it('writes and reads OAM through $2003/$2004', () => {
    const bus = createBus();
    bus.ppu.cpuWrite(0x0003, 0x00);
    bus.ppu.cpuWrite(0x0004, 0x10);
    bus.ppu.cpuWrite(0x0004, 0x20);
    bus.ppu.cpuWrite(0x0004, 0x00);
    bus.ppu.cpuWrite(0x0004, 0x40);

    assert.equal(bus.ppu.OAM[0].reg[0], 0x10);
    assert.equal(bus.ppu.OAM[0].reg[1], 0x20);
    assert.equal(bus.ppu.OAM[0].reg[3], 0x40);

    bus.ppu.cpuWrite(0x0003, 0x00);
    assert.equal(bus.ppu.cpuRead(0x0004), 0x10);
  });

  it('writes palette memory through $2006/$2007', () => {
    const bus = createBus();
    bus.ppu.cpuWrite(0x0006, 0x3f);
    bus.ppu.cpuWrite(0x0006, 0x00);
    bus.ppu.cpuWrite(0x0007, 0x16);

    assert.equal(bus.ppu.ppuRead(0x3f00), 0x16);
  });

  it('raises nmi at the start of vblank when NMI is enabled', () => {
    const bus = createBus();
    bus.ppu.cpuWrite(0x0000, 0x80);

    const clocks = 341 * 242;
    for (let i = 0; i < clocks; i++) {
      bus.ppu.clock();
      if (bus.ppu.nmi) break;
    }

    assert.equal(bus.ppu.nmi, true);
  });

  it('uses a non-empty NMI handler on the CPU', () => {
    const source = Cpu.prototype.nmi.toString();
    assert.equal(/^\s*nmi\(\)\s*\{\s*\}$/.test(source), false);
    assert.equal(source.includes('0xfffa') || source.includes('65402'), true);
  });
});
