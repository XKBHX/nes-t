import { Bus } from './bus';

export class Cpu {
  public temp: Uint16Array[0] = 0x0000;
  public addressAbsolute: Uint16Array[0] = 0x0000;
  public addressRelative: Uint16Array[0] = 0x00;
  public opcode: Uint8Array[0] = 0x00;
  public cycles: Uint8Array[0] = 0;
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

  public getFlag(flag: CPU_FLAG): Uint8Array[0] {
    return (this.status & flag) > 0 ? 1 : 0;
  }

  public setFlag(flag: CPU_FLAG, v: boolean): void {
    if (v) this.status |= flag;
    else this.status &= ~flag;
  }

  public read(address: Uint16Array[0]): Uint8Array[0] {
    return this.bus.cpuRead(address, false);
  }

  public write(address: Uint16Array[0], data: Uint8Array[0]): void {
    this.bus.cpuWrite(address, data);
  }

  public fetch(): Uint8Array[0] {
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
    if (this.cycles === 0) {
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

  complete(): boolean {
      return this.cycles === 0;
  }

  connectBus(bus: Bus): void {
    this.bus = bus;
  }

  disassemble(start: Uint16Array[0], stop: Uint16Array[0]): InstructionMap {
    let addr: number = start;
	let value = 0x00, lo = 0x00, hi = 0x00;
	const mapLines: Record<Uint16Array[0], string> = {};
	let lineAddr: Uint16Array[0] = 0;

	const hex = (n: Uint32Array[0], d: Uint8Array[0]): string => {
		const s: string[] = [];
		for (let i: number = d - 1; i >= 0; i--, n >>= 4)
			s[i] = '0123456789ABCDEF'[n & 0xF];
		return s.join('');
	};

	while (addr <= stop) {
		lineAddr = addr;

		let inst = `$${hex(addr, 4)}: `;

		const opcode = this.bus.cpuRead(addr, true); 
        addr++;
		inst += `${lookup[opcode].name} `;

		const addrmode = lookup[opcode].addressMode;
        if (addrmode === IMP) {
			inst += ' {IMP}';
		} else if (addrmode === IMM) {
			value = this.bus.cpuRead(addr, true);
            addr++;
			inst += '#$' + hex(value, 2) + ' {IMM}';
		} else if (addrmode === ZP0) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = 0x00;												
			inst += '$' + hex(lo, 2) + ' {ZP0}';
		} else if (addrmode === ZPX) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = 0x00;														
			inst += '$' + hex(lo, 2) + ', X {ZPX}';
		} else if (addrmode === ZPY) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = 0x00;														
			inst += '$' + hex(lo, 2) + ', Y {ZPY}';
		} else if (addrmode === IZX) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = 0x00;								
			inst += '($' + hex(lo, 2) + ', X) {IZX}';
		} else if (addrmode === IZY) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = 0x00;								
			inst += '($' + hex(lo, 2) + '), Y {IZY}';
		} else if (addrmode === ABS) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = this.bus.cpuRead(addr, true);
            addr++;
			inst += '$' + hex((hi << 8) | lo, 4) + ' {ABS}';
		} else if (addrmode === ABX) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = this.bus.cpuRead(addr, true);
            addr++;
			inst += '$' + hex((hi << 8) | lo, 4) + ', X {ABX}';
		} else if (addrmode === ABY) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = this.bus.cpuRead(addr, true);
            addr++;
			inst += '$' + hex((hi << 8) | lo, 4) + ', Y {ABY}';
		} else if (addrmode === IND) {
			lo = this.bus.cpuRead(addr, true);
            addr++;
			hi = this.bus.cpuRead(addr, true);
            addr++;
			inst += '($' + hex((hi << 8) | lo, 4) + ') {IND}';
		} else if (addrmode === REL) {
			value = this.bus.cpuRead(addr, true);
            addr++;
			inst += '$' + hex(value, 2) + ' [$' + hex(addr + value, 4) + '] {REL}';
		}

		mapLines[lineAddr] = inst;
	}

	return mapLines;
  }
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

// Oc.pcodes (private)
const ADC = (c: Cpu): Uint8Array[0] => {
    c.fetch();
    c.temp = c.a + c.fetched + c.getFlag(CPU_FLAG.C);
    c.setFlag(CPU_FLAG.C, c.temp > 255);
    c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0);
    c.setFlag(CPU_FLAG.V, !!((~(c.a ^ c.fetched) & (c.a ^ c.temp)) & 0x0080));
    c.setFlag(CPU_FLAG.N, !!(c.temp & 0x80));
    c.a = c.temp & 0x00FF;

    return 1;
};
const AND = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.a = c.a & c.fetched;
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, !!(c.a & 0x80));

	return 1;
};
const ASL = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.fetched << 1;
	c.setFlag(CPU_FLAG.C, (c.temp & 0xFF00) > 0);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x00);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x80) !== 0x00);
	if (lookup[c.opcode].addressMode === IMP)
		c.a = c.temp & 0x00FF;
	else
		c.write(c.addressAbsolute, c.temp & 0x00FF);

    return 0;
};
const BCC = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.C) === 0) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;
		
		if((c.addressAbsolute & 0xFF00) !== (c.pc & 0xFF00))
			c.cycles++;
		
		c.pc = c.addressAbsolute;
	}

    return 0;
};
const BCS = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.C) == 1) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}

    return 0;
};
const BEQ = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.Z) == 1) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}

    return 0;
};
const BIT = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.a & c.fetched;
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x00);
	c.setFlag(CPU_FLAG.N, (c.fetched & (1 << 7)) !== 0x00);
	c.setFlag(CPU_FLAG.V, (c.fetched & (1 << 6)) !== 0x00);
	
    return 0;
};
const BMI = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.N) === 1) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}

    return 0;
};
const BNE = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.Z) == 0) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}
	
    return 0;
};
const BPL = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.N) == 0)
	{
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}
	
    return 0;
};
const BRK = (c: Cpu): Uint8Array[0] => {
    c.pc++;
	
	c.setFlag(CPU_FLAG.I, true);
	c.write(0x0100 + c.stkp, (c.pc >> 8) & 0x00FF);
	c.stkp--;
	c.write(0x0100 + c.stkp, c.pc & 0x00FF);
	c.stkp--;

	c.setFlag(CPU_FLAG.B, true);
	c.write(0x0100 + c.stkp, c.status);
	c.stkp--;
	c.setFlag(CPU_FLAG.B, false);

	c.pc = c.read(0xFFFE) | (c.read(0xFFFF) << 8);
	
    return 0;
};
const BVC = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.V) === 0) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}
	
    return 0;
};
const BVS = (c: Cpu): Uint8Array[0] => {
    if (c.getFlag(CPU_FLAG.V) === 1) {
		c.cycles++;
		c.addressAbsolute = c.pc + c.addressRelative;

		if ((c.addressAbsolute & 0xFF00) != (c.pc & 0xFF00))
			c.cycles++;

		c.pc = c.addressAbsolute;
	}
	
    return 0;
};
const CLC = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.C, false);
    
	return 0;
};
const CLD = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.D, false);
    
	return 0;
};
const CLI = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.I, false);
    
	return 0;
};
const CLV = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.V, false);
    
	return 0;
};
const CMP = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.a - c.fetched;
	c.setFlag(CPU_FLAG.C, c.a >= c.fetched);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);

	return 1;
};
const CPX = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.x - c.fetched;
	c.setFlag(CPU_FLAG.C, c.x >= c.fetched);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);
	
    return 0;
};
const CPY = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.y - c.fetched;
	c.setFlag(CPU_FLAG.C, c.y >= c.fetched);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);
	
    return 0;
};
const DEC = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.fetched - 1;
	c.write(c.addressAbsolute, c.temp & 0x00FF);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);
	
    return 0;
};
const DEX = (c: Cpu): Uint8Array[0] => {
    c.x--;
	c.setFlag(CPU_FLAG.Z, c.x === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x & 0x80) !== 0x00);
	
    return 0;
};
const DEY = (c: Cpu): Uint8Array[0] => {
    c.y--;
	c.setFlag(CPU_FLAG.Z, c.y === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y & 0x80) !== 0x00);
	
    return 0;
};
const EOR = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.a = c.a ^ c.fetched;	
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a & 0x80) !== 0x00);

	return 1;
};
const INC = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = c.fetched + 1;
	c.write(c.addressAbsolute, c.temp & 0x00FF);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);
	
    return 0;
};
const INX = (c: Cpu): Uint8Array[0] => {
    c.x++;
	c.setFlag(CPU_FLAG.Z, c.x === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x & 0x80) !== 0x00);
	
    return 0;
};
const INY = (c: Cpu): Uint8Array[0] => {
    c.y++;
	c.setFlag(CPU_FLAG.Z, c.y === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y & 0x80) !== 0x00);
	
    return 0;
};
const JMP = (c: Cpu): Uint8Array[0] => {
    c.pc = c.addressAbsolute;
	
    return 0;
};
const JSR = (c: Cpu): Uint8Array[0] => {
    c.pc--;

	c.write(0x0100 + c.stkp, (c.pc >> 8) & 0x00FF);
	c.stkp--;
	c.write(0x0100 + c.stkp, c.pc & 0x00FF);
	c.stkp--;

	c.pc = c.addressAbsolute;
	
    return 0;
};
const LDA = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.a = c.fetched;
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a & 0x80) === 0x00);
	
    return 1;
};
const LDX = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.x = c.fetched;
	c.setFlag(CPU_FLAG.Z, c.x === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x & 0x80) === 0x00);
	return 1;
};
const LDY = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.y = c.fetched;
	c.setFlag(CPU_FLAG.Z, c.y === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y & 0x80) !== 0x00);
	return 1;
};
const LSR = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.setFlag(CPU_FLAG.C, (c.fetched & 0x0001) !== 0x0000);
	c.temp = c.fetched >> 1;	
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);
	if (lookup[c.opcode].addressMode === IMP)
		c.a = c.temp & 0x00FF;
	else
		c.write(c.addressAbsolute, c.temp & 0x00FF);
	
    return 0;
};
const NOP = (c: Cpu): Uint8Array[0] => {
    switch (c.opcode) {
        case 0x1C:
        case 0x3C:
        case 0x5C:
        case 0x7C:
        case 0xDC:
        case 0xFC:
            return 1;
            break;
    }
    
    return 0;
};
const ORA = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.a = c.a | c.fetched;
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a & 0x80) !== 0x00);
	return 1;
};
const PHA = (c: Cpu): Uint8Array[0] => {
    c.write(0x0100 + c.stkp, c.a);
	c.stkp--;

	return 0;
};
const PHP = (c: Cpu): Uint8Array[0] => {
    c.write(0x0100 + c.stkp, c.status | CPU_FLAG.B | CPU_FLAG.U);
	c.setFlag(CPU_FLAG.B, false);
	c.setFlag(CPU_FLAG.U, false);
	c.stkp--;
	
    return 0;
};
const PLA = (c: Cpu): Uint8Array[0] => {
    c.stkp++;
	c.a = c.read(0x0100 + c.stkp);
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a & 0x80) !== 0x00);
	
    return 0;
};
const PLP = (c: Cpu): Uint8Array[0] => {
    c.stkp++;
	c.status = c.read(0x0100 + c.stkp);
	c.setFlag(CPU_FLAG.U, true);
	
    return 0;
};
const ROL = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = <Uint16Array[0]>(c.fetched << 1) | c.getFlag(CPU_FLAG.C);
	c.setFlag(CPU_FLAG.C, (c.temp & 0xFF00) !== 0x0000);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x0000);
	if (lookup[c.opcode].addressMode === IMP)
		c.a = c.temp & 0x00FF;
	else
		c.write(c.addressAbsolute, c.temp & 0x00FF);
	
        return 0;
};
const ROR = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	c.temp = <Uint16Array[0]>(c.getFlag(CPU_FLAG.C) << 7) | (c.fetched >> 1);
	c.setFlag(CPU_FLAG.C, (c.fetched & 0x01) !== 0x00);
	c.setFlag(CPU_FLAG.Z, (c.temp & 0x00FF) === 0x00);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0x00);
	if (lookup[c.opcode].addressMode === IMP)
		c.a = c.temp & 0x00FF;
	else
		c.write(c.addressAbsolute, c.temp & 0x00FF);
	
        return 0;
};
const RTI = (c: Cpu): Uint8Array[0] => {
    c.stkp++;
	c.status = c.read(0x0100 + c.stkp);
	c.status &= ~CPU_FLAG.B;
	c.status &= ~CPU_FLAG.U;

	c.stkp++;
	c.pc = <Uint16Array[0]>c.read(0x0100 + c.stkp);
	c.stkp++;
	c.pc |= <Uint16Array[0]>c.read(0x0100 + c.stkp) << 8;
	
    return 0;
};
const RTS = (c: Cpu): Uint8Array[0] => {
    c.stkp++;
	c.pc = <Uint16Array[0]>c.read(0x0100 + c.stkp);
	c.stkp++;
	c.pc |= <Uint16Array[0]>c.read(0x0100 + c.stkp) << 8;
	
	c.pc++;
	
    return 0;
};
const SBC = (c: Cpu): Uint8Array[0] => {
    c.fetch();
	
	const value = (<Uint16Array[0]>c.fetched) ^ 0x00FF;
	
	c.temp = <Uint16Array[0]>c.a + value + <Uint16Array[0]>c.getFlag(CPU_FLAG.C);
	c.setFlag(CPU_FLAG.C, (c.temp & 0xFF00) !== 0);
	c.setFlag(CPU_FLAG.Z, ((c.temp & 0x00FF) === 0));
	c.setFlag(CPU_FLAG.V, ((c.temp ^ <Uint16Array[0]>c.a) & (c.temp ^ value) & 0x0080) !== 0);
	c.setFlag(CPU_FLAG.N, (c.temp & 0x0080) !== 0);
	c.a = c.temp & 0x00FF;
	
	return 1;
};
const SEC = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.C, true);
	
    return 0;
};
const SED = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.D, true);
	
    return 0;
};
const SEI = (c: Cpu): Uint8Array[0] => {
    c.setFlag(CPU_FLAG.I, true);
	
    return 0;
};
const STA = (c: Cpu): Uint8Array[0] => {
    c.write(c.addressAbsolute, c.a);
	
    return 0;
};
const STX = (c: Cpu): Uint8Array[0] => {
    c.write(c.addressAbsolute, c.x);
	
    return 0;
};
const STY = (c: Cpu): Uint8Array[0] => {
    c.write(c.addressAbsolute, c.y);
	
    return 0;
};
const TAX = (c: Cpu): Uint8Array[0] => {
    c.x = c.a;
	c.setFlag(CPU_FLAG.Z, c.x === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x & 0x80) !== 0x00);
	
    return 0;
};
const TAY = (c: Cpu): Uint8Array[0] => {
    c.y = c.a;
	c.setFlag(CPU_FLAG.Z, c.y === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y & 0x80) !== 0x00);
	
    return 0;
};
const TSX = (c: Cpu): Uint8Array[0] => {
    c.x = c.stkp;
	c.setFlag(CPU_FLAG.Z, c.x === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x & 0x80) !== 0x00);
	
    return 0;
};
const TXA = (c: Cpu): Uint8Array[0] => {
    c.a = c.x;
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a & 0x80) !== 0x00);
	
    return 0;
};
const TXS = (c: Cpu): Uint8Array[0] => {
    c.stkp = c.x;
	
    return 0;
};
const TYA = (c: Cpu): Uint8Array[0] => {
    c.a = c.y;
	c.setFlag(CPU_FLAG.Z, c.a === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a & 0x80) !== 0x00);
	
    return 0;
};
const XXX = (c: Cpu): Uint8Array[0] => {
    return 0;
};

const lookup: INSTRUCTION[] = [];
