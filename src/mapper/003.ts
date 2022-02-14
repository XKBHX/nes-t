import { Mapper, MIRROR } from './mapper';

export class Mapper003 extends Mapper {
    private cHRBankSelect: Uint8Array[0] = 0x00;
    
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