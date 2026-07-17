import { Ref } from 'utils';

export enum MIRROR {
    HARDWARE,
	HORIZONTAL,
	VERTICAL,
	ONESCREEN_LO,
	ONESCREEN_HI,
}

export abstract class Mapper {
    protected pRGBanks: Uint8Array[0] = 0;
    protected cHRBanks: Uint8Array[0] = 0;

    constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {
        this.pRGBanks = prgBanks;
        this.cHRBanks = chrBanks;
    }

    abstract cpuMapRead(address: Uint16Array[0], mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>, data: Ref<{ data: Uint8Array[0] }>): boolean;
    abstract cpuMapWrite(address: Uint16Array[0], mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>, data: Uint8Array[0]): boolean;
    abstract ppuMapRead(address: Uint16Array[0], mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>): boolean;
    abstract ppuMapWrite(address: Uint16Array[0], mappedAddress: Ref<{ mappedAddress: Uint32Array[0] }>): boolean;
    
    reset(): void {}
    mirror(): MIRROR { return MIRROR.HARDWARE; }
    irqState(): boolean { return false; }
    irqClear(): void {}
    scanline(): void {}
}