import { Cartridge } from "./cartridge";
import { Cpu } from "./cpu";
import { Ppu } from "./ppu";
//import { Apu } from "./apu";

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
  //public apu: Apu;
  public cartridge: Cartridge;
  public cpuRam: Uint8Array;
  public controller: Uint8Array;

  constructor() {
    this.cpu = new Cpu();
    this.cpu.connectBus(this);
    this.ppu = new Ppu();
    //this.apu = new Apu();
    this.cartridge = <Cartridge><unknown>undefined;
    this.cpuRam = new Uint8Array(10);
    this.controller = new Uint8Array(1);
    this.controllerState = new Uint8Array(1)
  }

  setSampleFrequency(sampleRate: Uint32Array[0]): void {
    this.audioTimePerSystemSample = 1.0 / sampleRate;
    this.audioTimePerNESClock = 1.0 / 5369318.0;
  }

  cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {
    if (this.cartridge.cpuWrite(address, data)) {
    } else if (address >= 0x0000 && address <= 0x1fff) {
      this.cpuRam[address & 0x07ff] = data;
    } else if (address >= 0x2000 && address <= 0x3fff) {
      this.ppu.cpuWrite(address & 0x0007, data);
    } else if (
      (address >= 0x4000 && address <= 0x4013) ||
      address == 0x4015 ||
      address == 0x4017
    ) {
      //this.apu.cpuWrite(address, data);
    } else if (address === 0x4014) {
      this.dmaPage = data;
      this.dmaAddress = 0x00;
      this.dmaTransfer = true;
    } else if (address >= 0x4016 && address <= 0x4017) {
      this.controllerState[address & 0x0001] =
        this.controller[address & 0x0001];
    }
  }

  cpuRead(address: Uint16Array[0], readOnly = false): Uint8Array[0] {
    let data: Uint8Array[0] = 0;

    if (this.cartridge.cpuRead(address, data)) { console.log('Bus::cpuRead()', data);
    } else if (address >= 0x0000 && address <= 0x1fff) {
      data = this.cpuRam[address & 0x07ff];
    } else if (address >= 0x2000 && address <= 0x3fff) {
      data = this.ppu.cpuRead(address & 0x0007, readOnly);
    } else if (address == 0x4015) {
      //data = this.apu.cpuRead(address);
    } else if (address >= 0x4016 && address <= 0x4017) {
      data = +((this.controllerState[address & 0x0001] & 0x80) > 0);
      this.controllerState[address & 0x0001] <<= 1;
    }

    return data;
  }

  insertCartridge(cartridge: Cartridge): void {
    this.cartridge = cartridge;
    this.ppu.connectCartridge(cartridge);
  }

  reset(): void {
    this.cartridge.reset();
    this.cpu.reset();
    this.ppu.reset();
    this.systemClockCounter = 0;
    this.dmaPage = 0x00;
    this.dmaAddress = 0x00;
    this.dmaData = 0x00;
    this.dmaDummy = true;
    this.dmaTransfer = false;
  }

  clock(): boolean {
    this.ppu.clock();
    //this.apu.clock();

    if (this.systemClockCounter % 3 === 0) {
      if (this.dmaTransfer) {
        if (this.dmaDummy) {
          if (this.systemClockCounter % 2 === 1) {
            this.dmaDummy = false;
          }
        } else {
          if (this.systemClockCounter % 2 === 0) {
            this.dmaData = this.cpuRead((this.dmaPage << 8) | this.dmaAddress);
          } else {
            //this.ppu.OAM[this.dmaAddress] = this.dmaData;
            this.dmaAddress++;

            if (this.dmaAddress === 0x00) {
              this.dmaTransfer = false;
              this.dmaDummy = true;
            }
          }
        }
      } else {
        this.cpu.clock();
      }
    }

    let audioSampleReady = false;
    this.audioTime += this.audioTimePerNESClock;

    if (this.audioTime >= this.audioTimePerSystemSample) {
      this.audioTime -= this.audioTimePerSystemSample;
      //this.audioSample = this.apu.getOutputSample();
      audioSampleReady = true;
    }

    if (this.ppu.nmi) {
      this.ppu.nmi = false;
      this.cpu.nmi();
    }

    if (this.cartridge.getMapper().irqState()) {
      this.cartridge.getMapper().irqClear();
      this.cpu.irq();
    }

    this.systemClockCounter++;

    return audioSampleReady;
  }
}
