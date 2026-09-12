import * as fs from 'fs';
import * as path from 'path';
import { Cartridge } from '../src/cartridge';
import { Bus } from '../src/bus';
import { Cpu } from '../src/cpu';
import { Ppu } from '../src/ppu';
import { Mapper } from '../src/mapper';

export interface INesOptions {
  mapper?: number;
  prgBanks?: number;
  chrBanks?: number;
  mirrorVertical?: boolean;
  prg?: ArrayLike<number>;
  chr?: ArrayLike<number>;
  nmi?: number;
  reset?: number;
  irq?: number;
}

export function buildINesRom(options: INesOptions = {}): ArrayBuffer {
  const mapper = options.mapper ?? 0;
  const prgBanks = options.prgBanks ?? 1;
  const chrBanks = options.chrBanks ?? 1;
  const prgSize = prgBanks * 16384;
  const chrSize = chrBanks * 8192;
  const buffer = new ArrayBuffer(16 + prgSize + chrSize);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x4e;
  bytes[1] = 0x45;
  bytes[2] = 0x53;
  bytes[3] = 0x1a;
  bytes[4] = prgBanks;
  bytes[5] = chrBanks;
  bytes[6] = ((mapper & 0x0f) << 4) | (options.mirrorVertical ? 0x01 : 0x00);
  bytes[7] = mapper & 0xf0;

  if (options.prg) {
    bytes.set(options.prg, 16);
  }

  if (options.chr && chrSize > 0) {
    bytes.set(options.chr, 16 + prgSize);
  }

  const nmi = options.nmi ?? 0x8000;
  const reset = options.reset ?? 0x8000;
  const irq = options.irq ?? 0x9000;
  const vectorBase = 16 + prgSize - 6;
  bytes[vectorBase + 0] = nmi & 0xff;
  bytes[vectorBase + 1] = (nmi >> 8) & 0xff;
  bytes[vectorBase + 2] = reset & 0xff;
  bytes[vectorBase + 3] = (reset >> 8) & 0xff;
  bytes[vectorBase + 4] = irq & 0xff;
  bytes[vectorBase + 5] = (irq >> 8) & 0xff;

  return buffer;
}

export function createBus(options: INesOptions = {}): Bus {
  const bus = new Bus();
  bus.insertCartridge(new Cartridge(buildINesRom(options)));
  bus.reset();
  return bus;
}

export function stepCpu(cpu: Cpu): void {
  do {
    cpu.clock();
  } while (!cpu.complete());
}

export function mappedAddress(mapper: Mapper, method: 'cpu' | 'ppu', address: number): number {
  const mapped = { mappedAddress: 0xffffffff };
  const data = { data: 0 };
  const ok =
    method === 'cpu'
      ? mapper.cpuMapRead(address, mapped, data)
      : mapper.ppuMapRead(address, mapped);
  if (!ok) {
    throw new Error(`${method} map of $${address.toString(16)} failed`);
  }
  return mapped.mappedAddress;
}

export function mmc1Write(mapper: Mapper, address: number, value: number): void {
  const mapped = { mappedAddress: 0 };
  mapper.cpuMapWrite(address, mapped, 0x80);
  for (let i = 0; i < 5; i++) {
    mapper.cpuMapWrite(address, mapped, (value >> i) & 1);
  }
}

export function energy(samples: number[]): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return sum / Math.max(samples.length, 1);
}

/** Finish the current CPU instruction, then count clocks used by the next one. */
export function countInstructionCycles(cpu: Cpu): number {
  while (!cpu.complete()) cpu.clock();
  let clocks = 0;
  do {
    cpu.clock();
    clocks++;
  } while (!cpu.complete());
  return clocks;
}

export function ppuResetLatch(ppu: Ppu): void {
  ppu.cpuRead(0x0002);
}

export function ppuSetAddress(ppu: Ppu, address: number): void {
  ppu.cpuWrite(0x0006, (address >> 8) & 0xff);
  ppu.cpuWrite(0x0006, address & 0xff);
}

export function findTestRom(...names: string[]): string | null {
  const roots = [
    path.join(__dirname, '..', 'rom'),
    path.join(__dirname, '..', 'src', 'rom'),
    path.join(__dirname, 'roms'),
  ];
  for (const root of roots) {
    for (const name of names) {
      const candidate = path.join(root, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

export function loadCartridge(romPath: string): Cartridge {
  const rom = fs.readFileSync(romPath);
  return new Cartridge(rom.buffer.slice(rom.byteOffset, rom.byteOffset + rom.byteLength));
}
