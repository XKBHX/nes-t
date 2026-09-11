import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Cpu, CPU_FLAG } from '../src/cpu';
import { createBus, stepCpu } from './helpers';

describe('cpu', () => {
  it('sets and clears status flags', () => {
    const cpu = new Cpu();
    cpu.setFlag(CPU_FLAG.C, true);
    cpu.setFlag(CPU_FLAG.Z, true);
    cpu.setFlag(CPU_FLAG.N, true);
    assert.equal(cpu.getFlag(CPU_FLAG.C), 1);
    assert.equal(cpu.getFlag(CPU_FLAG.Z), 1);
    assert.equal(cpu.getFlag(CPU_FLAG.N), 1);

    cpu.setFlag(CPU_FLAG.C, false);
    assert.equal(cpu.getFlag(CPU_FLAG.C), 0);
    assert.equal(cpu.getFlag(CPU_FLAG.Z), 1);
  });

  it('loads the reset vector and initializes registers', () => {
    const bus = createBus({
      prg: [0xea],
      reset: 0x8000,
    });

    assert.equal(bus.cpu.pc[0], 0x8000);
    assert.equal(bus.cpu.a[0], 0x00);
    assert.equal(bus.cpu.x[0], 0x00);
    assert.equal(bus.cpu.y[0], 0x00);
    assert.equal(bus.cpu.stkp[0], 0xfd);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.U), 1);
    assert.equal(bus.cpu.cycles[0], 8);
  });

  it('executes LDA immediate, STA zero page, and ADC immediate', () => {
    const bus = createBus({
      prg: [
        0xa9, 0x40, // LDA #$40
        0x8d, 0x10, 0x00, // STA $0010
        0x69, 0x02, // ADC #$02
        0xea, // NOP
      ],
    });

    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x40);

    stepCpu(bus.cpu);
    assert.equal(bus.cpuRead(0x0010), 0x40);

    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x42);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 0);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.N), 0);
  });

  it('sets the zero and negative flags from LDA', () => {
    const bus = createBus({
      prg: [
        0xa9, 0x00, // LDA #$00
        0xa9, 0x80, // LDA #$80
      ],
    });

    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x00);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 1);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.N), 0);

    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x80);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 0);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.N), 1);
  });

  it('jumps with JMP absolute', () => {
    const prg = new Uint8Array(32);
    prg[0] = 0x4c;
    prg[1] = 0x10;
    prg[2] = 0x80;
    prg[0x10] = 0xa9;
    prg[0x11] = 0x33;
    const bus = createBus({ prg });

    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    assert.equal(bus.cpu.pc[0], 0x8010);

    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x33);
  });

  it('pushes a return address with JSR and restores it with RTS', () => {
    const prg = new Uint8Array(64);
    prg[0] = 0x20; // JSR $8010
    prg[1] = 0x10;
    prg[2] = 0x80;
    prg[3] = 0xa9; // LDA #$99
    prg[4] = 0x99;
    prg[0x10] = 0xa9; // LDA #$11
    prg[0x11] = 0x11;
    prg[0x12] = 0x60; // RTS
    const bus = createBus({ prg });

    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x11);

    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0x99);
  });

  it('vectors NMI through $FFFA', () => {
    const prg = new Uint8Array(16384);
    prg[0] = 0xea;
    prg[0x0100] = 0xa9;
    prg[0x0101] = 0xab;
    const bus = createBus({ prg, nmi: 0x8100, reset: 0x8000 });

    bus.cpu.nmi();
    assert.equal(bus.cpu.pc[0], 0x8100);
    assert.equal(bus.cpu.getFlag(CPU_FLAG.I), 1);
    assert.equal(bus.cpu.cycles[0], 8);

    stepCpu(bus.cpu);
    stepCpu(bus.cpu);
    assert.equal(bus.cpu.a[0], 0xab);
  });

  it('ignores IRQ while the interrupt disable flag is set', () => {
    const bus = createBus({ prg: [0xea], irq: 0x9000 });
    const pc = bus.cpu.pc[0];
    bus.cpu.setFlag(CPU_FLAG.I, true);
    bus.cpu.irq();
    assert.equal(bus.cpu.pc[0], pc);
  });

  it('disassembles immediate LDA', () => {
    const bus = createBus({ prg: [0xa9, 0x42] });
    const lines = bus.cpu.disassemble(0x8000, 0x8001);
    assert.match(lines[0x8000], /LDA #\$42 \{IMM\}/);
  });
});
