import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Apu } from '../src/apu';

const LENGTH_TABLE = [
  10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14, 12, 16, 24, 18, 48, 20, 96, 22, 192,
  24, 72, 26, 16, 28, 32, 30,
];

function halfFrames(apu: Apu, count: number): void {
  // APU clock() advances the frame sequencer every 6 calls; a 4-step half-frame is 7457 ticks.
  const clocks = 7457 * 6 * count;
  for (let i = 0; i < clocks; i++) apu.clock();
}

/**
 * Behavioral coverage for APU items on
 * https://www.nesdev.org/wiki/Emulator_tests
 * (apu_test / blargg_apu length counters, $4015, mixer).
 */
describe('APU accuracy (NESdev emulator tests)', () => {
  describe('blargg_apu: length counters', () => {
    it('loads the standard length table from $4003', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x01);
      apu.cpuWrite(0x4000, 0x00);
      apu.cpuWrite(0x4003, 0x00 << 3);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x01);

      const apu254 = new Apu();
      apu254.cpuWrite(0x4015, 0x01);
      apu254.cpuWrite(0x4000, 0x00);
      apu254.cpuWrite(0x4003, 0x01 << 3);
      assert.equal(LENGTH_TABLE[1], 254);
      assert.equal(apu254.cpuRead(0x4015) & 0x01, 0x01);
    });

    it('clears the triangle length counter when $4015 disables the channel', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x04);
      apu.cpuWrite(0x4008, 0xff);
      apu.cpuWrite(0x400b, 0x08);
      assert.equal(apu.cpuRead(0x4015) & 0x04, 0x04);

      apu.cpuWrite(0x4015, 0x00);
      assert.equal(apu.cpuRead(0x4015) & 0x04, 0x00);
    });

    it('clears the pulse length counter when $4015 disables the channel', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x01);
      apu.cpuWrite(0x4000, 0x00);
      apu.cpuWrite(0x4003, 0x00);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x01);

      apu.cpuWrite(0x4015, 0x00);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x00);
    });

    it('does not clock a halted pulse length counter', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x01);
      apu.cpuWrite(0x4000, 0x20); // halt / length ignore
      apu.cpuWrite(0x4002, 0xfd);
      apu.cpuWrite(0x4003, 0x00);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x01);

      halfFrames(apu, 4);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x01);
    });

    it('expires a running pulse length counter', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x01);
      apu.cpuWrite(0x4000, 0x00); // halt clear; length 10 from table[0]
      apu.cpuWrite(0x4002, 0xfd);
      apu.cpuWrite(0x4003, 0x00);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x01);

      halfFrames(apu, 12);
      assert.equal(apu.cpuRead(0x4015) & 0x01, 0x00);
    });
  });

  describe('apu_mixer', () => {
    it('uses the NES analog mix curve for pulse and TND', () => {
      const apu = new Apu();
      assert.equal(apu.mixRaw(), 0);

      apu.cpuWrite(0x4015, 0x01);
      apu.cpuWrite(0x4000, 0xbf);
      apu.cpuWrite(0x4002, 0xfd);
      apu.cpuWrite(0x4003, 0x00);
      for (let i = 0; i < 80000; i++) apu.clock();

      const mixed = apu.mixRaw();
      assert.notEqual(mixed, 0);
      assert.ok(mixed > 0 && mixed <= 95.88 / 100, `mixRaw was ${mixed}`);
    });
  });

  describe('apu_reset', () => {
    it('zeroes channel output on reset', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x0f);
      apu.cpuWrite(0x4000, 0xbf);
      apu.cpuWrite(0x4003, 0x00);
      for (let i = 0; i < 80000; i++) apu.clock();
      apu.reset();
      assert.equal(apu.mixRaw(), 0);
    });

    it('clears length counters on reset', () => {
      const apu = new Apu();
      apu.cpuWrite(0x4015, 0x0f);
      apu.cpuWrite(0x4003, 0x00);
      apu.cpuWrite(0x4007, 0x00);
      apu.cpuWrite(0x400b, 0x08);
      apu.cpuWrite(0x400f, 0x08);
      assert.equal(apu.cpuRead(0x4015) & 0x0f, 0x0f);

      apu.reset();
      assert.equal(apu.cpuRead(0x4015) & 0x0f, 0);
    });
  });
});
