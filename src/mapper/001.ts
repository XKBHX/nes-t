import { Mapper, MIRROR } from "./mapper";

export class Mapper001 extends Mapper {
  private cHRBankSelect4Lo: Uint8Array[0] = 0x00;
  private cHRBankSelect4Hi: Uint8Array[0] = 0x00;
  private cHRBankSelect8: Uint8Array[0] = 0x00;
  private pRGBankSelect16Lo: Uint8Array[0] = 0x00;
  private pRGBankSelect16Hi: Uint8Array[0] = 0x00;
  private pRGBankSelect32: Uint8Array[0] = 0x00;
  private loadRegister: Uint8Array[0] = 0x00;
  private loadRegisterCount: Uint8Array[0] = 0x00;
  private controlRegister: Uint8Array[0] = 0x00;
  private mirrorMode: MIRROR = MIRROR.HORIZONTAL;
  private ramStatic: Uint8Array;

  constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
    super(prgBanks, chrBanks);
    this.ramStatic = new Uint8Array(32 * 1024);
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

    if (address >= 0x8000) {
      if (this.controlRegister & 0b01000) {
        if (address >= 0x8000 && address <= 0xbfff) {
          mappedAddress = this.pRGBankSelect16Lo * 0x4000 + (address & 0x3fff);
          return true;
        }

        if (address >= 0xc000 && address <= 0xffff) {
          mappedAddress = this.pRGBankSelect16Hi * 0x4000 + (address & 0x3fff);
          return true;
        }
      } else {
        mappedAddress = this.pRGBankSelect32 * 0x8000 + (address & 0x7fff);
        return true;
      }
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

    if (address >= 0x8000) {
      if (data & 0x80) {
        this.loadRegister = 0x00;
        this.loadRegisterCount = 0;
        this.controlRegister = this.controlRegister | 0x0c;
      } else {
        this.loadRegister >>= 1;
        this.loadRegister |= (data & 0x01) << 4;
        this.loadRegisterCount++;

        if (this.loadRegisterCount == 5) {
          const nTargetRegister = (address >> 13) & 0x03;

          if (nTargetRegister == 0) {
            this.controlRegister = this.loadRegister & 0x1f;

            switch (this.controlRegister & 0x03) {
              case 0:
                this.mirrorMode = MIRROR.ONESCREEN_LO;
                break;
              case 1:
                this.mirrorMode = MIRROR.ONESCREEN_HI;
                break;
              case 2:
                this.mirrorMode = MIRROR.VERTICAL;
                break;
              case 3:
                this.mirrorMode = MIRROR.HORIZONTAL;
                break;
            }
          } else if (nTargetRegister == 1) {
            if (this.controlRegister & 0b10000) {
              this.cHRBankSelect4Lo = this.loadRegister & 0x1f;
            } else {
              this.cHRBankSelect8 = this.loadRegister & 0x1e;
            }
          } else if (nTargetRegister == 2) {
            if (this.controlRegister & 0b10000) {
              this.cHRBankSelect4Hi = this.loadRegister & 0x1f;
            }
          } else if (nTargetRegister == 3) {
            const nPRGMode = (this.controlRegister >> 2) & 0x03;

            if (nPRGMode == 0 || nPRGMode == 1) {
              this.pRGBankSelect32 = (this.loadRegister & 0x0e) >> 1;
            } else if (nPRGMode == 2) {
              this.pRGBankSelect16Lo = 0;
              this.pRGBankSelect16Hi = this.loadRegister & 0x0f;
            } else if (nPRGMode == 3) {
              this.pRGBankSelect16Lo = this.loadRegister & 0x0f;
              this.pRGBankSelect16Hi = this.pRGBanks - 1;
            }
          }

          this.loadRegister = 0x00;
          this.loadRegisterCount = 0;
        }
      }
    }

    return false;
  }
  override ppuMapRead(address: number, mappedAddress: number): boolean {
    if (address < 0x2000) {
      if (this.cHRBanks === 0) {
        mappedAddress = address;
        return true;
      } else {
        if (this.controlRegister & 0b10000) {
          if (address >= 0x0000 && address <= 0x0fff) {
            mappedAddress = this.cHRBankSelect4Lo * 0x1000 + (address & 0x0fff);
            return true;
          }

          if (address >= 0x1000 && address <= 0x1fff) {
            mappedAddress = this.cHRBankSelect4Hi * 0x1000 + (address & 0x0fff);
            return true;
          }
        } else {
          mappedAddress = this.cHRBankSelect8 * 0x2000 + (address & 0x1fff);
          return true;
        }
      }
    }

    return false;
  }
  override ppuMapWrite(address: number, mappedAddress: number): boolean {
    if (address < 0x2000) {
      if (this.cHRBanks === 0) {
        mappedAddress = address;
        return true;
      }

      return true;
    } else return false;
  }
  override reset(): void {
    this.controlRegister = 0x1c;
    this.loadRegister = 0x00;
    this.loadRegisterCount = 0x00;

    this.cHRBankSelect4Lo = 0;
    this.cHRBankSelect4Hi = 0;
    this.cHRBankSelect8 = 0;

    this.pRGBankSelect32 = 0;
    this.pRGBankSelect16Lo = 0;
    this.pRGBankSelect16Hi = this.pRGBanks - 1;
  }
  override mirror(): MIRROR {
    return this.mirrorMode;
  }
  override irqState(): boolean {
    throw new Error("Method not implemented.");
  }
  override irqClear(): void {
    throw new Error("Method not implemented.");
  }
  override scanline(): void {
    throw new Error("Method not implemented.");
  }
}
