const WORKLET_NAME = 'nes-apu-output';
const RING_SIZE = 32768;
const LATENCY_SAMPLES = 4096;

const WORKLET_SOURCE = `
class NesApuOutputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = ${RING_SIZE};
    this.buffer = new Float32Array(this.size);
    this.read = 0;
    this.write = ${LATENCY_SAMPLES};
    this.last = 0;
    this.port.onmessage = (e) => {
      const samples = e.data;
      for (let i = 0; i < samples.length; i++) {
        const next = (this.write + 1) & (this.size - 1);
        if (next === this.read) break;
        this.buffer[this.write] = samples[i];
        this.write = next;
      }
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    for (let i = 0; i < out.length; i++) {
      if (this.read === this.write) {
        out[i] = this.last;
      } else {
        this.last = this.buffer[this.read];
        out[i] = this.last;
        this.read = (this.read + 1) & (this.size - 1);
      }
    }
    return true;
  }
}
registerProcessor('${WORKLET_NAME}', NesApuOutputProcessor);
`;

export class NesAudioOutput {
  private context: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private gain: GainNode | null = null;
  private pending = new Float32Array(256);
  private pendingCount = 0;
  private ring: Float32Array | null = null;
  private ringSize = 0;
  private read = 0;
  private write = 0;
  private lastSample = 0;
  private requestedRate: number;
  private unlocked = false;

  constructor(sampleRate = 44100) {
    this.requestedRate = sampleRate;
  }

  get sampleRate(): number {
    return this.context ? this.context.sampleRate : this.requestedRate;
  }

  get isUnlocked(): boolean {
    return this.unlocked && !!this.context && this.context.state === 'running';
  }

  async unlock(): Promise<boolean> {
    if (typeof AudioContext === 'undefined') return false;

    if (!this.context) {
      this.context = new AudioContext({
        sampleRate: this.requestedRate,
        latencyHint: 'interactive',
      });
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    if (!this.worklet && !this.processor) {
      await this.connectOutput();
    }

    this.unlocked = this.context.state === 'running';
    return this.unlocked;
  }

  push(sample: number): void {
    if (!this.unlocked) return;

    if (this.worklet) {
      this.pending[this.pendingCount++] = sample;
      if (this.pendingCount >= this.pending.length) this.flush();
      return;
    }

    if (!this.ring) return;
    const next = (this.write + 1) % this.ringSize;
    if (next === this.read) return;
    this.ring[this.write] = sample;
    this.write = next;
  }

  flush(): void {
    if (!this.worklet || this.pendingCount === 0) return;
    this.worklet.port.postMessage(this.pending.slice(0, this.pendingCount));
    this.pendingCount = 0;
  }

  private async connectOutput(): Promise<void> {
    if (!this.context) return;

    this.gain = this.context.createGain();
    this.gain.gain.value = 1.0;
    this.gain.connect(this.context.destination);

    try {
      const blob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await this.context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      this.worklet = new AudioWorkletNode(this.context, WORKLET_NAME, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      this.worklet.connect(this.gain);
    } catch {
      this.connectScriptProcessor();
    }
  }

  private connectScriptProcessor(): void {
    if (!this.context || !this.gain) return;

    this.ringSize = RING_SIZE;
    this.ring = new Float32Array(this.ringSize);
    this.read = 0;
    this.write = LATENCY_SAMPLES;
    this.lastSample = 0;

    const bufferSize = 2048;
    this.processor = this.context.createScriptProcessor(bufferSize, 0, 1);
    this.processor.onaudioprocess = (event) => {
      const output = event.outputBuffer.getChannelData(0);
      for (let i = 0; i < output.length; i++) {
        if (!this.ring || this.read === this.write) {
          output[i] = this.lastSample;
        } else {
          this.lastSample = this.ring[this.read];
          output[i] = this.lastSample;
          this.read = (this.read + 1) % this.ringSize;
        }
      }
    };
    this.processor.connect(this.gain);
  }
}
