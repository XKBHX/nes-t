import { Ref } from 'utils';
import { Mapper, MIRROR } from "./mapper";

export class Mapper002 extends Mapper {
  private pRGBankSelectLo: Uint8Array[0] = 0x00;
  private pRGBankSelectHi: Uint8Array[0] = 0x00;

  constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
    super(prgBanks, chrBanks);
  }

  override cpuMapRead(
    address: number,
    mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>,
    data: Ref<{ data: Uint8Array[0] }>
  ): boolean {
    if (address >= 0x8000 && address <= 0xbfff) {
      mappedAddress.mappedAddress = this.pRGBankSelectLo * 0x4000 + (address & 0x3fff);
      return true;
    }

    if (address >= 0xc000 && address <= 0xffff) {
      mappedAddress.mappedAddress = this.pRGBankSelectHi * 0x4000 + (address & 0x3fff);
      return true;
    }

    return false;
  }
  override cpuMapWrite(
    address: number,
    mappedAddress: { mappedAddress: Uint32Array[0] },
    data: Uint8Array[0]
  ): boolean {
    if (address >= 0x8000 && address <= 0xffff) {
      this.pRGBankSelectLo = data & 0x0f;
    }

    return false;
  }
  override ppuMapRead(address: number, mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>): boolean {
    if (address < 0x2000) {
      mappedAddress.mappedAddress = address;
      return true;
    } else return false;
  }
  override ppuMapWrite(address: number, mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>): boolean {
    if (address < 0x2000) {
      if (this.cHRBanks == 0) {
        mappedAddress.mappedAddress = address;
        return true;
      }
    }
    return false;
  }
  override reset(): void {
    this.pRGBankSelectLo = 0;
    this.pRGBankSelectHi = this.pRGBanks - 1;
  }
  //override mirror(): MIRROR {
  //  throw new Error("Method not implemented.");
  //}
  //override irqState(): boolean {
  //  throw new Error("Method not implemented.");
  //}
  //override irqClear(): void {
  //  throw new Error("Method not implemented.");
  //}
  //override scanline(): void {
  //  throw new Error("Method not implemented.");
  //}
}
