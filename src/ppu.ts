import { Pixel, Sprite } from "./graphics";
import { Cartridge } from "./cartridge";
import { MIRROR } from "./mapper/mapper";

export class Ppu {
  private tblName: [Uint8Array, Uint8Array];
  private tblPattern: [Uint8Array, Uint8Array];
  private tblPalette: Uint8Array;
  private palScreen: Pixel[];

  private sprScreen = Sprite.createSpriteFromDimensions(256, 240);
  private sprNameTable: Sprite[] = [
    Sprite.createSpriteFromDimensions(256, 240),
    Sprite.createSpriteFromDimensions(256, 240),
  ];
  private sprPatternTable: Sprite[] = [
    Sprite.createSpriteFromDimensions(128, 128),
    Sprite.createSpriteFromDimensions(128, 128),
  ];

  private cart: Cartridge;

  private status: PPUStatus;
  private mask: PPUMask;
  private control: PPUCtrl;
  private vRamAddress: LoopyRegister;
  private tRamAddress: LoopyRegister;
  private fineX: Uint8Array[0] = 0x00;
  private addressLatch: Uint8Array[0] = 0x00;
  private ppuDataBuffer: Uint8Array[0] = 0x00;
  private scanline: Uint16Array[0] = 0;
  private cycle: Uint16Array[0] = 0;
  private oddFrame: boolean = false;
  private bgNextTileId: Uint8Array[0] = 0x00;
  private bgNextTileAttrib: Uint8Array[0] = 0x00;
  private bgNextTileLsb: Uint8Array[0] = 0x00;
  private bgNextTileMsb: Uint8Array[0] = 0x00;
  private bgShifterPatternLo: Uint16Array[0] = 0x0000;
  private bgShifterPatternHi: Uint16Array[0] = 0x0000;
  private bgShifterAttribLo: Uint16Array[0] = 0x0000;
  private bgShifterAttribHi: Uint16Array[0] = 0x0000;
  private OAM: ObjectAttributeEntry[];
  private oamAddress: Uint8Array[0] = 0x00;
  private spriteScanline: ObjectAttributeEntry[];
  private spriteCount: Uint8Array[0];
  private spriteShifterPatternLo: Uint8Array;
  private spriteShifterPatternHi: Uint8Array;
  private spriteZeroHitPossible: boolean = false;
  private spriteZeroBeingRendered: boolean = false;

  public frameComplete: boolean = false;
  //public oAM: Uint8Array[0] = OAM;
  public nmi: boolean = false;
  public scanlineTrigger: boolean = false;

  constructor() {
    this.tblName = [new Uint8Array(1024), new Uint8Array(1024)];
    this.tblPattern = [new Uint8Array(4096), new Uint8Array(4096)];
    this.tblPalette = new Uint8Array(32);

    this.cart = <Cartridge><unknown>undefined;
    this.status = { unused: 0, sprite_zero_hit: 0, sprite_overflow: 0, vertical_blank: 0, reg: 0 };
    this.mask = { grayscale: 0, render_background_left: 0, render_sprites_left: 0, render_background: 0, render_sprites: 0, enhance_red: 0, enhance_green: 0, enhance_blue: 0, reg: 0 };
    this.control = { nametable_x: 0, nametable_y: 0, increment_mode: 0, pattern_sprite: 0, pattern_background: 0, sprite_size: 0, slave_mode: 0, enable_nmi: 0, reg: 0 };
    this.vRamAddress = { coarse_x: 0,coarse_y: 0,nametable_x: 0,nametable_y: 0,fine_y: 0,unused: 0, reg: 0 };
    this.tRamAddress = { coarse_x: 0, coarse_y: 0, nametable_x: 0, nametable_y: 0, fine_y: 0, unused: 0, reg: 0 };
    this.spriteScanline = [];
    this.spriteCount = 0;

    this.OAM = Ppu.populateOAM();
    this.palScreen = [];
    this.palScreen[0x00] = new Pixel(84, 84, 84);
    this.palScreen[0x01] = new Pixel(0, 30, 116);
    this.palScreen[0x02] = new Pixel(8, 16, 144);
    this.palScreen[0x03] = new Pixel(48, 0, 136);
    this.palScreen[0x04] = new Pixel(68, 0, 100);
    this.palScreen[0x05] = new Pixel(92, 0, 48);
    this.palScreen[0x06] = new Pixel(84, 4, 0);
    this.palScreen[0x07] = new Pixel(60, 24, 0);
    this.palScreen[0x08] = new Pixel(32, 42, 0);
    this.palScreen[0x09] = new Pixel(8, 58, 0);
    this.palScreen[0x0a] = new Pixel(0, 64, 0);
    this.palScreen[0x0b] = new Pixel(0, 60, 0);
    this.palScreen[0x0c] = new Pixel(0, 50, 60);
    this.palScreen[0x0d] = new Pixel(0, 0, 0);
    this.palScreen[0x0e] = new Pixel(0, 0, 0);
    this.palScreen[0x0f] = new Pixel(0, 0, 0);

    this.palScreen[0x10] = new Pixel(152, 150, 152);
    this.palScreen[0x11] = new Pixel(8, 76, 196);
    this.palScreen[0x12] = new Pixel(48, 50, 236);
    this.palScreen[0x13] = new Pixel(92, 30, 228);
    this.palScreen[0x14] = new Pixel(136, 20, 176);
    this.palScreen[0x15] = new Pixel(160, 20, 100);
    this.palScreen[0x16] = new Pixel(152, 34, 32);
    this.palScreen[0x17] = new Pixel(120, 60, 0);
    this.palScreen[0x18] = new Pixel(84, 90, 0);
    this.palScreen[0x19] = new Pixel(40, 114, 0);
    this.palScreen[0x1a] = new Pixel(8, 124, 0);
    this.palScreen[0x1b] = new Pixel(0, 118, 40);
    this.palScreen[0x1c] = new Pixel(0, 102, 120);
    this.palScreen[0x1d] = new Pixel(0, 0, 0);
    this.palScreen[0x1e] = new Pixel(0, 0, 0);
    this.palScreen[0x1f] = new Pixel(0, 0, 0);

    this.palScreen[0x20] = new Pixel(236, 238, 236);
    this.palScreen[0x21] = new Pixel(76, 154, 236);
    this.palScreen[0x22] = new Pixel(120, 124, 236);
    this.palScreen[0x23] = new Pixel(176, 98, 236);
    this.palScreen[0x24] = new Pixel(228, 84, 236);
    this.palScreen[0x25] = new Pixel(236, 88, 180);
    this.palScreen[0x26] = new Pixel(236, 106, 100);
    this.palScreen[0x27] = new Pixel(212, 136, 32);
    this.palScreen[0x28] = new Pixel(160, 170, 0);
    this.palScreen[0x29] = new Pixel(116, 196, 0);
    this.palScreen[0x2a] = new Pixel(76, 208, 32);
    this.palScreen[0x2b] = new Pixel(56, 204, 108);
    this.palScreen[0x2c] = new Pixel(56, 180, 204);
    this.palScreen[0x2d] = new Pixel(60, 60, 60);
    this.palScreen[0x2e] = new Pixel(0, 0, 0);
    this.palScreen[0x2f] = new Pixel(0, 0, 0);

    this.palScreen[0x30] = new Pixel(236, 238, 236);
    this.palScreen[0x31] = new Pixel(168, 204, 236);
    this.palScreen[0x32] = new Pixel(188, 188, 236);
    this.palScreen[0x33] = new Pixel(212, 178, 236);
    this.palScreen[0x34] = new Pixel(236, 174, 236);
    this.palScreen[0x35] = new Pixel(236, 174, 212);
    this.palScreen[0x36] = new Pixel(236, 180, 176);
    this.palScreen[0x37] = new Pixel(228, 196, 144);
    this.palScreen[0x38] = new Pixel(204, 210, 120);
    this.palScreen[0x39] = new Pixel(180, 222, 120);
    this.palScreen[0x3a] = new Pixel(168, 226, 144);
    this.palScreen[0x3b] = new Pixel(152, 226, 180);
    this.palScreen[0x3c] = new Pixel(160, 214, 228);
    this.palScreen[0x3d] = new Pixel(160, 162, 160);
    this.palScreen[0x3e] = new Pixel(0, 0, 0);
    this.palScreen[0x3f] = new Pixel(0, 0, 0);

    this.spriteShifterPatternLo = new Uint8Array(8);
    this.spriteShifterPatternHi = new Uint8Array(8);
  }

  static populateOAM(): ObjectAttributeEntry[] {
    const oam: ObjectAttributeEntry[] = [];

    for (let x = 0; x < 64; x++) {
      oam.push({ attribute: 0, id: 0, x: 0, y: 0 });
    }

    return oam;
  }
  
  getScreen(): Sprite {
    return this.sprScreen;
  }

  getNameTable(i: Uint8Array[0]): Sprite {
    return this.sprNameTable[i];
  }

  getPatternTable(i: Uint8Array[0], palette: Uint8Array[0]): Sprite {
    for (let nTileY = 0; nTileY < 16; nTileY++) {
      for (let nTileX = 0; nTileX < 16; nTileX++) {
        const nOffset = nTileY * 256 + nTileX * 16;

        for (let row = 0; row < 8; row++) {
          let tile_lsb = this.ppuRead(i * 0x1000 + nOffset + row + 0x0000);
          let tile_msb = this.ppuRead(i * 0x1000 + nOffset + row + 0x0008);

          for (let col = 0; col < 8; col++) {
            const pixel = ((tile_msb & 0x01) << 1) | (tile_lsb & 0x01);

            tile_lsb >>= 1;
            tile_msb >>= 1;

            this.sprPatternTable[i].setPixel(
              nTileX * 8 + (7 - col),
              nTileY * 8 + row,
              this.getColorFromPaletteRam(palette, pixel)
            );
          }
        }
      }
    }

    return this.sprPatternTable[i];
  }

  getColorFromPaletteRam(palette: Uint8Array[0], pixel: Uint8Array[0]): Pixel {
    //console.log(this);
    return this.palScreen[this.ppuRead(0x3f00 + (palette << 2) + pixel) & 0x3f];
  }

  cpuRead(address: Uint16Array[0], readOnly: boolean = false): Uint8Array[0] {
    let data = 0x00;

    if (readOnly) {
      switch (address) {
        case 0x0000: // Control
          data = this.control.reg;
          break;
        case 0x0001: // Mask
          data = this.mask.reg;
          break;
        case 0x0002: // Status
          data = this.status.reg;
          break;
        case 0x0003: // OAM Address
          break;
        case 0x0004: // OAM Data
          break;
        case 0x0005: // Scroll
          break;
        case 0x0006: // PPU Address
          break;
        case 0x0007: // PPU Data
          break;
      }
    } else {
      switch (address) {
        case 0x0000:
          break;

        case 0x0001:
          break;

        case 0x0002:
          data = (this.status.reg & 0xe0) | (this.ppuDataBuffer & 0x1f);

          this.status.vertical_blank = 0;

          this.addressLatch = 0;
          break;

        case 0x0003:
          break;

        case 0x0004:
          //data = this.OAM[this.oamAddress];
          break;

        case 0x0005:
          break;

        case 0x0006:
          break;

        case 0x0007:
          data = this.ppuDataBuffer;
          this.ppuDataBuffer = this.ppuRead(this.vRamAddress.reg);

          if (this.vRamAddress.reg >= 0x3f00) data = this.ppuDataBuffer;
          this.vRamAddress.reg += this.control.increment_mode ? 32 : 1;
          break;
      }
    }

    return data;
  }

  cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {
    switch (address) {
      case 0x0000:
        this.control.reg = data;
        this.tRamAddress.nametable_x = this.control.nametable_x;
        this.tRamAddress.nametable_y = this.control.nametable_y;
        break;
      case 0x0001: // Mask
        this.mask.reg = data;
        break;
      case 0x0002: // Status
        break;
      case 0x0003: // OAM Address
        this.oamAddress = data;
        break;
      case 0x0004: // OAM Data
        //this.OAM[this.oamAddress] = data;
        break;
      case 0x0005: // Scroll
        if (this.addressLatch == 0) {
          this.fineX = data & 0x07;
          this.tRamAddress.coarse_x = data >> 3;
          this.addressLatch = 1;
        } else {
          this.tRamAddress.fine_y = data & 0x07;
          this.tRamAddress.coarse_y = data >> 3;
          this.addressLatch = 0;
        }
        break;
      case 0x0006:
        if (this.addressLatch == 0) {
          this.tRamAddress.reg =
            ((data & 0x3f) << 8) | (this.tRamAddress.reg & 0x00ff);
          this.addressLatch = 1;
        } else {
          this.tRamAddress.reg = (this.tRamAddress.reg & 0xff00) | data;
          this.vRamAddress = this.tRamAddress;
          this.addressLatch = 0;
        }
        break;
      case 0x0007: // PPU Data
        this.ppuWrite(this.vRamAddress.reg, data);
        this.vRamAddress.reg += this.control.increment_mode ? 32 : 1;
        break;
    }
  }

  ppuRead(address: Uint16Array[0], readOnly: boolean = false): Uint8Array[0] {
    let data = 0x00;
    address &= 0x3fff;

    //console.log('PPU Read', this.cart, this);

    if (this.cart.ppuRead(address, data)) {
    } else if (address >= 0x0000 && address <= 0x1fff) {
      data = this.tblPattern[(address & 0x1000) >> 12][address & 0x0fff];
    } else if (address >= 0x2000 && address <= 0x3eff) {
      address &= 0x0fff;

      if (this.cart.mirror() === MIRROR.VERTICAL) {
        if (address >= 0x0000 && address <= 0x03ff)
          data = this.tblName[0][address & 0x03ff];
        if (address >= 0x0400 && address <= 0x07ff)
          data = this.tblName[1][address & 0x03ff];
        if (address >= 0x0800 && address <= 0x0bff)
          data = this.tblName[0][address & 0x03ff];
        if (address >= 0x0c00 && address <= 0x0fff)
          data = this.tblName[1][address & 0x03ff];
      } else if (this.cart.mirror() === MIRROR.HORIZONTAL) {
        if (address >= 0x0000 && address <= 0x03ff)
          data = this.tblName[0][address & 0x03ff];
        if (address >= 0x0400 && address <= 0x07ff)
          data = this.tblName[0][address & 0x03ff];
        if (address >= 0x0800 && address <= 0x0bff)
          data = this.tblName[1][address & 0x03ff];
        if (address >= 0x0c00 && address <= 0x0fff)
          data = this.tblName[1][address & 0x03ff];
      }
    } else if (address >= 0x3f00 && address <= 0x3fff) {
      address &= 0x001f;
      if (address == 0x0010) address = 0x0000;
      if (address == 0x0014) address = 0x0004;
      if (address == 0x0018) address = 0x0008;
      if (address == 0x001c) address = 0x000c;
      data = this.tblPalette[address] & (this.mask.grayscale ? 0x30 : 0x3f);
    }

    return data;
  }

  ppuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {
    address &= 0x3fff;

    if (this.cart.ppuWrite(address, data)) {
    } else if (address >= 0x0000 && address <= 0x1fff) {
      this.tblPattern[(address & 0x1000) >> 12][address & 0x0fff] = data;
    } else if (address >= 0x2000 && address <= 0x3eff) {
      address &= 0x0fff;
      if (this.cart.mirror() == MIRROR.VERTICAL) {
        if (address >= 0x0000 && address <= 0x03ff)
          this.tblName[0][address & 0x03ff] = data;
        if (address >= 0x0400 && address <= 0x07ff)
          this.tblName[1][address & 0x03ff] = data;
        if (address >= 0x0800 && address <= 0x0bff)
          this.tblName[0][address & 0x03ff] = data;
        if (address >= 0x0c00 && address <= 0x0fff)
          this.tblName[1][address & 0x03ff] = data;
      } else if (this.cart.mirror() == MIRROR.HORIZONTAL) {
        if (address >= 0x0000 && address <= 0x03ff)
          this.tblName[0][address & 0x03ff] = data;
        if (address >= 0x0400 && address <= 0x07ff)
          this.tblName[0][address & 0x03ff] = data;
        if (address >= 0x0800 && address <= 0x0bff)
          this.tblName[1][address & 0x03ff] = data;
        if (address >= 0x0c00 && address <= 0x0fff)
          this.tblName[1][address & 0x03ff] = data;
      }
    } else if (address >= 0x3f00 && address <= 0x3fff) {
      address &= 0x001f;
      if (address == 0x0010) address = 0x0000;
      if (address == 0x0014) address = 0x0004;
      if (address == 0x0018) address = 0x0008;
      if (address == 0x001c) address = 0x000c;
      this.tblPalette[address] = data;
    }
  }

  connectCartridge(cartridge: Cartridge): void {
    this.cart = cartridge;
  }

  clock(): void {
    const IncrementScrollX = () => {
      if (this.mask.render_background || this.mask.render_sprites) {
        if (this.vRamAddress.coarse_x == 31) {
          this.vRamAddress.coarse_x = 0;
          this.vRamAddress.nametable_x = ~this.vRamAddress.nametable_x;
        } else {
          this.vRamAddress.coarse_x++;
        }
      }
    };

    const IncrementScrollY = () => {
      if (this.mask.render_background || this.mask.render_sprites) {
        if (this.vRamAddress.fine_y < 7) {
          this.vRamAddress.fine_y++;
        } else {
          this.vRamAddress.fine_y = 0;

          if (this.vRamAddress.coarse_y == 29) {
            this.vRamAddress.coarse_y = 0;
            this.vRamAddress.nametable_y = ~this.vRamAddress.nametable_y;
          } else if (this.vRamAddress.coarse_y == 31) {
            this.vRamAddress.coarse_y = 0;
          } else {
            this.vRamAddress.coarse_y++;
          }
        }
      }
    };

    const TransferAddressX = () => {
      if (this.mask.render_background || this.mask.render_sprites) {
        this.vRamAddress.nametable_x = this.tRamAddress.nametable_x;
        this.vRamAddress.coarse_x = this.tRamAddress.coarse_x;
      }
    };

    const TransferAddressY = () => {
      if (this.mask.render_background || this.mask.render_sprites) {
        this.vRamAddress.fine_y = this.tRamAddress.fine_y;
        this.vRamAddress.nametable_y = this.tRamAddress.nametable_y;
        this.vRamAddress.coarse_y = this.tRamAddress.coarse_y;
      }
    };

    const LoadBackgroundShifters = () => {
      this.bgShifterPatternLo =
        (this.bgShifterPatternLo & 0xff00) | this.bgNextTileLsb;
      this.bgShifterPatternHi =
        (this.bgShifterPatternHi & 0xff00) | this.bgNextTileMsb;
      this.bgShifterAttribLo =
        (this.bgShifterAttribLo & 0xff00) |
        (this.bgNextTileAttrib & 0b01 ? 0xff : 0x00);
      this.bgShifterAttribHi =
        (this.bgShifterAttribHi & 0xff00) |
        (this.bgNextTileAttrib & 0b10 ? 0xff : 0x00);
    };

    const UpdateShifters = () => {
      if (this.mask.render_background) {
        this.bgShifterPatternLo <<= 1;
        this.bgShifterPatternHi <<= 1;

        this.bgShifterAttribLo <<= 1;
        this.bgShifterAttribHi <<= 1;
      }

      if (this.mask.render_sprites && this.cycle >= 1 && this.cycle < 258) {
        for (let i = 0; i < this.spriteCount; i++) {
          if (this.spriteScanline[i].x > 0) {
            this.spriteScanline[i].x--;
          } else {
            this.spriteShifterPatternLo[i] <<= 1;
            this.spriteShifterPatternHi[i] <<= 1;
          }
        }
      }
    };

    if (this.scanline >= -1 && this.scanline < 240) {
      if (
        this.scanline == 0 &&
        this.cycle == 0 &&
        this.oddFrame &&
        (this.mask.render_background || this.mask.render_sprites)
      ) {
        this.cycle = 1;
      }

      if (this.scanline == -1 && this.cycle == 1) {
        this.status.vertical_blank = 0;
        this.status.sprite_overflow = 0;
        this.status.sprite_zero_hit = 0;

        for (let i = 0; i < 8; i++) {
          this.spriteShifterPatternLo[i] = 0;
          this.spriteShifterPatternHi[i] = 0;
        }
      }

      if (
        (this.cycle >= 2 && this.cycle < 258) ||
        (this.cycle >= 321 && this.cycle < 338)
      ) {
        UpdateShifters();

        switch ((this.cycle - 1) % 8) {
          case 0:
            LoadBackgroundShifters();

            this.bgNextTileId = this.ppuRead(
              0x2000 | (this.vRamAddress.reg & 0x0fff)
            );
            break;
          case 2:
            this.bgNextTileAttrib = this.ppuRead(
              0x23c0 |
                (this.vRamAddress.nametable_y << 11) |
                (this.vRamAddress.nametable_x << 10) |
                ((this.vRamAddress.coarse_y >> 2) << 3) |
                (this.vRamAddress.coarse_x >> 2)
            );

            if (this.vRamAddress.coarse_y & 0x02) this.bgNextTileAttrib >>= 4;
            if (this.vRamAddress.coarse_x & 0x02) this.bgNextTileAttrib >>= 2;
            this.bgNextTileAttrib &= 0x03;
            break;

          case 4:
            this.bgNextTileLsb = this.ppuRead(
              (this.control.pattern_background << 12) +
                (this.bgNextTileId << 4) +
                this.vRamAddress.fine_y +
                0
            );

            break;
          case 6:
            this.bgNextTileMsb = this.ppuRead(
              (this.control.pattern_background << 12) +
                (this.bgNextTileId << 4) +
                this.vRamAddress.fine_y +
                8
            );
            break;
          case 7:
            IncrementScrollX();
            break;
        }
      }

      if (this.cycle == 256) {
        IncrementScrollY();
      }

      if (this.cycle == 257) {
        LoadBackgroundShifters();
        TransferAddressX();
      }

      if (this.cycle == 338 || this.cycle == 340) {
        this.bgNextTileId = this.ppuRead(
          0x2000 | (this.vRamAddress.reg & 0x0fff)
        );
      }

      if (this.scanline == -1 && this.cycle >= 280 && this.cycle < 305) {
        TransferAddressY();
      }

      if (this.cycle === 257 && this.scanline >= 0) {
        this.spriteScanline.fill(
          { x: 0xff, attribute: 0xff, id: 0xff, y: 0xff },
          0,
          8
        ) /* sizeof(sObjectAttributeEntry) */;

        this.spriteCount = 0;

        for (let i = 0; i < 8; i++) {
          this.spriteShifterPatternLo[i] = 0;
          this.spriteShifterPatternHi[i] = 0;
        }

        let nOAMEntry = 0;

        this.spriteZeroHitPossible = false;

        while (nOAMEntry < 64 && this.spriteCount < 9) {
          let diff = this.scanline - this.OAM[nOAMEntry].y;

          if (
            diff >= 0 &&
            diff < (this.control.sprite_size ? 16 : 8) &&
            this.spriteCount < 8
          ) {
            if (this.spriteCount < 8) {
              if (nOAMEntry == 0) {
                this.spriteZeroHitPossible = true;
              }

              this.spriteScanline[this.spriteCount] =
                this.OAM[nOAMEntry] /* sizeof(sObjectAttributeEntry)) */;
            }
            this.spriteCount++;
          }
          nOAMEntry++;
        }

        this.status.sprite_overflow = this.spriteCount >= 8 ? 1 : 0;
      }

      if (this.cycle === 340) {
        for (let i = 0; i < this.spriteCount; i++) {
          let sprite_pattern_bits_lo, sprite_pattern_bits_hi;
          let sprite_pattern_addr_lo, sprite_pattern_addr_hi;

          if (!this.control.sprite_size) {
            if (!(this.spriteScanline[i].attribute & 0x80)) {
              sprite_pattern_addr_lo =
                (this.control.pattern_sprite << 12) |
                (this.spriteScanline[i].id << 4) |
                (this.scanline - this.spriteScanline[i].y);
            } else {
              sprite_pattern_addr_lo =
                (this.control.pattern_sprite << 12) |
                (this.spriteScanline[i].id << 4) |
                (7 - (this.scanline - this.spriteScanline[i].y));
            }
          } else {
            if (!(this.spriteScanline[i].attribute & 0x80)) {
              if (this.scanline - this.spriteScanline[i].y < 8) {
                sprite_pattern_addr_lo =
                  ((this.spriteScanline[i].id & 0x01) << 12) | // Which Pattern Table? 0KB or 4KB offset
                  ((this.spriteScanline[i].id & 0xfe) << 4) | // Which Cell? Tile ID * 16 (16 bytes per tile)
                  ((this.scanline - this.spriteScanline[i].y) & 0x07); // Which Row in cell? (0->7)
              } else {
                sprite_pattern_addr_lo =
                  ((this.spriteScanline[i].id & 0x01) << 12) | // Which Pattern Table? 0KB or 4KB offset
                  (((this.spriteScanline[i].id & 0xfe) + 1) << 4) | // Which Cell? Tile ID * 16 (16 bytes per tile)
                  ((this.scanline - this.spriteScanline[i].y) & 0x07); // Which Row in cell? (0->7)
              }
            } else {
              if (this.scanline - this.spriteScanline[i].y < 8) {
                sprite_pattern_addr_lo =
                  ((this.spriteScanline[i].id & 0x01) << 12) | // Which Pattern Table? 0KB or 4KB offset
                  (((this.spriteScanline[i].id & 0xfe) + 1) << 4) | // Which Cell? Tile ID * 16 (16 bytes per tile)
                  ((7 - (this.scanline - this.spriteScanline[i].y)) & 0x07); // Which Row in cell? (0->7)
              } else {
                sprite_pattern_addr_lo =
                  ((this.spriteScanline[i].id & 0x01) << 12) | // Which Pattern Table? 0KB or 4KB offset
                  ((this.spriteScanline[i].id & 0xfe) << 4) | // Which Cell? Tile ID * 16 (16 bytes per tile)
                  ((7 - (this.scanline - this.spriteScanline[i].y)) & 0x07); // Which Row in cell? (0->7)
              }
            }
          }

          sprite_pattern_addr_hi = sprite_pattern_addr_lo + 8;

          sprite_pattern_bits_lo = this.ppuRead(sprite_pattern_addr_lo);
          sprite_pattern_bits_hi = this.ppuRead(sprite_pattern_addr_hi);

          if (this.spriteScanline[i].attribute & 0x40) {
            const flipbyte = (b: Uint8Array[0]) => {
              b = ((b & 0xf0) >> 4) | ((b & 0x0f) << 4);
              b = ((b & 0xcc) >> 2) | ((b & 0x33) << 2);
              b = ((b & 0xaa) >> 1) | ((b & 0x55) << 1);
              return b;
            };

            sprite_pattern_bits_lo = flipbyte(sprite_pattern_bits_lo);
            sprite_pattern_bits_hi = flipbyte(sprite_pattern_bits_hi);
          }

          this.spriteShifterPatternLo[i] = sprite_pattern_bits_lo;
          this.spriteShifterPatternHi[i] = sprite_pattern_bits_hi;
        }
      }
    }

    if (this.scanline === 240) {
    }

    if (this.scanline >= 241 && this.scanline < 261) {
      if (this.scanline === 241 && this.cycle === 1) {
        this.status.vertical_blank = 1;

        if (this.control.enable_nmi) this.nmi = true;
      }
    }

    let bg_pixel = 0x00; // The 2-bit pixel to be rendered
    let bg_palette = 0x00; // The 3-bit index of the palette the pixel indexes

    if (this.mask.render_background) {
      if (this.mask.render_background_left || this.cycle >= 9) {
        let bit_mux = 0x8000 >> this.fineX;

        let p0_pixel = (this.bgShifterPatternLo & bit_mux) > 0 ? 1 : 0;
        let p1_pixel = (this.bgShifterPatternHi & bit_mux) > 0 ? 1 : 0;

        bg_pixel = (p1_pixel << 1) | p0_pixel;

        let bg_pal0 = (this.bgShifterAttribLo & bit_mux) > 0 ? 1 : 0;
        let bg_pal1 = (this.bgShifterAttribHi & bit_mux) > 0 ? 1 : 0;
        bg_palette = (bg_pal1 << 1) | bg_pal0;
      }
    }

    let fg_pixel = 0x00; // The 2-bit pixel to be rendered
    let fg_palette = 0x00; // The 3-bit index of the palette the pixel indexes
    let fg_priority = 0x00; // A bit of the sprite attribute indicates if its

    if (this.mask.render_sprites) {
      if (this.mask.render_sprites_left || this.cycle >= 9) {
        this.spriteZeroBeingRendered = false;

        for (let i = 0; i < this.spriteCount; i++) {
          if (this.spriteScanline[i].x == 0) {
            let fg_pixel_lo =
              (this.spriteShifterPatternLo[i] & 0x80) > 0 ? 1 : 0;
            let fg_pixel_hi =
              (this.spriteShifterPatternHi[i] & 0x80) > 0 ? 1 : 0;
            fg_pixel = (fg_pixel_hi << 1) | fg_pixel_lo;

            fg_palette = (this.spriteScanline[i].attribute & 0x03) + 0x04;
            fg_priority =
              (this.spriteScanline[i].attribute & 0x20) === 0 ? 1 : 0;

            if (fg_pixel != 0) {
              if (i == 0) {
                // Is this sprite zero?
                this.spriteZeroBeingRendered = true;
              }

              break;
            }
          }
        }
      }
    }

    let pixel = 0x00;
    let palette = 0x00;

    if (bg_pixel == 0 && fg_pixel == 0) {
      pixel = 0x00;
      palette = 0x00;
    } else if (bg_pixel == 0 && fg_pixel > 0) {
      pixel = fg_pixel;
      palette = fg_palette;
    } else if (bg_pixel > 0 && fg_pixel == 0) {
      pixel = bg_pixel;
      palette = bg_palette;
    } else if (bg_pixel > 0 && fg_pixel > 0) {
      if (fg_priority) {
        pixel = fg_pixel;
        palette = fg_palette;
      } else {
        pixel = bg_pixel;
        palette = bg_palette;
      }

      if (this.spriteZeroHitPossible && this.spriteZeroBeingRendered) {
        if (this.mask.render_background & this.mask.render_sprites) {
          if (
            !(this.mask.render_background_left | this.mask.render_sprites_left)
          ) {
            if (this.cycle >= 9 && this.cycle < 258) {
              this.status.sprite_zero_hit = 1;
            }
          } else {
            if (this.cycle >= 1 && this.cycle < 258) {
              this.status.sprite_zero_hit = 1;
            }
          }
        }
      }
    }

    this.sprScreen.setPixel(
      this.cycle - 1,
      this.scanline,
      this.getColorFromPaletteRam(palette, pixel)
    );

    // Advance renderer - it never stops, it's relentless
    this.cycle++;
    if (this.mask.render_background || this.mask.render_sprites)
      if (this.cycle == 260 && this.scanline < 240) {
        this.cart.getMapper().scanline();
      }

    if (this.cycle >= 341) {
      this.cycle = 0;
      this.scanline++;
      if (this.scanline >= 261) {
        this.scanline = -1;
        this.frameComplete = true;
        this.oddFrame = !this.oddFrame;
      }
    }
  }

  reset(): void {
    this.fineX = 0x00;
    this.addressLatch = 0x00;
    this.ppuDataBuffer = 0x00;
    this.scanline = 0;
    this.cycle = 0;
    this.bgNextTileId = 0x00;
    this.bgNextTileAttrib = 0x00;
    this.bgNextTileLsb = 0x00;
    this.bgNextTileMsb = 0x00;
    this.bgShifterPatternLo = 0x0000;
    this.bgShifterPatternHi = 0x0000;
    this.bgShifterAttribLo = 0x0000;
    this.bgShifterAttribHi = 0x0000;
    this.status.reg = 0x00;
    this.mask.reg = 0x00;
    this.control.reg = 0x00;
    this.vRamAddress.reg = 0x0000;
    this.tRamAddress.reg = 0x0000;
    this.scanlineTrigger = false;
    this.oddFrame = false;
  }
}

interface PPUStatus {
  unused: Uint8Array[0];
  sprite_overflow: Uint8Array[0];
  sprite_zero_hit: Uint8Array[0];
  vertical_blank: Uint8Array[0];
  reg: Uint8Array[0];
}

interface PPUMask {
  grayscale: Uint8Array[0];
  render_background_left: Uint8Array[0];
  render_sprites_left: Uint8Array[0];
  render_background: Uint8Array[0];
  render_sprites: Uint8Array[0];
  enhance_red: Uint8Array[0];
  enhance_green: Uint8Array[0];
  enhance_blue: Uint8Array[0];
  reg: Uint8Array[0];
}

interface PPUCtrl {
  nametable_x: Uint8Array[0];
  nametable_y: Uint8Array[0];
  increment_mode: Uint8Array[0];
  pattern_sprite: Uint8Array[0];
  pattern_background: Uint8Array[0];
  sprite_size: Uint8Array[0];
  slave_mode: Uint8Array[0];
  enable_nmi: Uint8Array[0];
  reg: Uint8Array[0];
}

interface LoopyRegister {
  coarse_x: Uint16Array[0];
  coarse_y: Uint16Array[0];
  nametable_x: Uint16Array[0];
  nametable_y: Uint16Array[0];
  fine_y: Uint16Array[0];
  unused: Uint16Array[0];
  reg: Uint16Array[0];
}

interface ObjectAttributeEntry {
  y: Uint8Array[0];
  id: Uint8Array[0];
  attribute: Uint8Array[0];
  x: Uint8Array[0];
}
