import { Mapper, MIRROR } from './mapper';

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
    
    constructor(prgBanks: Uint8Array[0], chrBanks: Uint8Array[0]) { super(prgBanks, chrBanks); }
    
    override cpuMapRead(address: number, mappedAddress: number, data: number): boolean {
        throw new Error('Method not implemented.');
    }
    override cpuMapWrite(address: number, mappedAddress: number, data: number): boolean {
        throw new Error('Method not implemented.');
    }
    override ppuMapRead(address: number, mappedAddress: number): boolean {
        throw new Error('Method not implemented.');
    }
    override ppuMapWrite(address: number, mappedAddress: number): boolean {
        throw new Error('Method not implemented.');
    }
    override reset(): void {
        throw new Error('Method not implemented.');
    }
    override mirror(): MIRROR {
        throw new Error('Method not implemented.');
    }
    override irqState(): boolean {
        throw new Error('Method not implemented.');
    }
    override irqClear(): void {
        throw new Error('Method not implemented.');
    }
    override scanline(): void {
        throw new Error('Method not implemented.');
    }
}