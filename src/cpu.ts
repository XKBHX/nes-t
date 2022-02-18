import { Bus } from "./bus";

export class Cpu {
  private temp: Uint16Array[0] = 0x0000;
  public addressAbsolute: Uint16Array[0] = 0x0000;
  public addressRelative: Uint16Array[0] = 0x00;
  private opcode: Uint8Array[0] = 0x00;
  private cycles: Uint8Array[0] = 0;
  private clockCount: Uint32Array[0] = 0;
  private bus: Bus;
  private lookup: INSTRUCTION[];

  public fetched: Uint8Array[0] = 0x00;
  public a: Uint8Array[0] = 0x00;
  public x: Uint8Array[0] = 0x00;
  public y: Uint8Array[0] = 0x00;
  public stkp: Uint8Array[0] = 0x00;
  public pc: Uint16Array[0] = 0x0000;
  public status: Uint8Array[0] = 0x00;

  constructor() {}

  private getFlag(flag: CPU_FLAG): Uint8Array[0] {
    return (this.status & flag) > 0 ? 1 : 0;
  }

  private setFlag(flag: CPU_FLAG, v: boolean): void {
    if (v) this.status |= flag;
    else this.status &= ~flag;
  }

  public read(address: Uint16Array[0]): Uint8Array[0] {
    return this.bus.cpuRead(address, false);
  }

  private write(address: Uint16Array[0], data: Uint8Array[0]): void {
    this.bus.cpuWrite(address, data);
  }

  private fetch(): Uint8Array[0] {
    if (!(lookup[this.opcode].addressMode === IMP))
        this.fetched = this.read(this.addressAbsolute);
    return this.fetched;
  }

  


  reset(): void {
    this.addressAbsolute = 0xfffc;

    const lo: Uint16Array[0] = this.read(this.addressAbsolute + 0);
    const hi: Uint16Array[0] = this.read(this.addressAbsolute + 1);

    this.pc = (hi << 8) | lo;
    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.stkp = 0xfd;
    this.status = 0x00 | CPU_FLAG.U;
    this.addressRelative = 0x0000;
    this.addressAbsolute = 0x0000;
    this.fetched = 0x00;
    this.cycles = 8;
  }

  irq(): void {
    if (this.getFlag(CPU_FLAG.I) === 0) {
      this.write(0x0100 + this.stkp, (this.pc >> 8) & 0x00ff);
      this.stkp--;
      this.write(0x0100 + this.stkp, this.pc & 0x00ff);
      this.stkp--;

      this.setFlag(CPU_FLAG.B, false);
      this.setFlag(CPU_FLAG.U, true);
      this.setFlag(CPU_FLAG.I, true);
      this.write(0x0100 + this.stkp, this.status);
      this.stkp--;
      this.addressAbsolute = 0xfffe;

      const lo: Uint16Array[0] = this.read(this.addressAbsolute + 0);
      const hi: Uint16Array[0] = this.read(this.addressAbsolute + 1);

      this.pc = (hi << 8) | lo;

      this.cycles = 7;
    }
  }

  nmi(): void {}

  clock(): void {
    if (this.cycles == 0) {
      this.opcode = this.read(this.pc);
      this.setFlag(CPU_FLAG.U, true);
      this.pc++;
      this.cycles = lookup[this.opcode].cycles;

      const additionalCycle1: Uint8Array[0] = lookup[this.opcode].addressMode();
      const additionalCycle2: Uint8Array[0] = lookup[this.opcode].operate();

      this.cycles += additionalCycle1 & additionalCycle2;
      this.setFlag(CPU_FLAG.U, true);
    }

    this.clockCount++;
    this.cycles--;
  }

  complete(): boolean {}
  connectBus(bus: Bus): void {
    this.bus = bus;
  }
  disassemble(start: Uint16Array[0], stop: Uint16Array[0]): InstructionMap {}
}

export enum CPU_FLAG {
  C = 1 << 0, // Carry Bit
  Z = 1 << 1, // Zero
  I = 1 << 2, // Disable Interrupts
  D = 1 << 3, // Decimal Mode (unused in this implementation)
  B = 1 << 4, // Break
  U = 1 << 5, // Unused
  V = 1 << 6, // Overflow
  N = 1 << 7, // Negative
}

interface INSTRUCTION {
  name: string;
  operate: () => Uint8Array[0];
  addressMode: () => Uint8Array[0];
  cycles: Uint8Array[0];
}

export type InstructionMap = {
  [key: Uint16Array[0]]: string;
};

// Address Modes
const IMP = (c: Cpu): Uint8Array[0] => { c.fetched = c.a; return 0; }
const IMM = (c: Cpu): Uint8Array[0] => { c.addressAbsolute = c.pc++; return 0; }
const ZP0 = (c: Cpu): Uint8Array[0] => { c.addressAbsolute = c.read(c.pc); c.pc++; c.addressAbsolute &= 0x00FF; return 0; }
const ZPX = (c: Cpu): Uint8Array[0] => { c.addressAbsolute = c.read(c.pc) + c.x; c.pc++; c.addressAbsolute &= 0x00FF; return 0; }
const ZPY = (c: Cpu): Uint8Array[0] => { c.addressAbsolute = c.read(c.pc) + c.y; c.pc++; c.addressAbsolute &= 0x00FF; return 0; }

const REL = (c: Cpu): Uint8Array[0] => {
    c.addressRelative = c.read(c.pc);
    c.pc++;
    if(c.addressRelative & 0x80)  c.addressRelative |= 0xFF00
    return 0;
}

const ABS = (c: Cpu): Uint8Array[0] => {
    const lo = c.read(c.pc);
    c.pc++;
    const hi = c.read(c.pc)
    c.pc++;
    c.addressAbsolute = (hi << 8) | lo;
    return 0;
}

const ABX = (c: Cpu): Uint8Array[0] => {
    const lo = c.read(c.pc);
	c.pc++;
	const hi = c.read(c.pc);
	c.pc++;

	c.addressAbsolute = (hi << 8) | lo;
	c.addressAbsolute += c.x;

	if ((c.addressAbsolute & 0xFF00) !== (hi << 8))
		return 1;
	else
		return 0;
}

const ABY = (c: Cpu): Uint8Array[0] => {
    const lo = c.read(c.pc);
	c.pc++;
	const hi = c.read(c.pc);
	c.pc++;

	c.addressAbsolute = (hi << 8) | lo;
	c.addressAbsolute += c.y;

	if ((c.addressAbsolute & 0xFF00) !== (hi << 8))
		return 1;
	else
		return 0;
}

const IND = (c: Cpu): Uint8Array[0] => {
    const ptr_lo = c.read(c.pc);
	c.pc++;
	const ptr_hi = c.read(c.pc);
	c.pc++;

	const ptr = (ptr_hi << 8) | ptr_lo;

	if (ptr_lo == 0x00FF) {
		c.addressAbsolute = (c.read(ptr & 0xFF00) << 8) | c.read(ptr + 0);
	}
	else {
		c.addressAbsolute = (c.read(ptr + 1) << 8) | c.read(ptr + 0);
	}
	
	return 0;
}

const IZX = (c: Cpu): Uint8Array[0] => {
    const t = c.read(c.pc);
	c.pc++;

	const lo = c.read((t + c.x) & 0x00FF);
	const hi = c.read((t + c.x + 1) & 0x00FF);

	c.addressAbsolute = (hi << 8) | lo;
	
	return 0;
}

const IZY = (c: Cpu): Uint8Array[0] => {
    const t = c.read(c.pc);
	c.pc++;

	const lo = c.read(t & 0x00FF);
	const hi = c.read((t + 1) & 0x00FF);

	c.addressAbsolute = (hi << 8) | lo;
	c.addressAbsolute += c.y;
	
	if ((c.addressAbsolute & 0xFF00) != (hi << 8))
		return 1;
	else
		return 0;
}

// Opcodes (private)
const ADC = (): Uint8Array[0] {}
const AND = (): Uint8Array[0] {}
const ASL = (): Uint8Array[0] {}
const BCC = (): Uint8Array[0] {}
const BCS = (): Uint8Array[0] {}
const BEQ = (): Uint8Array[0] {}
const BIT = (): Uint8Array[0] {}
const BMI = (): Uint8Array[0] {}
const BNE = (): Uint8Array[0] {}
const BPL = (): Uint8Array[0] {}
const BRK = (): Uint8Array[0] {}
const BVC = (): Uint8Array[0] {}
const BVS = (): Uint8Array[0] {}
const CLC = (): Uint8Array[0] {}
const CLD = (): Uint8Array[0] {}
const CLI = (): Uint8Array[0] {}
const CLV = (): Uint8Array[0] {}
const CMP = (): Uint8Array[0] {}
const CPX = (): Uint8Array[0] {}
const CPY = (): Uint8Array[0] {}
const DEC = (): Uint8Array[0] {}
const DEX = (): Uint8Array[0] {}
const DEY = (): Uint8Array[0] {}
const EOR = (): Uint8Array[0] {}
const INC = (): Uint8Array[0] {}
const INX = (): Uint8Array[0] {}
const INY = (): Uint8Array[0] {}
const JMP = (): Uint8Array[0] {}
const JSR = (): Uint8Array[0] {}
const LDA = (): Uint8Array[0] {}
const LDX = (): Uint8Array[0] {}
const LDY = (): Uint8Array[0] {}
const LSR = (): Uint8Array[0] {}
const NOP = (): Uint8Array[0] {}
const ORA = (): Uint8Array[0] {}
const PHA = (): Uint8Array[0] {}
const PHP = (): Uint8Array[0] {}
const PLA = (): Uint8Array[0] {}
const PLP = (): Uint8Array[0] {}
const ROL = (): Uint8Array[0] {}
const ROR = (): Uint8Array[0] {}
const RTI = (): Uint8Array[0] {}
const RTS = (): Uint8Array[0] {}
const SBC = (): Uint8Array[0] {}
const SEC = (): Uint8Array[0] {}
const SED = (): Uint8Array[0] {}
const SEI = (): Uint8Array[0] {}
const STA = (): Uint8Array[0] {}
const STX = (): Uint8Array[0] {}
const STY = (): Uint8Array[0] {}
const TAX = (): Uint8Array[0] {}
const TAY = (): Uint8Array[0] {}
const TSX = (): Uint8Array[0] {}
const TXA = (): Uint8Array[0] {}
const TXS = (): Uint8Array[0] {}
const TYA = (): Uint8Array[0] {}
const XXX = (): Uint8Array[0] {}

const lookup: INSTRUCTION[] = [];
