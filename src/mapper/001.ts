import { Mapper, MIRROR } from './mapper';

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