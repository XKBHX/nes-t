import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Cartridge } from '../src/cartridge';
import { Mapper000, Mapper001, Mapper002, Mapper003, Mapper004, Mapper066, MIRROR } from '../src/mapper';
import { buildINesRom, mappedAddress, mmc1Write } from './helpers';

describe('mappers', () => {
  describe('Mapper000', () => {
    it('mirrors 16KB PRG across $8000-$FFFF', () => {
      const mapper = new Mapper000(1, 1);
      assert.equal(mappedAddress(mapper, 'cpu', 0x8000), 0x0000);
      assert.equal(mappedAddress(mapper, 'cpu', 0xc000), 0x0000);
      assert.equal(mappedAddress(mapper, 'ppu', 0x1234), 0x1234);
    });

    it('maps 32KB PRG without mirroring', () => {
      const mapper = new Mapper000(2, 1);
      assert.equal(mappedAddress(mapper, 'cpu', 0x8000), 0x0000);
      assert.equal(mappedAddress(mapper, 'cpu', 0xffff), 0x7fff);
    });
  });

  describe('Mapper001', () => {
    it('keeps 8KB of PRG RAM at $6000', () => {
      const mapper = new Mapper001(2, 1);
      mapper.reset();
      const mapped = { mappedAddress: 0 };
      const data = { data: 0 };
      mapper.cpuMapWrite(0x6000, mapped, 0x42);
      mapper.cpuMapRead(0x6000, mapped, data);
      assert.equal(mapped.mappedAddress, 0xffffffff);
      assert.equal(data.data, 0x42);
    });

    it('switches 16KB PRG at $8000 after five serial writes', () => {
      const mapper = new Mapper001(4, 1);
      mapper.reset();
      mmc1Write(mapper, 0x8000, 0x0c);
      mmc1Write(mapper, 0xe000, 0x02);
      assert.equal(mappedAddress(mapper, 'cpu', 0x8000), 0x02 * 0x4000);
      assert.equal(mappedAddress(mapper, 'cpu', 0xc000), 3 * 0x4000);
    });

    it('selects nametable mirroring from the control register', () => {
      const mapper = new Mapper001(2, 1);
      mapper.reset();
      mmc1Write(mapper, 0x8000, 0x02);
      assert.equal(mapper.mirror(), MIRROR.VERTICAL);
      mmc1Write(mapper, 0x8000, 0x03);
      assert.equal(mapper.mirror(), MIRROR.HORIZONTAL);
    });
  });

  describe('Mapper002', () => {
    it('switches the low 16KB PRG bank and keeps the last bank fixed', () => {
      const mapper = new Mapper002(4, 0);
      mapper.reset();
      mapper.cpuMapWrite(0x8000, { mappedAddress: 0 }, 0x02);
      assert.equal(mappedAddress(mapper, 'cpu', 0x8000), 0x02 * 0x4000);
      assert.equal(mappedAddress(mapper, 'cpu', 0xc000), 3 * 0x4000);
    });
  });

  describe('Mapper003', () => {
    it('switches 8KB CHR banks', () => {
      const mapper = new Mapper003(2, 4);
      mapper.reset();
      mapper.cpuMapWrite(0x8000, { mappedAddress: 0 }, 0x02);
      assert.equal(mappedAddress(mapper, 'ppu', 0x0000), 0x02 * 0x2000);
      assert.equal(mappedAddress(mapper, 'cpu', 0x8000), 0x0000);
      assert.equal(mappedAddress(mapper, 'cpu', 0xffff), 0x7fff);
    });
  });

  describe('Mapper004', () => {
    it('forces 2KB CHR banks onto even 1KB pairs', () => {
      const rom = buildINesRom({ mapper: 4, prgBanks: 2, chrBanks: 1 });
      const bytes = new Uint8Array(rom);
      const chrOffset = 16 + 2 * 16384;
      for (let bank = 0; bank < 8; bank++) {
        bytes[chrOffset + bank * 1024] = bank;
      }

      const cart = new Cartridge(rom);
      const mapper = cart.getMapper() as Mapper004;
      mapper.cpuMapWrite(0x8000, { mappedAddress: 0 }, 0x00);
      mapper.cpuMapWrite(0x8001, { mappedAddress: 0 }, 0x05);

      const lo = { data: 0xff };
      const hi = { data: 0xff };
      assert.equal(cart.ppuRead(0x0000, lo), true);
      assert.equal(cart.ppuRead(0x0400, hi), true);
      assert.equal(lo.data, 4);
      assert.equal(hi.data, 5);
    });

    it('reloads the IRQ counter and fires when it reaches 0', () => {
      const mapper = new Mapper004(2, 1);
      mapper.cpuMapWrite(0xc000, { mappedAddress: 0 }, 3);
      mapper.cpuMapWrite(0xc001, { mappedAddress: 0 }, 0);
      mapper.cpuMapWrite(0xe001, { mappedAddress: 0 }, 0);

      mapper.scanline();
      assert.equal(mapper.irqState(), false);

      mapper.scanline();
      mapper.scanline();
      mapper.scanline();
      assert.equal(mapper.irqState(), true);

      mapper.irqClear();
      assert.equal(mapper.irqState(), false);
    });

    it('maps PRG RAM at $6000', () => {
      const mapper = new Mapper004(2, 1);
      const mapped = { mappedAddress: 0 };
      const data = { data: 0 };
      mapper.cpuMapWrite(0x6100, mapped, 0x77);
      mapper.cpuMapRead(0x6100, mapped, data);
      assert.equal(data.data, 0x77);
    });
  });

  describe('Mapper066', () => {
    it('selects 32KB PRG and 8KB CHR from one write', () => {
      const mapper = new Mapper066(4, 4);
      mapper.reset();
      mapper.cpuMapWrite(0x8000, { mappedAddress: 0 }, 0x21);
      assert.equal(mappedAddress(mapper, 'cpu', 0x8000), 0x02 * 0x8000);
      assert.equal(mappedAddress(mapper, 'ppu', 0x0000), 0x01 * 0x2000);
    });
  });
});
