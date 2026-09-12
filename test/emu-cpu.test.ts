import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CPU_FLAG } from '../src/cpu';
import { countInstructionCycles, createBus, stepCpu } from './helpers';

/**
 * Behavioral coverage for CPU items on
 * https://www.nesdev.org/wiki/Emulator_tests
 * (nestest, instr_test-v5, branch_timing_tests, cpu_interrupts_v2, cpu_reset).
 */
describe('CPU accuracy (NESdev emulator tests)', () => {
  describe('instr_test-v5 / nestest: official instructions', () => {
    it('sets overflow when ADC crosses from + to -', () => {
      const bus = createBus({
        prg: [
          0x18, // CLC
          0xa9, 0x50, // LDA #$50
          0x69, 0x50, // ADC #$50
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.a[0], 0xa0);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.V), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.N), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.C), 0);
    });

    it('implements SBC as inverted ADC', () => {
      const bus = createBus({
        prg: [
          0x38, // SEC
          0xa9, 0x50, // LDA #$50
          0xe9, 0x20, // SBC #$20
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.a[0], 0x30);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.C), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 0);
    });

    it('updates Z, N, and V from BIT', () => {
      const bus = createBus({
        prg: [
          0xa9, 0x0f, // LDA #$0F
          0x24, 0x10, // BIT $10
        ],
      });
      bus.cpuWrite(0x0010, 0xc0);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.a[0], 0x0f);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.N), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.V), 1);
    });

    it('compares with CMP and sets C when A >= M', () => {
      const bus = createBus({
        prg: [
          0xa9, 0x02, // LDA #$02
          0xc9, 0x01, // CMP #$01
          0xc9, 0x02, // CMP #$02
          0xc9, 0x03, // CMP #$03
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.C), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 0);

      stepCpu(bus.cpu);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.C), 1);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 1);

      stepCpu(bus.cpu);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.C), 0);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.Z), 0);
    });

    it('wraps zero-page indexed addresses', () => {
      const bus = createBus({
        prg: [
          0xa2, 0x03, // LDX #$03
          0xa9, 0x77, // LDA #$77
          0x95, 0xfe, // STA $FE,X -> $01
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpuRead(0x0001), 0x77);
      assert.equal(bus.cpuRead(0x0101), 0x00);
    });

    it('reproduces the JMP ($xxFF) 6502 page-wrap bug', () => {
      const prg = new Uint8Array(64);
      prg[0] = 0x6c; // JMP ($02FF)
      prg[1] = 0xff;
      prg[2] = 0x02;
      prg[0x20] = 0xa9; // LDA #$5a at $8020
      prg[0x21] = 0x5a;
      const bus = createBus({ prg });
      bus.cpuWrite(0x02ff, 0x20);
      bus.cpuWrite(0x0200, 0x80);
      bus.cpuWrite(0x0300, 0x00);

      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.pc[0], 0x8020);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.a[0], 0x5a);
    });
  });

  describe('instr_test-v5: unofficial opcodes', () => {
    it('loads A and X with LAX zero page', () => {
      const bus = createBus({
        prg: [0xa7, 0x10], // LAX $10
      });
      bus.cpuWrite(0x0010, 0x3c);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.a[0], 0x3c);
      assert.equal(bus.cpu.x[0], 0x3c);
    });

    it('stores A & X with SAX zero page', () => {
      const bus = createBus({
        prg: [
          0xa9, 0xf3, // LDA #$F3
          0xa2, 0x1e, // LDX #$1E
          0x87, 0x20, // SAX $20
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpuRead(0x0020), 0x12);
    });
  });

  describe('branch_timing_tests', () => {
    it('uses 2 cycles when a branch is not taken', () => {
      const bus = createBus({
        prg: [
          0xa9, 0x00, // LDA #$00  (Z=1)
          0xd0, 0x00, // BNE *+2
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(countInstructionCycles(bus.cpu), 2);
    });

    it('uses 3 cycles when a branch is taken on the same page', () => {
      const bus = createBus({
        prg: [
          0xa9, 0x01, // LDA #$01  (Z=0)
          0xd0, 0x00, // BNE *+2
        ],
      });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(countInstructionCycles(bus.cpu), 3);
    });

    it('uses 4 cycles when a taken branch crosses a page', () => {
      const prg = new Uint8Array(512);
      prg[0] = 0x4c;
      prg[1] = 0xfb;
      prg[2] = 0x80; // JMP $80FB
      prg[0x00fb] = 0xa9;
      prg[0x00fc] = 0x01; // LDA #$01
      prg[0x00fd] = 0xd0;
      prg[0x00fe] = 0x02; // BNE $8101 (page cross)
      prg[0x0101] = 0xea;
      const bus = createBus({ prg });
      stepCpu(bus.cpu); // reset
      stepCpu(bus.cpu); // JMP
      stepCpu(bus.cpu); // LDA
      assert.equal(countInstructionCycles(bus.cpu), 4);
    });

    it('adds a cycle for LDA absolute,X when the index crosses a page', () => {
      const prg = new Uint8Array(64);
      prg[0] = 0xa2;
      prg[1] = 0x20; // LDX #$20
      prg[2] = 0xbd;
      prg[3] = 0xf0;
      prg[4] = 0x80; // LDA $80F0,X -> $8110
      const bus = createBus({ prg });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(countInstructionCycles(bus.cpu), 5);
    });
  });

  describe('cpu_interrupts_v2', () => {
    it('pushes B and U set when PHP runs', () => {
      const bus = createBus({
        prg: [0x08], // PHP
      });
      const sp = bus.cpu.stkp[0];
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpuRead(0x0100 + sp) & (CPU_FLAG.B | CPU_FLAG.U), CPU_FLAG.B | CPU_FLAG.U);
    });

    it('vectors BRK through $FFFE and sets I', () => {
      const prg = new Uint8Array(16384);
      prg[0] = 0x00; // BRK
      prg[0x1000] = 0xea;
      const bus = createBus({ prg, irq: 0x9000 });
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.pc[0], 0x9000);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.I), 1);
    });

    it('takes IRQ when I is clear and ignores it when I is set', () => {
      const prg = new Uint8Array(16384);
      prg[0] = 0xea;
      prg[0x1000] = 0xa9;
      prg[0x1001] = 0x44;
      const bus = createBus({ prg, irq: 0x9000 });

      bus.cpu.setFlag(CPU_FLAG.I, true);
      const blocked = bus.cpu.pc[0];
      bus.cpu.irq();
      assert.equal(bus.cpu.pc[0], blocked);

      bus.cpu.setFlag(CPU_FLAG.I, false);
      bus.cpu.irq();
      assert.equal(bus.cpu.pc[0], 0x9000);
    });

    it('restores PC with RTI after NMI', () => {
      const prg = new Uint8Array(16384);
      prg[0] = 0xea;
      prg[0x0100] = 0x40; // RTI at NMI vector $8100
      const bus = createBus({ prg, nmi: 0x8100, reset: 0x8000 });
      stepCpu(bus.cpu);
      const returnPc = bus.cpu.pc[0];
      bus.cpu.nmi();
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      assert.equal(bus.cpu.pc[0], returnPc);
    });
  });

  describe('cpu_reset', () => {
    it('starts at the reset vector with A/X/Y=0 and SP=$FD', () => {
      const bus = createBus({ prg: [0xea], reset: 0x8000 });
      assert.equal(bus.cpu.pc[0], 0x8000);
      assert.equal(bus.cpu.a[0], 0);
      assert.equal(bus.cpu.x[0], 0);
      assert.equal(bus.cpu.y[0], 0);
      assert.equal(bus.cpu.stkp[0], 0xfd);
      assert.equal(bus.cpu.getFlag(CPU_FLAG.U), 1);
    });

    it('does not clear CPU RAM on reset', () => {
      const bus = createBus({ prg: [0xea] });
      bus.cpuWrite(0x0010, 0xbe);
      bus.reset();
      assert.equal(bus.cpuRead(0x0010), 0xbe);
    });
  });

  describe('cpu_dummy_reads', () => {
    it('dummy-reads $2002 on STA abs,X even without a page cross', () => {
      const bus = createBus({
        prg: [
          0xa2, 0x00, // LDX #$00
          0x9d, 0x02, 0x20, // STA $2002,X
        ],
      });
      const ppu = bus.ppu as unknown as { status: { vertical_blank: number } };
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      ppu.status.vertical_blank = 1;
      stepCpu(bus.cpu);
      assert.equal(ppu.status.vertical_blank, 0);
    });

    it('dummy-reads $2002 on STA (ind),Y', () => {
      const bus = createBus({
        prg: [
          0xa0, 0x00, // LDY #$00
          0x91, 0x10, // STA ($10),Y
        ],
      });
      bus.cpuWrite(0x0010, 0x02);
      bus.cpuWrite(0x0011, 0x20);
      const ppu = bus.ppu as unknown as { status: { vertical_blank: number } };
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      ppu.status.vertical_blank = 1;
      stepCpu(bus.cpu);
      assert.equal(ppu.status.vertical_blank, 0);
    });

    it('dummy-reads $2002 then $2102 on LDA $20FF,X with X=$03', () => {
      const bus = createBus({
        prg: [
          0xa2, 0x03, // LDX #$03
          0xbd, 0xff, 0x20, // LDA $20FF,X
        ],
      });
      const ppu = bus.ppu as unknown as { status: { vertical_blank: number } };
      stepCpu(bus.cpu);
      stepCpu(bus.cpu);
      ppu.status.vertical_blank = 1;
      stepCpu(bus.cpu);
      assert.equal(ppu.status.vertical_blank, 0);
      assert.equal(bus.cpu.a[0] & 0x80, 0);
    });
  });

  describe('cpu_dummy_writes', () => {
    it('RMW dummy-writes $2006 before the modified value', () => {
      const bus = createBus({
        prg: [
          0xee, 0x06, 0x20, // INC $2006
        ],
      });
      const ppu = bus.ppu as unknown as {
        addressLatch: Uint8Array;
        vRamAddress: { reg: Uint16Array };
      };
      stepCpu(bus.cpu);
      ppu.addressLatch[0] = 0;
      ppu.vRamAddress.reg[0] = 0;
      stepCpu(bus.cpu);
      assert.equal(ppu.addressLatch[0], 0);
      assert.equal(ppu.vRamAddress.reg[0], 0x0001);
    });
  });
});
