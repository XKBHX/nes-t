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

    constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) {}

    abstract cpuMapRead(address: Uint16Array[0], mappedAddress: Uint32Array[0], data: Uint8Array[0]): boolean;
    abstract cpuMapWrite(address: Uint16Array[0], mappedAddress: Uint32Array[0], data: Uint8Array[0]): boolean;
    abstract ppuMapRead(address: Uint16Array[0], mappedAddress: Uint32Array[0]): boolean;
    abstract ppuMapWrite(address: Uint16Array[0], mappedAddress: Uint32Array[0]): boolean;
    abstract reset(): void;
    abstract mirror(): MIRROR;
    abstract irqState(): boolean;
    abstract irqClear(): void;
    abstract scanline(): void;
}