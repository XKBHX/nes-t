import { Mapper, MIRROR } from "./mapper";

export class Mapper003 extends Mapper {
  private cHRBankSelect: Uint8Array[0] = 0x00;

  constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
    super(prgBanks, chrBanks);
  }

  override cpuMapRead(
    address: number,
    mappedAddress: number,
    data: number
  ): boolean {
    if (address >= 0x8000 && address <= 0xffff) {
      if (this.pRGBanks == 1)
        mappedAddress = address & 0x3fff;
      if (this.pRGBanks == 2)
        mappedAddress = address & 0x7fff;
      return true;
    } else return false;
  }
  override cpuMapWrite(
    address: number,
    mappedAddress: number,
    data: number
  ): boolean {
    if (address >= 0x8000 && address <= 0xffff) {
      this.cHRBankSelect = data & 0x03;
      mappedAddress = address;
    }

    return false;
  }
  override ppuMapRead(address: number, mappedAddress: number): boolean {
    if (address < 0x2000) {
      mappedAddress = this.cHRBankSelect * 0x2000 + address;
      return true;
    } else return false;
  }
  override ppuMapWrite(address: number, mappedAddress: number): boolean {
    return false;
  }
  override reset(): void {
    this.cHRBankSelect = 0;
  }
  override mirror(): MIRROR {
    throw new Error("Method not implemented.");
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
