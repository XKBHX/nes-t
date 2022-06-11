import { Mapper, MIRROR } from "./mapper";

export class Mapper000 extends Mapper {
  constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
    super(prgBanks, chrBanks);
  }

  override cpuMapRead(address: number, mappedAddress: number, data: number): boolean {
    if (address >= 0x8000 && address <= 0xffff) {
      mappedAddress = address & (this.pRGBanks > 1 ? 0x7fff : 0x3fff);
      return true;
    }

    return false;
  }
  
  override cpuMapWrite(address: number, mappedAddress: number, data: number): boolean {
    if (address >= 0x8000 && address <= 0xFFFF) {
	  	mappedAddress = address & (this.pRGBanks > 1 ? 0x7FFF : 0x3FFF);
	  	return true;
	  }

	  return false;
  }
  override ppuMapRead(address: number, mappedAddress: number): boolean {
    if (address >= 0x0000 && address <= 0x1FFF)
	{
		mappedAddress = address;
		return true;
	}

	return false;
  }
  override ppuMapWrite(address: number, mappedAddress: number): boolean {
    if (address >= 0x0000 && address <= 0x1FFF) {
	  	if (this.cHRBanks === 0) {
	  		// Treat as RAM
	  		mappedAddress = address;
	  		return true;
	  	}
	  }

	  return false;
  }
}
