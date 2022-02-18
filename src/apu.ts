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

class Oscpulse {
  frequency: number = 0;
  dutycycle: number = 0;
  amplitude: number = 1;
  pi: number = 3.14159;
  harmonics: number = 20;

  sample(t: number): number {
    let a = 0;
    let b = 0;
    let p = this.dutycycle * 2.0 * this.pi;

    for (let n = 1; n < this.harmonics; n++) {
      const c = n * this.frequency * 2.0 * this.pi * t;
      a += -Math.sin(c) / n;
      b += -Math.sin(c - p * n) / n;
      //a += -sin(c) / n;
      //b += -sin(c - p * n) / n;
    }
    return ((2.0 * this.amplitude) / this.pi) * (a - b);
  }
}

class Sweeper {
  enabled: boolean = false;
  down: boolean = false;
  reload: boolean = false;
  shift: Uint8Array[0] = 0x00;
  timer: Uint8Array[0] = 0x00;
  period: Uint8Array[0] = 0x00;
  change: Uint16Array[0] = 0;
  mute: boolean = false;

  track(target: Uint16Array[0]): void {
    if (this.enabled) {
      this.change = target >> this.shift;
      this.mute = target < 8 || target > 0x7ff;
    }
  }

  clock(target: Uint16Array[0], channel: boolean): boolean {
    let changed = false;

    if (this.timer === 0 && this.enabled && this.shift > 0 && !this.mute) {
      if (target >= 8 && this.change < 0x07ff) {
        if (this.down) {
          target -= this.change - +channel;
        } else {
          target += this.change;
        }
        changed = true;
      }
    }
    //if (enabled)
    {
      if (this.timer == 0 || this.reload) {
        this.timer = this.period;
        this.reload = false;
      } else this.timer--;
      this.mute = target < 8 || target > 0x7ff;
    }
    return changed;
  }
}
