import { Cartridge } from "./cartridge";
import { Cpu } from "./cpu";
import { Ppu } from "./ppu";
import { Apu } from "./apu";

export class Bus {
  private audioTime: number = 0.0;
  private audioGlobalTime: number = 0.0;
  private audioTimePerNESClock: number = 0.0;
  private audioTimePerSystemSample: number = 0.0;
  
  private systemClockCounter: number = 0;
  private controllerState: Uint8Array;
  private controllerStrobe: boolean = false;
  private controllerShiftCount: Uint8Array;
  private dmaPage: Uint8Array = new Uint8Array(1);
  private dmaAddress: Uint8Array = new Uint8Array(1);
  private dmaData: Uint8Array = new Uint8Array(1);
  private dmaDummy: boolean = true;
  private dmaTransfer: boolean = false;

  public audioSample: number = 0.0;
  public cpu: Cpu;
  public ppu: Ppu;
  public apu: Apu = <Apu><unknown>undefined;
  public cartridge: Cartridge;
  public cpuRam: Uint8Array;
  public controller: Uint8Array;

  constructor() {
    this.cpu = new Cpu();
    this.cpu.connectBus(this);
    this.ppu = new Ppu();
    this.apu = new Apu();
    this.cartridge = <Cartridge><unknown>undefined;
    this.cpuRam = new Uint8Array(2048);
    this.controller = new Uint8Array(2);
    this.controllerState = new Uint8Array(2);
    this.controllerShiftCount = new Uint8Array(2);
  }

  private reloadControllers(): void {
    this.controllerState[0] = this.controller[0];
    this.controllerState[1] = this.controller[1];
    this.controllerShiftCount[0] = 0;
    this.controllerShiftCount[1] = 0;
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
      this.apu.cpuWrite(address, data);
    } else if (address === 0x4014) {
      this.dmaPage[0] = data;
      this.dmaAddress[0] = 0x00;
      this.dmaTransfer = true;
    } else if (address === 0x4016) {
      this.controllerStrobe = (data & 0x01) !== 0;
      if (this.controllerStrobe) this.reloadControllers();
    }
  }

  cpuRead(address: Uint16Array[0], readOnly = false): Uint8Array[0] {
    const d = { data: 0x00 };
    let tag = '';

    if (this.cartridge.cpuRead(address, d)) { tag = 'Cartridge';//console.log('Bus::cpuRead()', d.data);
    } else if (address >= 0x0000 && address <= 0x1fff) {
      d.data = this.cpuRam[address & 0x07ff];
      //console.log('Data from RAM', d, address, address & 0x07ff);
      //console.log('RAM', this.cpuRam);
      tag = 'RAM';
    } else if (address >= 0x2000 && address <= 0x3fff) {
      const g = this.ppu.cpuRead(address & 0x0007, readOnly);
      d.data = g;
      //console.log('PPU!!!!!!!!', d, address, readOnly, g);
      tag = 'PPU';
    } else if (address == 0x4015) {
      d.data = this.apu.cpuRead(address);
      tag = 'APU';
    } else if (address >= 0x4016 && address <= 0x4017) {
      const port = address & 0x0001;
      if (this.controllerStrobe) this.reloadControllers();

      if (this.controllerShiftCount[port] < 8) {
        d.data = (this.controllerState[port] & 0x80) ? 1 : 0;
        if (!readOnly && !this.controllerStrobe) {
          this.controllerState[port] <<= 1;
          this.controllerShiftCount[port]++;
        }
      } else {
        d.data = 1;
      }
      tag = 'Controller';
    }

    //if (d.data ) console.log(`OPCODE: ${d.data} ${tag}`);
    return d.data;
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
    this.dmaPage[0] = 0x00;
    this.dmaAddress[0] = 0x00;
    this.dmaData[0] = 0x00;
    this.dmaDummy = true;
    this.dmaTransfer = false;
    this.controller[0] = 0x00;
    this.controller[1] = 0x00;
    this.controllerState[0] = 0x00;
    this.controllerState[1] = 0x00;
    this.controllerStrobe = false;
    this.controllerShiftCount[0] = 0;
    this.controllerShiftCount[1] = 0;
    console.log('RAM:', this.cpuRam[0xc004]);
  }

  clock(): boolean {
    this.ppu.clock();
    this.apu.clock();

    if (this.systemClockCounter % 3 === 0) {
      if (this.dmaTransfer) {
        if (this.dmaDummy) {
          if (this.systemClockCounter % 2 === 1) {
            this.dmaDummy = false;
          }
        } else {
          if (this.systemClockCounter % 2 === 0) {
            this.dmaData[0] = this.cpuRead((this.dmaPage[0] << 8) | this.dmaAddress[0]);
          } else {
            const oamIndex = this.dmaAddress[0] >> 2;
            const regIndex = this.dmaAddress[0] % 4;
            this.ppu.OAM[oamIndex].reg[regIndex] = this.dmaData[0];
            this.dmaAddress[0]++;

            if (this.dmaAddress[0] === 0x00) {
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
