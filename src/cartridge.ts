export class Cartridge {
    private imgValid: boolean = false;
    private hwMirror: MIRROR = MIRROR.HORIZONTAL;
    private mapperId: Uint8Array[0] = 0;
    private pRGBanks: Uint8Array[0] = 0;
    private cHRBanks: Uint8Array[0] = 0;
    private pRGMemory: Uint8Array;
    private cHRMemory: Uint8Array;
    private mapper: Mapper;

    constructor(fileName: string) {}

    imageValid(): boolean {}

    cpuRead(address: Uint16Array[0], data: Uint8Array[0]): boolean {}

    cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): boolean {}

    ppuRead(address: Uint16Array[0], data: Uint8Array[0]): boolean {}

    ppuWrite(address: Uint16Array[0], data: Uint8Array[0]): boolean {}

    reset(): void {}

    mirror(): MIRROR {}

    getMapper(): Mapper {}
}