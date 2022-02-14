export class Apu {
  private frameClock_counter: Uint32Array[0] = 0;
  private clockCounter: Uint32Array[0] = 0;
  private useRawMode: boolean = false;
  private static lengthTable: Uint8Array;
  private globalTime: number = 0.0;
  private pulse1Enable: boolean = false;
  private pulse1Halt: boolean = false;
  private pulse1Sample: number = 0.0;
  private pulse1Output: number = 0.0;
  private pulse2Seq: Sequencer;
  private pulse2Osc: Oscpulse;
  private pulse2Env: Envelope;
  private pulse2Lc: LengthCounter;
  private pulse2Sweep: Sweeper;
  private noiseEnable: boolean = false;
  private noiseHalt: boolean = false;
  private noiseEnv: Envelope;
  private noiseLc: LengthCounter;
  private noiseSeq: Sequencer;
  private noiseSample: number = 0;
  private noiseOutput: number = 0;

  public pulse1Visual: Uint16Array[0] = 0;
  public pulse2Visual: Uint16Array[0] = 0;
  public noiseVisual: Uint16Array[0] = 0;
  public triangleVisual: Uint16Array[0] = 0;

  constructor() {}

  cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {}

  cpuRead(address: Uint16Array[0]): Uint8Array[0] {}

  clock(): void {}

  reset(): void {}

  getOutputSample(): number {}
}

class Sequencer {
  sequence: Uint32Array[0] = 0x00000000;
  new_sequence: Uint32Array[0] = 0x00000000;
  timer: Uint16Array[0] = 0x0000;
  reload: Uint16Array[0] = 0x0000;
  output: Uint8Array[0] = 0x00;

  // Pass in a lambda function to manipulate the sequence as required
  // by the owner of this sequencer module
  clock(
    enable: boolean,
    funcManip: (s: Uint32Array[0]) => void
  ): Uint8Array[0] {
    if (enable) {
      this.timer--;
      if (this.timer === 0xffff) {
        this.timer = this.reload;
        funcManip(this.sequence);
        this.output = this.sequence & 0x00000001;
      }
    }
    return this.output;
  }
}

class LengthCounter {
  counter: Uint8Array[0] = 0x00;

  clock(enable: boolean, halt: boolean) {
    if (!enable) this.counter = 0;
    else if (this.counter > 0 && !halt) this.counter--;
    return this.counter;
  }
}

class Envelope {
  start: boolean = false;
  disable: boolean = false;
  dividerCount: Uint16Array[0] = 0;
  volume: Uint16Array[0] = 0;
  output: Uint16Array[0] = 0;
  decayCount: Uint16Array[0] = 0;

  clock(loop: boolean): void {
    if (!this.start) {
      if (this.dividerCount == 0) {
        this.dividerCount = this.volume;
        if (this.decayCount == 0) {
          if (loop) {
            this.decayCount = 15;
          }
        } else this.decayCount--;
      } else this.dividerCount--;
    } else {
      this.start = false;
      this.decayCount = 15;
      this.dividerCount = this.volume;
    }
    if (this.disable) {
      this.output = this.volume;
    } else {
      this.output = this.decayCount;
    }
  }
}

class Oscpulse {}

class Sweeper {}
