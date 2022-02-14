export class Bus {
    private audioTime: number = 0.0;
    private audioGlobalTime: number = 0.0;
    private audioTimePerNESClock: number = 0.0;
    private audioTimePerSystemSample: number = 0.0;
    private systemClockCounter: number = 0;
    private controllerState: Uint8Array;
    private dmaPage: Uint8Array[0] = 0x00;
    private dmaAddress: Uint8Array[0] = 0x00;
    private dmaData: Uint8Array[0] = 0x00;
    private dmaDummy: boolean = true;
    private dmaTransfer: boolean = false;
    
    public audioSample: number = 0.0;
    public cpu: Cpu;
    public ppu: Ppu;
    public apu: Apu;
    public cartridge: Cartridge;
    public cpuRam: ArrayBuffer;
    public controller: Uint8Array;

    constructor() {}

    setSampleFrequency(sampleRate: number): void {}

    cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {}

    cpuRead(address: Uint16Array[0], readOnly = false): Uint8Array[0] {}

    insertCartridge(cartidge: Cartridge): void {}

    reset(): void {}

    clock(): boolean {}
}