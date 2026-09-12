import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Cartridge } from '../src/cartridge';
import { Mapper000, Mapper001, Mapper002, Mapper003, Mapper004, Mapper066, MIRROR } from '../src/mapper';
import { buildINesRom } from './helpers';

describe('cartridge', () => {
  it('parses an iNES header', () => {
    const header = Cartridge.parseHeader(buildINesRom({ mapper: 4, prgBanks: 2, chrBanks: 1, mirrorVertical: true }));
    assert.equal(header.name, 'NES\u001a');
    assert.equal(header.prgRomChunks, 2);
    assert.equal(header.chrRomChunks, 1);
    assert.equal((header.mapper1 >> 4) | (header.mapper2 & 0xf0), 4);
    assert.equal(header.mapper1 & 0x01, 1);
  });

  it('selects mappers 0, 1, 2, 3, 4, and 66', () => {
    const cases: Array<[number, Function]> = [
      [0, Mapper000],
      [1, Mapper001],
      [2, Mapper002],
      [3, Mapper003],
      [4, Mapper004],
      [66, Mapper066],
    ];

    for (const [mapperId, ctor] of cases) {
      const cart = new Cartridge(buildINesRom({ mapper: mapperId, prgBanks: 2, chrBanks: 1 }));
      assert.equal(cart.imageValid(), true, `mapper ${mapperId} should parse`);
      assert.equal(cart.getMapper().constructor, ctor, `mapper ${mapperId} should use ${ctor.name}`);
    }
  });

  it('uses hardware nametable mirroring for mapper 0', () => {
    const horizontal = new Cartridge(buildINesRom({ mapper: 0, mirrorVertical: false }));
    const vertical = new Cartridge(buildINesRom({ mapper: 0, mirrorVertical: true }));
    assert.equal(horizontal.mirror(), MIRROR.HORIZONTAL);
    assert.equal(vertical.mirror(), MIRROR.VERTICAL);
  });

  it('creates 8KB of CHR RAM when chrBanks is 0', () => {
    const cart = new Cartridge(buildINesRom({ mapper: 0, prgBanks: 1, chrBanks: 0 }));
    const written = cart.ppuWrite(0x0000, 0x5a);
    const data = { data: 0 };
    const read = cart.ppuRead(0x0000, data);
    assert.equal(written, true);
    assert.equal(read, true);
    assert.equal(data.data, 0x5a);
  });

  it('maps CPU reads through PRG ROM', () => {
    const prg = new Uint8Array(16384);
    prg[0] = 0xa9;
    const cart = new Cartridge(buildINesRom({ mapper: 0, prg }));
    const data = { data: 0 };
    assert.equal(cart.cpuRead(0x8000, data), true);
    assert.equal(data.data, 0xa9);
    assert.equal(cart.cpuRead(0xc000, data), true);
    assert.equal(data.data, 0xa9);
  });
});
