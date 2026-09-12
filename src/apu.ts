import { Ref } from './utils';

export class Apu {
  private frameClockCounter: Uint32Array[0] = 0;
  private clockCounter: Uint32Array[0] = 0;
  private useRawMode: boolean = false;
  
  private static lengthTable: Uint8Array = new Uint8Array([
    10, 254, 20,  2, 40,  4, 80,  6,
   160,   8, 60, 10, 14, 12, 26, 14,
    12,  16, 24, 18, 48, 20, 96, 22,
   192,  24, 72, 26, 16, 28, 32, 30]);
  
   private globalTime: number = 0.0;

  private pulse1Enable: boolean = false;
  private pulse1Halt: boolean = false;
  private pulse1Sample: number = 0.0;
  private pulse1Output: number = 0.0;
  private pulse1Seq: Sequencer = new Sequencer();
  private pulse1Osc: Oscpulse = new Oscpulse();
  private pulse1Env: Envelope = new Envelope();
  private pulse1Lc: LengthCounter = new LengthCounter();
  private pulse1Sweep: Sweeper = new Sweeper();

  private pulse2Enable: boolean = false;
  private pulse2Halt: boolean = false;
  private pulse2Sample: number = 0.0;
  private pulse2Output: number = 0.0;
  private pulse2Seq: Sequencer = new Sequencer();
  private pulse2Osc: Oscpulse = new Oscpulse();
  private pulse2Env: Envelope = new Envelope();
  private pulse2Lc: LengthCounter = new LengthCounter();
  private pulse2Sweep: Sweeper = new Sweeper();

  private noiseEnable: boolean = false;
  private noiseHalt: boolean = false;
  private noiseEnv: Envelope = new Envelope();
  private noiseLc: LengthCounter = new LengthCounter();
  private noiseSeq: Sequencer = new Sequencer();
  private noiseSample: number = 0;
  private noiseOutput: number = 0;

  public pulse1Visual: Uint16Array[0] = 0;
  public pulse2Visual: Uint16Array[0] = 0;
  public noiseVisual: Uint16Array[0] = 0;
  public triangleVisual: Uint16Array[0] = 0;

  private triangleEnable: boolean = false;
  private triangleHalt: boolean = false;
  private triangleLinearReload: number = 0;
  private triangleLinearCounter: number = 0;
  private triangleLinearReloadFlag: boolean = false;
  private triangleStep: number = 0;
  private triangleOutput: number = 0;
  private triangleSeq: Sequencer = new Sequencer();
  private triangleLc: LengthCounter = new LengthCounter();

  private static triangleTable: Uint8Array = new Uint8Array([
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);

  private hp90a = 0;
  private hp440a = 0;
  private lp14ka = 0;
  private hp90x = 0;
  private hp90y = 0;
  private hp440x = 0;
  private hp440y = 0;
  private lp14ky = 0;

  constructor() {
    this.noiseSeq.sequence = 1;
    this.setOutputSampleRate(44100);
  }

  setOutputSampleRate(sampleRate: number): void {
    const rate = sampleRate > 0 ? sampleRate : 44100;
    this.hp90a = highPassAlpha(rate, 90);
    this.hp440a = highPassAlpha(rate, 440);
    this.lp14ka = lowPassAlpha(rate, 14000);
  }

  cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {
    switch (address) {
      case 0x4000:
        switch ((data & 0xc0) >> 6) {
          case 0x00:
            this.pulse1Seq.new_sequence = 0b01000000;
            this.pulse1Osc.dutycycle = 0.125;
            break;
          case 0x01:
            this.pulse1Seq.new_sequence = 0b01100000;
            this.pulse1Osc.dutycycle = 0.25;
            break;
          case 0x02:
            this.pulse1Seq.new_sequence = 0b01111000;
            this.pulse1Osc.dutycycle = 0.5;
            break;
          case 0x03:
            this.pulse1Seq.new_sequence = 0b10011111;
            this.pulse1Osc.dutycycle = 0.75;
            break;
        }
        this.pulse1Seq.sequence = this.pulse1Seq.new_sequence;
        this.pulse1Halt = (data & 0x20) !== 0x00;
        this.pulse1Env.volume = data & 0x0f;
        this.pulse1Env.disable = (data & 0x10) !== 0x00;
        break;

      case 0x4001:
        this.pulse1Sweep.enabled = (data & 0x80) !== 0x00;
        this.pulse1Sweep.period = (data & 0x70) >> 4;
        this.pulse1Sweep.down = (data & 0x08) !== 0x00;
        this.pulse1Sweep.shift = data & 0x07;
        this.pulse1Sweep.reload = true;
        break;

      case 0x4002:
        this.pulse1Seq.reload = (this.pulse1Seq.reload & 0xff00) | data;
        break;

      case 0x4003:
        this.pulse1Seq.reload =
          ((data & 0x07) << 8) | (this.pulse1Seq.reload & 0x00ff);
        this.pulse1Seq.timer = this.pulse1Seq.reload;
        this.pulse1Seq.sequence = this.pulse1Seq.new_sequence;
        this.pulse1Lc.counter = Apu.lengthTable[(data & 0xf8) >> 3];
        this.pulse1Env.start = true;
        break;

      case 0x4004:
        switch ((data & 0xc0) >> 6) {
          case 0x00:
            this.pulse2Seq.new_sequence = 0b01000000;
            this.pulse2Osc.dutycycle = 0.125;
            break;
          case 0x01:
            this.pulse2Seq.new_sequence = 0b01100000;
            this.pulse2Osc.dutycycle = 0.25;
            break;
          case 0x02:
            this.pulse2Seq.new_sequence = 0b01111000;
            this.pulse2Osc.dutycycle = 0.5;
            break;
          case 0x03:
            this.pulse2Seq.new_sequence = 0b10011111;
            this.pulse2Osc.dutycycle = 0.75;
            break;
        }
        this.pulse2Seq.sequence = this.pulse2Seq.new_sequence;
        this.pulse2Halt = (data & 0x20) !== 0x00;
        this.pulse2Env.volume = data & 0x0f;
        this.pulse2Env.disable = (data & 0x10) !== 0x00;
        break;

      case 0x4005:
        this.pulse2Sweep.enabled = (data & 0x80) !== 0x00;
        this.pulse2Sweep.period = (data & 0x70) >> 4;
        this.pulse2Sweep.down = (data & 0x08) !== 0x00;
        this.pulse2Sweep.shift = data & 0x07;
        this.pulse2Sweep.reload = true;
        break;

      case 0x4006:
        this.pulse2Seq.reload = (this.pulse2Seq.reload & 0xff00) | data;
        break;

      case 0x4007:
        this.pulse2Seq.reload =
          ((data & 0x07) << 8) | (this.pulse2Seq.reload & 0x00ff);
        this.pulse2Seq.timer = this.pulse2Seq.reload;
        this.pulse2Seq.sequence = this.pulse2Seq.new_sequence;
        this.pulse2Lc.counter = Apu.lengthTable[(data & 0xf8) >> 3];
        this.pulse2Env.start = true;

        break;

      case 0x4008:
        this.triangleHalt = (data & 0x80) !== 0x00;
        this.triangleLinearReload = data & 0x7f;
        break;

      case 0x400a:
        this.triangleSeq.reload = (this.triangleSeq.reload & 0xff00) | data;
        break;

      case 0x400b:
        this.triangleSeq.reload =
          ((data & 0x07) << 8) | (this.triangleSeq.reload & 0x00ff);
        this.triangleSeq.timer = this.triangleSeq.reload;
        this.triangleLc.counter = Apu.lengthTable[(data & 0xf8) >> 3];
        this.triangleLinearReloadFlag = true;
        break;

      case 0x400c:
        this.noiseEnv.volume = data & 0x0f;
        this.noiseEnv.disable = (data & 0x10) !== 0x00;
        this.noiseHalt = (data & 0x20) !== 0x00;
        break;

      case 0x400e:
        switch (data & 0x0f) {
          case 0x00:
            this.noiseSeq.reload = 0;
            break;
          case 0x01:
            this.noiseSeq.reload = 4;
            break;
          case 0x02:
            this.noiseSeq.reload = 8;
            break;
          case 0x03:
            this.noiseSeq.reload = 16;
            break;
          case 0x04:
            this.noiseSeq.reload = 32;
            break;
          case 0x05:
            this.noiseSeq.reload = 64;
            break;
          case 0x06:
            this.noiseSeq.reload = 96;
            break;
          case 0x07:
            this.noiseSeq.reload = 128;
            break;
          case 0x08:
            this.noiseSeq.reload = 160;
            break;
          case 0x09:
            this.noiseSeq.reload = 202;
            break;
          case 0x0a:
            this.noiseSeq.reload = 254;
            break;
          case 0x0b:
            this.noiseSeq.reload = 380;
            break;
          case 0x0c:
            this.noiseSeq.reload = 508;
            break;
          case 0x0d:
            this.noiseSeq.reload = 1016;
            break;
          case 0x0e:
            this.noiseSeq.reload = 2034;
            break;
          case 0x0f:
            this.noiseSeq.reload = 4068;
            break;
        }
        break;

      case 0x4015: // APU STATUS
        this.pulse1Enable = (data & 0x01) !== 0x00;
        this.pulse2Enable = (data & 0x02) !== 0x00;
        this.triangleEnable = (data & 0x04) !== 0x00;
        this.noiseEnable = (data & 0x08) !== 0x00;
        if (!this.pulse1Enable) this.pulse1Lc.counter = 0;
        if (!this.pulse2Enable) this.pulse2Lc.counter = 0;
        if (!this.triangleEnable) this.triangleLc.counter = 0;
        if (!this.noiseEnable) this.noiseLc.counter = 0;
        break;

      case 0x400f:
        this.pulse1Env.start = true;
        this.pulse2Env.start = true;
        this.noiseEnv.start = true;
        this.noiseLc.counter = Apu.lengthTable[(data & 0xf8) >> 3];
        break;
    }
  }

  cpuRead(address: Uint16Array[0]): Uint8Array[0] {
    let data = 0x00;

    if (address == 0x4015) {
      data |= (this.pulse1Lc.counter > 0) ? 0x01 : 0x00;
      data |= (this.pulse2Lc.counter > 0) ? 0x02 : 0x00;
      data |= (this.triangleLc.counter > 0) ? 0x04 : 0x00;
      data |= (this.noiseLc.counter > 0) ? 0x08 : 0x00;
    }

    return data;
  }

  clock(): void {
    let bQuarterFrameClock = false;
    let bHalfFrameClock = false;

    if (this.clockCounter % 3 === 0) {
      this.clockTriangleTimer();
    }

    if (this.clockCounter % 6 == 0) {
      this.frameClockCounter++;

      // 4-Step Sequence Mode
      if (this.frameClockCounter == 3729) {
        bQuarterFrameClock = true;
      }

      if (this.frameClockCounter == 7457) {
        bQuarterFrameClock = true;
        bHalfFrameClock = true;
      }

      if (this.frameClockCounter == 11186) {
        bQuarterFrameClock = true;
      }

      if (this.frameClockCounter == 14916) {
        bQuarterFrameClock = true;
        bHalfFrameClock = true;
        this.frameClockCounter = 0;
      }

      // Update functional units

      // Quater frame "beats" adjust the volume envelope
      if (bQuarterFrameClock) {
        this.pulse1Env.clock(this.pulse1Halt);
        this.pulse2Env.clock(this.pulse2Halt);
        this.noiseEnv.clock(this.noiseHalt);
        this.clockTriangleLinear();
      }

      if (bHalfFrameClock) {
        this.pulse1Lc.clock(this.pulse1Enable, this.pulse1Halt);
        this.pulse2Lc.clock(this.pulse2Enable, this.pulse2Halt);
        this.triangleLc.clock(this.triangleEnable, this.triangleHalt);
        this.noiseLc.clock(this.noiseEnable, this.noiseHalt);
        this.pulse1Sweep.clock({ target: this.pulse1Seq.reload }, false);
        this.pulse2Sweep.clock({ target: this.pulse2Seq.reload }, true);
      }

      this.pulse1Seq.clock(this.pulse1Enable, (s: Uint32Array[0]) => {
        return ((s & 0x0001) << 7) | ((s & 0x00fe) >> 1);
      });
      this.pulse2Seq.clock(this.pulse2Enable, (s: Uint32Array[0]) => {
        return ((s & 0x0001) << 7) | ((s & 0x00fe) >> 1);
      });

      if (this.useRawMode) {
        this.globalTime += 0.3333333333 / 1789773;
        this.pulse1Osc.frequency =
          1789773.0 / (16.0 * (this.pulse1Seq.reload + 1));
        this.pulse1Osc.amplitude = (this.pulse1Env.output - 1) / 16.0;
        this.pulse1Sample = this.pulse1Osc.sample(this.globalTime);

        if (
          this.pulse1Lc.counter > 0 &&
          this.pulse1Seq.timer >= 8 &&
          !this.pulse1Sweep.mute &&
          this.pulse1Env.output > 2
        )
          this.pulse1Output += (this.pulse1Sample - this.pulse1Output) * 0.5;
        else this.pulse1Output = 0;

        this.pulse2Osc.frequency =
          1789773.0 / (16.0 * (this.pulse2Seq.reload + 1));
        this.pulse2Osc.amplitude = (this.pulse2Env.output - 1) / 16.0;
        this.pulse2Sample = this.pulse2Osc.sample(this.globalTime);

        if (
          this.pulse2Lc.counter > 0 &&
          this.pulse2Seq.timer >= 8 &&
          !this.pulse2Sweep.mute &&
          this.pulse2Env.output > 2
        )
          this.pulse2Output += (this.pulse2Sample - this.pulse2Output) * 0.5;
        else this.pulse2Output = 0;
      } else {
        this.pulse1Sample = this.pulse1Seq.output;
        this.pulse1Output =
          this.pulse1Lc.counter > 0 &&
          this.pulse1Seq.reload >= 8 &&
          !this.pulse1Sweep.mute
            ? this.pulse1Sample * this.pulse1Env.output
            : 0;

        this.pulse2Sample = this.pulse2Seq.output;
        this.pulse2Output =
          this.pulse2Lc.counter > 0 &&
          this.pulse2Seq.reload >= 8 &&
          !this.pulse2Sweep.mute
            ? this.pulse2Sample * this.pulse2Env.output
            : 0;
      }

      this.noiseSeq.clock(this.noiseEnable, (s: Uint32Array[0]) => {
        return (((s & 0x0001) ^ ((s & 0x0002) >> 1)) << 14) | ((s & 0x7fff) >> 1);
      });

      if (this.noiseLc.counter > 0) {
        this.noiseOutput = this.noiseSeq.output * this.noiseEnv.output;
      } else {
        this.noiseOutput = 0;
      }

      if (!this.pulse1Enable) this.pulse1Output = 0;
      if (!this.pulse2Enable) this.pulse2Output = 0;
      if (!this.triangleEnable) this.triangleOutput = 0;
      if (!this.noiseEnable) this.noiseOutput = 0;
    }

    this.pulse1Sweep.track(this.pulse1Seq.reload);
    this.pulse2Sweep.track(this.pulse2Seq.reload);

    this.pulse1Visual =
      this.pulse1Enable && this.pulse1Env.output > 1 && !this.pulse1Sweep.mute
        ? this.pulse1Seq.reload
        : 2047;
    this.pulse2Visual =
      this.pulse2Enable && this.pulse2Env.output > 1 && !this.pulse2Sweep.mute
        ? this.pulse2Seq.reload
        : 2047;
    this.noiseVisual =
      this.noiseEnable && this.noiseEnv.output > 1
        ? this.noiseSeq.reload
        : 2047;
    this.triangleVisual =
      this.triangleEnable && this.triangleLinearCounter > 0
        ? this.triangleSeq.reload
        : 2047;

    this.clockCounter++;
  }

  reset(): void {
    this.pulse1Enable = false;
    this.pulse2Enable = false;
    this.triangleEnable = false;
    this.noiseEnable = false;
    this.pulse1Lc.counter = 0;
    this.pulse2Lc.counter = 0;
    this.triangleLc.counter = 0;
    this.noiseLc.counter = 0;
    this.pulse1Output = 0;
    this.pulse2Output = 0;
    this.triangleOutput = 0;
    this.noiseOutput = 0;
    this.clockCounter = 0;
    this.frameClockCounter = 0;
    this.noiseSeq.sequence = 1;
    this.triangleStep = 0;
    this.triangleLinearCounter = 0;
    this.triangleLinearReloadFlag = false;
    this.hp90x = 0;
    this.hp90y = 0;
    this.hp440x = 0;
    this.hp440y = 0;
    this.lp14ky = 0;
  }

  mixRaw(): number {
    const pulse = this.pulse1Output + this.pulse2Output;
    const tnd = this.triangleOutput / 8227.0 + this.noiseOutput / 12241.0;
    const pulseOut = pulse > 0 ? 95.88 / (8128.0 / pulse + 100.0) : 0;
    const tndOut = tnd > 0 ? 159.79 / (1.0 / tnd + 100.0) : 0;
    return pulseOut + tndOut;
  }

  filterSample(sample: number): number {
    this.hp90y = this.hp90a * (this.hp90y + sample - this.hp90x);
    this.hp90x = sample;
    this.hp440y = this.hp440a * (this.hp440y + this.hp90y - this.hp440x);
    this.hp440x = this.hp90y;
    this.lp14ky += this.lp14ka * (this.hp440y - this.lp14ky);
    return this.lp14ky;
  }

  getOutputSample(): number {
    if (this.useRawMode) {
      return (this.pulse1Sample - 0.5) * 0.5 + (this.pulse2Sample - 0.5) * 0.5;
    }
    return this.filterSample(this.mixRaw());
  }

  private clockTriangleTimer(): void {
    this.triangleSeq.timer = (this.triangleSeq.timer - 1) & 0xffff;
    if (this.triangleSeq.timer === 0xffff) {
      this.triangleSeq.timer = this.triangleSeq.reload;
      if (this.triangleLinearCounter > 0 && this.triangleLc.counter > 0) {
        this.triangleStep = (this.triangleStep + 1) & 31;
      }
    }

    if (
      this.triangleEnable &&
      this.triangleLinearCounter > 0 &&
      this.triangleLc.counter > 0 &&
      this.triangleSeq.reload >= 2
    ) {
      this.triangleOutput = Apu.triangleTable[this.triangleStep];
    } else {
      this.triangleOutput = 0;
    }
  }

  private clockTriangleLinear(): void {
    if (this.triangleLinearReloadFlag) {
      this.triangleLinearCounter = this.triangleLinearReload;
    } else if (this.triangleLinearCounter > 0) {
      this.triangleLinearCounter--;
    }
    if (!this.triangleHalt) this.triangleLinearReloadFlag = false;
  }
}

function highPassAlpha(sampleRate: number, cutoff: number): number {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  return rc / (rc + dt);
}

function lowPassAlpha(sampleRate: number, cutoff: number): number {
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  return dt / (rc + dt);
}

class Sequencer {
  sequence: Uint32Array[0] = 0x00000000;
  new_sequence: Uint32Array[0] = 0x00000000;
  timer: Uint16Array[0] = 0x0000;
  reload: Uint16Array[0] = 0x0000;
  output: Uint8Array[0] = 0x00;

  clock(
    enable: boolean,
    funcManip: (s: Uint32Array[0]) => Uint32Array[0]
  ): Uint8Array[0] {
    if (enable) {
      this.timer = (this.timer - 1) & 0xffff;
      if (this.timer === 0xffff) {
        this.timer = this.reload;
        this.sequence = funcManip(this.sequence);
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

  clock(t: Ref<{ target: Uint16Array[0] }>, channel: boolean): boolean {
    let changed = false;

    if (this.timer === 0 && this.enabled && this.shift > 0 && !this.mute) {
      if (t.target >= 8 && this.change < 0x07ff) {
        if (this.down) {
          t.target -= this.change - +channel;
        } else {
          t.target += this.change;
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
      this.mute = t.target < 8 || t.target > 0x7ff;
    }
    return changed;
  }
}
