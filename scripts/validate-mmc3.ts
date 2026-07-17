/**
 * Headless checks for the SMB3 / MMC3 rendering fixes.
 * Run: npx ts-node --compiler-options '{"module":"commonjs","baseUrl":"./src"}' scripts/validate-mmc3.ts
 */
import { Cartridge } from '../src/cartridge';
import { Mapper004 } from '../src/mapper/004';
import { Cpu } from '../src/cpu';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function buildINesRom(mapper: number, prgBanks: number, chrBanks: number): ArrayBuffer {
  const prgSize = prgBanks * 16384;
  const chrSize = Math.max(chrBanks, 1) * 8192;
  const buffer = new ArrayBuffer(16 + prgSize + chrSize);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x4e;
  bytes[1] = 0x45;
  bytes[2] = 0x53;
  bytes[3] = 0x1a;
  bytes[4] = prgBanks;
  bytes[5] = chrBanks;
  bytes[6] = (mapper & 0x0f) << 4;
  bytes[7] = mapper & 0xf0;

  // Distinctive CHR pattern: each 1KB bank starts with its bank index.
  const chrOffset = 16 + prgSize;
  for (let bank = 0; bank < chrSize / 1024; bank++) {
    bytes[chrOffset + bank * 1024] = bank;
    bytes[chrOffset + bank * 1024 + 1] = 0xaa;
  }

  // Reset / NMI / IRQ vectors in last PRG page
  const vectorBase = 16 + prgSize - 6;
  bytes[vectorBase + 0] = 0x00; // NMI lo
  bytes[vectorBase + 1] = 0x80; // NMI hi -> $8000
  bytes[vectorBase + 2] = 0x00; // RESET lo
  bytes[vectorBase + 3] = 0x80; // RESET hi
  bytes[vectorBase + 4] = 0x00; // IRQ lo
  bytes[vectorBase + 5] = 0x90; // IRQ hi -> $9000

  return buffer;
}

function testCartridgePpuRead(): void {
  const rom = buildINesRom(4, 2, 1);
  const cart = new Cartridge(rom);
  assert(cart.imageValid(), 'synthetic MMC3 ROM should be valid');

  const data = { data: 0xff };
  const ok = cart.ppuRead(0x0000, data);
  assert(ok, 'Cartridge.ppuRead must succeed via ppuMapRead');
  assert(data.data === 0x00, `expected CHR bank 0 marker, got ${data.data}`);

  // Select R0 = 5 (odd). 2KB bank must use even base (bank 4 / 5).
  const mapper = cart.getMapper() as Mapper004;
  mapper.cpuMapWrite(0x8000, { mappedAddress: 0 }, 0x00); // select R0
  mapper.cpuMapWrite(0x8001, { mappedAddress: 0 }, 0x05); // odd value

  const lo = { data: 0xff };
  const hi = { data: 0xff };
  assert(cart.ppuRead(0x0000, lo), 'read low half of 2KB bank');
  assert(cart.ppuRead(0x0400, hi), 'read high half of 2KB bank');
  assert(lo.data === 4, `2KB low half should be bank 4, got ${lo.data}`);
  assert(hi.data === 5, `2KB high half should be bank 5, got ${hi.data}`);
}

function testIrqReload(): void {
  const mapper = new Mapper004(2, 1);

  mapper.cpuMapWrite(0xc000, { mappedAddress: 0 }, 3); // latch
  mapper.cpuMapWrite(0xc001, { mappedAddress: 0 }, 0); // reload pending
  mapper.cpuMapWrite(0xe001, { mappedAddress: 0 }, 0); // enable

  mapper.scanline(); // reload to 3
  assert(!mapper.irqState(), 'IRQ should not fire immediately after reload to 3');

  mapper.scanline(); // 3 -> 2
  mapper.scanline(); // 2 -> 1
  mapper.scanline(); // 1 -> 0 => IRQ
  assert(mapper.irqState(), 'IRQ should fire when counter reaches 0');
}

function testNmiImplemented(): void {
  const source = Cpu.prototype.nmi.toString();
  assert(!/^\s*nmi\(\)\s*\{\s*\}$/.test(source), 'CPU.nmi must not be an empty stub');
  assert(source.includes('0xfffa') || source.includes('65402'), 'CPU.nmi must use the NMI vector');
}

function testPpuNmiBit(): void {
  // enable_nmi is bit 7 of $2000; inverted masks previously blocked NMIs for all games.
  const { Ppu } = require('../src/ppu');
  const ppu = new Ppu();
  ppu.cpuWrite(0x0000, 0x80);
  assert(!!ppu['control'].enable_nmi, 'PPUCTRL bit 7 must enable NMI');
  ppu['status'].vertical_blank = 0x01;
  assert((ppu['status'].reg[0] & 0x80) !== 0, 'VBlank must set status bit 7');
  ppu['status'].vertical_blank = 0x00;
  assert((ppu['status'].reg[0] & 0x80) === 0, 'VBlank must be clearable');
}

function testSmb3Rom(): void {
  const fs = require('fs');
  const path = require('path');
  const romPath = path.join(__dirname, '../src/rom/Super Mario Bros 3 (E).nes');
  if (!fs.existsSync(romPath)) {
    console.log('validate-mmc3: SMB3 ROM not present, skipping ROM smoke test');
    return;
  }

  const { Bus } = require('../src/bus');
  const rom = fs.readFileSync(romPath);
  const cart = new Cartridge(rom.buffer.slice(rom.byteOffset, rom.byteOffset + rom.byteLength));
  assert(cart.imageValid(), 'SMB3 ROM should parse');
  assert(cart.getMapper().constructor.name === 'Mapper004', 'SMB3 must use Mapper004');

  const sample = { data: 0xff };
  assert(cart.ppuRead(0x1000, sample), 'SMB3 CHR read via mapper must succeed');

  const bus = new Bus();
  bus.insertCartridge(cart);
  bus.reset();

  let nmiCount = 0;
  const origNmi = bus.cpu.nmi.bind(bus.cpu);
  bus.cpu.nmi = function () {
    nmiCount++;
    return origNmi();
  };

  // ~3 frames
  const clocks = 341 * 262 * 3 * 3;
  for (let i = 0; i < clocks; i++) bus.clock();

  assert(nmiCount >= 1, `SMB3 should fire NMI after boot, got ${nmiCount}`);
  console.log(`validate-mmc3: SMB3 smoke ok (NMIs=${nmiCount}, CHR sample=${sample.data})`);
}

function main(): void {
  testCartridgePpuRead();
  testIrqReload();
  testNmiImplemented();
  testPpuNmiBit();
  testSmb3Rom();
  console.log('validate-mmc3: all checks passed');
}

main();
