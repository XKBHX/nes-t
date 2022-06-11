import { Mapper, MIRROR } from "./mapper";

export class Mapper004 extends Mapper {
  private targetRegister: Uint8Array[0] = 0x00;
  private pRGBankMode: boolean = false;
  private cHRInversion: boolean = false;
  private mirrorMode: MIRROR = MIRROR.HORIZONTAL;
  private register: Uint32Array;
  private cHRBank: Uint32Array;
  private pRGBank: Uint32Array;
  private iRQActive: boolean = false;
  private iRQEnable: boolean = false;
  private iRQUpdate: boolean = false;
  private iRQCounter: Uint16Array[0] = 0x0000;
  private iRQReload: Uint16Array[0] = 0x0000;
  private ramStatic: Uint8Array;

  constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
    super(prgBanks, chrBanks);
    this.ramStatic = new Uint8Array(32 * 1024);
    this.register = new Uint32Array(8);
    this.cHRBank = new Uint32Array(8);
    this.pRGBank = new Uint32Array(4);
  }

  override cpuMapRead(
    address: number,
    mappedAddress: number,
    data: number
  ): boolean {
    if (address >= 0x6000 && address <= 0x7fff) {
      mappedAddress = 0xffffffff;

      data = this.ramStatic[address & 0x1fff];

      return true;
    }

    if (address >= 0x8000 && address <= 0x9fff) {
      mappedAddress = this.pRGBank[0] + (address & 0x1fff);
      return true;
    }

    if (address >= 0xa000 && address <= 0xbfff) {
      mappedAddress = this.pRGBank[1] + (address & 0x1fff);
      return true;
    }

    if (address >= 0xc000 && address <= 0xdfff) {
      mappedAddress = this.pRGBank[2] + (address & 0x1fff);
      return true;
    }

    if (address >= 0xe000 && address <= 0xffff) {
      mappedAddress = this.pRGBank[3] + (address & 0x1fff);
      return true;
    }

    return false;
  }
  override cpuMapWrite(
    address: number,
    mappedAddress: number,
    data: number
  ): boolean {
    if (address >= 0x6000 && address <= 0x7fff) {
      mappedAddress = 0xffffffff;

      this.ramStatic[address & 0x1fff] = data;

      return true;
    }

    if (address >= 0x8000 && address <= 0x9fff) {
      if (!(address & 0x0001)) {
        this.targetRegister = data & 0x07;
        this.pRGBankMode = (data & 0x40) !== 0x00;
        this.cHRInversion = (data & 0x80) !== 0x00;
      } else {
        this.register[this.targetRegister] = data;

        if (this.cHRInversion) {
          this.cHRBank[0] = this.register[2] * 0x0400;
          this.cHRBank[1] = this.register[3] * 0x0400;
          this.cHRBank[2] = this.register[4] * 0x0400;
          this.cHRBank[3] = this.register[5] * 0x0400;
          this.cHRBank[4] = (this.register[0] & 0xfe) * 0x0400;
          this.cHRBank[5] = this.register[0] * 0x0400 + 0x0400;
          this.cHRBank[6] = (this.register[1] & 0xfe) * 0x0400;
          this.cHRBank[7] = this.register[1] * 0x0400 + 0x0400;
        } else {
          this.cHRBank[0] = (this.register[0] & 0xfe) * 0x0400;
          this.cHRBank[1] = this.register[0] * 0x0400 + 0x0400;
          this.cHRBank[2] = (this.register[1] & 0xfe) * 0x0400;
          this.cHRBank[3] = this.register[1] * 0x0400 + 0x0400;
          this.cHRBank[4] = this.register[2] * 0x0400;
          this.cHRBank[5] = this.register[3] * 0x0400;
          this.cHRBank[6] = this.register[4] * 0x0400;
          this.cHRBank[7] = this.register[5] * 0x0400;
        }

        if (this.pRGBankMode) {
          this.pRGBank[2] = (this.register[6] & 0x3f) * 0x2000;
          this.pRGBank[0] = (this.pRGBanks * 2 - 2) * 0x2000;
        } else {
          this.pRGBank[0] = (this.register[6] & 0x3f) * 0x2000;
          this.pRGBank[2] = (this.pRGBanks * 2 - 2) * 0x2000;
        }

        this.pRGBank[1] = (this.register[7] & 0x3f) * 0x2000;
        this.pRGBank[3] = (this.pRGBanks * 2 - 1) * 0x2000;
      }

      return false;
    }

    if (address >= 0xa000 && address <= 0xbfff) {
      if (!(address & 0x0001)) {
        if (data & 0x01) this.mirrorMode = MIRROR.HORIZONTAL;
        else this.mirrorMode = MIRROR.VERTICAL;
      } else {
        // PRG Ram Protect
        // TODO:
      }
      return false;
    }

    if (address >= 0xc000 && address <= 0xdfff) {
      if (!(address & 0x0001)) {
        this.iRQReload = data;
      } else {
        this.iRQCounter = 0x0000;
      }
      return false;
    }

    if (address >= 0xe000 && address <= 0xffff) {
      if (!(address & 0x0001)) {
        this.iRQEnable = false;
        this.iRQActive = false;
      } else {
        this.iRQEnable = true;
      }
      return false;
    }

    return false;
  }
  override ppuMapRead(address: number, mappedAddress: number): boolean {
    if (address >= 0x0000 && address <= 0x03ff) {
      mappedAddress = this.cHRBank[0] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x0400 && address <= 0x07ff) {
      mappedAddress = this.cHRBank[1] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x0800 && address <= 0x0bff) {
      mappedAddress = this.cHRBank[2] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x0c00 && address <= 0x0fff) {
      mappedAddress = this.cHRBank[3] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x1000 && address <= 0x13ff) {
      mappedAddress = this.cHRBank[4] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x1400 && address <= 0x17ff) {
      mappedAddress = this.cHRBank[5] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x1800 && address <= 0x1bff) {
      mappedAddress = this.cHRBank[6] + (address & 0x03ff);
      return true;
    }

    if (address >= 0x1c00 && address <= 0x1fff) {
      mappedAddress = this.cHRBank[7] + (address & 0x03ff);
      return true;
    }

    return false;
  }
  override ppuMapWrite(address: number, mappedAddress: number): boolean {
    return false;
  }
  override reset(): void {
    this.targetRegister = 0x00;
    this.pRGBankMode = false;
    this.cHRInversion = false;
    this.mirrorMode = MIRROR.HORIZONTAL;

    this.iRQActive = false;
    this.iRQEnable = false;
    this.iRQUpdate = false;
    this.iRQCounter = 0x0000;
    this.iRQReload = 0x0000;

    for (let i = 0; i < 4; i++) this.pRGBank[i] = 0;
    for (let i = 0; i < 8; i++) {
      this.cHRBank[i] = 0;
      this.register[i] = 0;
    }

    this.pRGBank[0] = 0 * 0x2000;
    this.pRGBank[1] = 1 * 0x2000;
    this.pRGBank[2] = (this.pRGBanks * 2 - 2) * 0x2000;
    this.pRGBank[3] = (this.pRGBanks * 2 - 1) * 0x2000;
  }
  override mirror(): MIRROR {
    return this.mirrorMode;
  }
  override irqState(): boolean {
    return this.iRQActive;
  }
  override irqClear(): void {
    this.iRQActive = false;
  }
  override scanline(): void {
    if (this.iRQCounter == 0) {
      this.iRQCounter = this.iRQReload;
    } else this.iRQCounter--;

    if (this.iRQCounter == 0 && this.iRQEnable) {
      this.iRQActive = true;
    }
  }
}
