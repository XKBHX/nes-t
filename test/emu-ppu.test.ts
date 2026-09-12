import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MIRROR } from '../src/mapper';
import { createBus, ppuResetLatch, ppuSetAddress } from './helpers';

/**
 * Behavioral coverage for PPU items on
 * https://www.nesdev.org/wiki/Emulator_tests
 * (blargg_ppu_tests, ppu_vbl_nmi, ppu_read_buffer, sprite_ram / oam).
 */
describe('PPU accuracy (NESdev emulator tests)', () => {
  describe('blargg_ppu_tests: palette_ram', () => {
    it('mirrors $3F10 to $3F00', () => {
      const bus = createBus();
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f10);
      bus.ppu.cpuWrite(0x0007, 0x22);
      assert.equal(bus.ppu.ppuRead(0x3f00), 0x22);
      assert.equal(bus.ppu.ppuRead(0x3f10), 0x22);
    });

    it('mirrors $3F14/$3F18/$3F1C to the first palette row', () => {
      const bus = createBus();
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f14);
      bus.ppu.cpuWrite(0x0007, 0x19);
      assert.equal(bus.ppu.ppuRead(0x3f04), 0x19);

      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f18);
      bus.ppu.cpuWrite(0x0007, 0x1a);
      assert.equal(bus.ppu.ppuRead(0x3f08), 0x1a);
    });
  });

  describe('blargg_ppu_tests: sprite_ram', () => {
    it('wraps the OAM address after 256 $2004 writes', () => {
      const bus = createBus();
      bus.ppu.cpuWrite(0x0003, 0x00);
      for (let i = 0; i < 256; i++) {
        bus.ppu.cpuWrite(0x0004, i & 0xff);
      }
      bus.ppu.cpuWrite(0x0004, 0xaa);
      assert.equal(bus.ppu.OAM[0].reg[0], 0xaa);
    });
  });

  describe('blargg_ppu_tests: vram_access', () => {
    it('increments the PPU address by 1 after $2007', () => {
      const bus = createBus();
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x2000);
      bus.ppu.cpuWrite(0x0007, 0x11);
      bus.ppu.cpuWrite(0x0007, 0x22);
      assert.equal(bus.ppu.ppuRead(0x2000), 0x11);
      assert.equal(bus.ppu.ppuRead(0x2001), 0x22);
    });

    it('increments the PPU address by 32 when PPUCTRL bit 2 is set', () => {
      const bus = createBus();
      bus.ppu.cpuWrite(0x0000, 0x04);
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x2000);
      bus.ppu.cpuWrite(0x0007, 0x33);
      bus.ppu.cpuWrite(0x0007, 0x44);
      assert.equal(bus.ppu.ppuRead(0x2000), 0x33);
      assert.equal(bus.ppu.ppuRead(0x2020), 0x44);
    });
  });

  describe('ppu_read_buffer', () => {
    it('buffers non-palette $2007 reads', () => {
      const bus = createBus();
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x2000);
      bus.ppu.cpuWrite(0x0007, 0x55);

      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x2000);
      const buffered = bus.ppu.cpuRead(0x0007);
      const data = bus.ppu.cpuRead(0x0007);
      assert.notEqual(data, buffered);
      assert.equal(data, 0x55);
    });

    it('returns palette data immediately from $2007', () => {
      const bus = createBus();
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f00);
      bus.ppu.cpuWrite(0x0007, 0x12);

      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f00);
      assert.equal(bus.ppu.cpuRead(0x0007) & 0x3f, 0x12);
    });
  });

  describe('nametable mirroring', () => {
    it('shares $2000 and $2400 in horizontal mirroring', () => {
      const bus = createBus({ mirrorVertical: false });
      assert.equal(bus.cartridge.mirror(), MIRROR.HORIZONTAL);
      bus.ppu.ppuWrite(0x2000, 0x71);
      assert.equal(bus.ppu.ppuRead(0x2400), 0x71);
    });

    it('keeps $2000 and $2400 distinct in vertical mirroring', () => {
      const bus = createBus({ mirrorVertical: true });
      assert.equal(bus.cartridge.mirror(), MIRROR.VERTICAL);
      bus.ppu.ppuWrite(0x2000, 0x71);
      bus.ppu.ppuWrite(0x2400, 0x72);
      assert.equal(bus.ppu.ppuRead(0x2000), 0x71);
      assert.equal(bus.ppu.ppuRead(0x2400), 0x72);
    });
  });

  describe('ppu_vbl_nmi / vbl_clear_time', () => {
    it('sets vblank at scanline 241, cycle 1', () => {
      const bus = createBus();
      const ppu = bus.ppu as unknown as { status: { vertical_blank: number } };

      let seen = false;
      for (let i = 0; i < 341 * 242; i++) {
        bus.ppu.clock();
        if (ppu.status.vertical_blank) {
          seen = true;
          break;
        }
      }
      assert.equal(seen, true);
    });

    it('clears vblank when $2002 is read', () => {
      const bus = createBus();
      const ppu = bus.ppu as unknown as { status: { vertical_blank: number } };
      ppu.status.vertical_blank = 1;
      const status = bus.cpuRead(0x2002);
      assert.equal(status & 0x80, 0x80);
      assert.equal(ppu.status.vertical_blank, 0);
      assert.equal(bus.cpuRead(0x2002) & 0x80, 0);
    });

    it('puts the PPU data buffer in the low 5 bits of $2002', () => {
      const bus = createBus();
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f00);
      bus.ppu.cpuWrite(0x0007, 0x15);
      ppuResetLatch(bus.ppu);
      ppuSetAddress(bus.ppu, 0x3f00);
      bus.ppu.cpuRead(0x0007);

      const status = bus.ppu.cpuRead(0x0002);
      assert.equal(status & 0x1f, 0x15);
    });
  });

  describe('oam dma', () => {
    it('copies a 256-byte page into OAM from $4014', () => {
      const bus = createBus({ prg: [0xea] });
      for (let i = 0; i < 256; i++) {
        bus.cpuWrite(0x0200 + i, (i + 3) & 0xff);
      }
      bus.cpuWrite(0x4014, 0x02);

      for (let i = 0; i < 3000; i++) bus.clock();

      assert.equal(bus.ppu.OAM[0].reg[0], 0x03);
      assert.equal(bus.ppu.OAM[0].reg[1], 0x04);
      assert.equal(bus.ppu.OAM[63].reg[3], (255 + 3) & 0xff);
    });
  });
});
