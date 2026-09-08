/**
 * Headless checks for APU sample generation and bus mixing.
 * Run: npm run validate:apu
 */
import { Apu } from '../src/apu';
import { Bus } from '../src/bus';
import { Cartridge } from '../src/cartridge';

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

function collectSamples(apu: Apu, clocks: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < clocks; i++) {
    apu.clock();
    if (i % 6 === 0) samples.push(apu.getOutputSample());
  }
  return samples;
}

function energy(samples: number[]): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return sum / Math.max(samples.length, 1);
}

function programPulse1(apu: Apu): void {
  apu.cpuWrite(0x4015, 0x01);
  apu.cpuWrite(0x4000, 0xbf);
  apu.cpuWrite(0x4002, 0xfd);
  apu.cpuWrite(0x4003, 0x00);
}

function programTriangle(apu: Apu): void {
  apu.cpuWrite(0x4015, 0x04);
  apu.cpuWrite(0x4008, 0xff);
  apu.cpuWrite(0x400a, 0x7f);
  apu.cpuWrite(0x400b, 0x08);
}

function programNoise(apu: Apu): void {
  apu.cpuWrite(0x4015, 0x08);
  apu.cpuWrite(0x400c, 0x3f);
  apu.cpuWrite(0x400e, 0x04);
  apu.cpuWrite(0x400f, 0x08);
}

const pulse = new Apu();
programPulse1(pulse);
const pulseSamples = collectSamples(pulse, 80000);
assert(energy(pulseSamples) > 1e-6, 'pulse 1 should produce audible samples');

const triangle = new Apu();
programTriangle(triangle);
const triangleSamples = collectSamples(triangle, 80000);
assert(energy(triangleSamples) > 1e-6, 'triangle should produce audible samples');

const noise = new Apu();
programNoise(noise);
const noiseSamples = collectSamples(noise, 80000);
assert(energy(noiseSamples) > 1e-6, 'noise should produce audible samples');

const silent = new Apu();
silent.cpuWrite(0x4015, 0x00);
const silentSamples = collectSamples(silent, 20000);
assert(energy(silentSamples) === 0, 'disabled channels should stay silent');

const bus = new Bus();
bus.insertCartridge(new Cartridge(buildINesRom()));
bus.reset();
bus.setSampleFrequency(44100);
programPulse1(bus.apu);

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

assert(ready > 1000, `bus should emit audio samples, got ${ready}`);
assert(mixed > 0, 'bus.audioSample should mix APU output');
assert(peak <= 1.0, `mixed samples should not clip, peak was ${peak}`);

console.log('validate-apu: ok');
