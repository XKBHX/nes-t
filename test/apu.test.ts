import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Apu } from '../src/apu';
import { createBus, energy } from './helpers';

function collectSamples(apu: Apu, clocks: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < clocks; i++) {
    apu.clock();
    if (i % 6 === 0) samples.push(apu.getOutputSample());
  }
  return samples;
}

describe('apu', () => {
  it('produces audible pulse, triangle, and noise', () => {
    const pulse = new Apu();
    pulse.cpuWrite(0x4015, 0x01);
    pulse.cpuWrite(0x4000, 0xbf);
    pulse.cpuWrite(0x4002, 0xfd);
    pulse.cpuWrite(0x4003, 0x00);
    assert.ok(energy(collectSamples(pulse, 80000)) > 1e-6);

    const triangle = new Apu();
    triangle.cpuWrite(0x4015, 0x04);
    triangle.cpuWrite(0x4008, 0xff);
    triangle.cpuWrite(0x400a, 0x7f);
    triangle.cpuWrite(0x400b, 0x08);
    assert.ok(energy(collectSamples(triangle, 80000)) > 1e-6);

    const noise = new Apu();
    noise.cpuWrite(0x4015, 0x08);
    noise.cpuWrite(0x400c, 0x3f);
    noise.cpuWrite(0x400e, 0x04);
    noise.cpuWrite(0x400f, 0x08);
    assert.ok(energy(collectSamples(noise, 80000)) > 1e-6);
  });

  it('stays silent when all channels are disabled', () => {
    const silent = new Apu();
    silent.cpuWrite(0x4015, 0x00);
    assert.equal(energy(collectSamples(silent, 20000)), 0);
  });

  it('reports enabled length counters on $4015', () => {
    const apu = new Apu();
    apu.cpuWrite(0x4015, 0x01);
    apu.cpuWrite(0x4000, 0xbf);
    apu.cpuWrite(0x4003, 0x00);
    assert.equal(apu.cpuRead(0x4015) & 0x01, 0x01);
  });

  it('mixes APU output through the system bus without clipping', () => {
    const bus = createBus();
    bus.setSampleFrequency(44100);
    bus.apu.cpuWrite(0x4015, 0x01);
    bus.apu.cpuWrite(0x4000, 0xbf);
    bus.apu.cpuWrite(0x4002, 0xfd);
    bus.apu.cpuWrite(0x4003, 0x00);

    let ready = 0;
    let mixed = 0;
    let peak = 0;
    for (let i = 0; i < 200000; i++) {
      if (bus.clock()) {
        ready++;
        mixed += Math.abs(bus.audioSample);
        peak = Math.max(peak, Math.abs(bus.audioSample));
      }
    }

    assert.ok(ready > 1000, `expected audio samples, got ${ready}`);
    assert.ok(mixed > 0);
    assert.ok(peak <= 1.0, `peak was ${peak}`);
  });
});
