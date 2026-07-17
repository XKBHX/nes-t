import { Ref } from 'utils';
import { Mapper, MIRROR } from "./mapper";

export class Mapper066 extends Mapper {
  private cHRBankSelect: Uint8Array[0] = 0x00;
  private pRGBankSelect: Uint8Array[0] = 0x00;

  constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
    super(prgBanks, chrBanks);
  }

  override cpuMapRead(
    address: number,
    mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>,
    data: Ref<{ data: Uint8Array[0] }>
  ): boolean {
    if (address >= 0x8000 && address <= 0xffff) {
      mappedAddress.mappedAddress = this.pRGBankSelect * 0x8000 + (address & 0x7fff);
      return true;
    } else return false;
  }
  override cpuMapWrite(
    address: number,
    mappedAddress: { mappedAddress: Uint32Array[0] },
    data: Uint8Array[0]
  ): boolean {
    if (address >= 0x8000 && address <= 0xffff) {
      this.cHRBankSelect = data & 0x03;
      this.pRGBankSelect = (data & 0x30) >> 4;
    }

    return false;
  }
  override ppuMapRead(address: number, mappedAddress: { mappedAddress: Uint32Array[0] }): boolean {
    if (address < 0x2000) {
      mappedAddress.mappedAddress = this.cHRBankSelect * 0x2000 + address;
      return true;
    } else return false;
  }
  override ppuMapWrite(address: number, mappedAddress: { mappedAddress: Uint32Array[0] }): boolean {
    return false;
  }
  override reset(): void {
    this.cHRBankSelect = 0;
    this.pRGBankSelect = 0;
  }
}
