import { Bus } from './bus';
//import lookup from './lookup';

let ops: string[] = [];
let codes: number[] = [];
let combos: Record<string, any>[] = [];

export class Cpu {
  public temp: Uint16Array = new Uint16Array(1);
  public addressAbsolute = new Uint16Array(1);
  public addressRelative = new Uint16Array(1);
  public opcode: Uint8Array = new Uint8Array(1);
  public cycles: Uint8Array = new Uint8Array(1);
  private clockCount: Uint32Array = new Uint32Array(1);
  private bus: Bus = <Bus><unknown>undefined;
  private lookup: INSTRUCTION[];

  public fetched: Uint8Array = new Uint8Array(1);
  public a: Uint8Array = new Uint8Array(1);
  public x: Uint8Array = new Uint8Array(1);
  public y: Uint8Array = new Uint8Array(1);
  public stkp: Uint8Array = new Uint8Array(1);
  public pc: Uint16Array = new Uint16Array(1);
  public status: Uint8Array = new Uint8Array(1);

  private currentTime: number = <number><unknown>undefined;

  constructor() {
	  this.lookup = lookup;
	  console.log('Cycle Count', this.cycles[0]);
  }
  
  public getFlag(flag: CPU_FLAG): Uint8Array[0] {
    return (this.status[0] & flag) > 0 ? 1 : 0;
  }

  public setFlag(flag: CPU_FLAG, v: boolean): void {
    if (v) this.status[0] |= flag;
    else this.status[0] &= ~flag;
  }

  public read(address: Uint16Array[0]): Uint8Array[0] {
    return this.bus.cpuRead(address, false);
  }

  public write(address: Uint16Array[0], data: Uint8Array[0]): void {
    this.bus.cpuWrite(address, data);
  }

  public fetch(): Uint8Array[0] {
    //console.log('FETCHED', this.opcode[0], lookup[this.opcode[0]]);
	if (!(lookup[this.opcode[0]].addressMode === IMP))
        this.fetched[0] = this.read(this.addressAbsolute[0]);
    return this.fetched[0];
  }

  


  reset(): void {
    this.addressAbsolute[0] = 0xfffc;

    const lo: Uint16Array[0] = this.read(this.addressAbsolute[0] + 0);
    const hi: Uint16Array[0] = this.read(this.addressAbsolute[0] + 1);
	console.log('HI/LO', hi, lo);

    this.pc[0] = (hi << 8) | lo;
    this.a[0] = 0x00;
    this.x[0] = 0x00;
    this.y[0] = 0x00;
    this.stkp[0] = 0xfd;
    this.status[0] = 0x00 | CPU_FLAG.U; console.log('Status:', this.status[0]);
    this.addressRelative[0] = 0x0000;
    this.addressAbsolute[0] = 0x0000;
    this.fetched[0] = 0x00;
    this.cycles[0] = 8;
  }

  irq(): void {
    if (this.getFlag(CPU_FLAG.I) === 0) {
      this.write(0x0100 + this.stkp[0], (this.pc[0] >> 8) & 0x00ff);
      this.stkp[0]--;
      this.write(0x0100 + this.stkp[0], this.pc[0] & 0x00ff);
      this.stkp[0]--;

      this.setFlag(CPU_FLAG.B, false);
      this.setFlag(CPU_FLAG.U, true);
      this.setFlag(CPU_FLAG.I, true);
      this.write(0x0100 + this.stkp[0], this.status[0]);
      this.stkp[0]--;
      this.addressAbsolute[0] = 0xfffe;

      const lo: Uint16Array[0] = this.read(this.addressAbsolute[0] + 0);
      const hi: Uint16Array[0] = this.read(this.addressAbsolute[0] + 1);

      this.pc[0] = (hi << 8) | lo;

      this.cycles[0] = 7;
    }
  }

  nmi(): void {
    this.write(0x0100 + this.stkp[0], (this.pc[0] >> 8) & 0x00ff);
    this.stkp[0]--;
    this.write(0x0100 + this.stkp[0], this.pc[0] & 0x00ff);
    this.stkp[0]--;

    this.setFlag(CPU_FLAG.B, false);
    this.setFlag(CPU_FLAG.U, true);
    this.setFlag(CPU_FLAG.I, true);
    this.write(0x0100 + this.stkp[0], this.status[0]);
    this.stkp[0]--;
    this.addressAbsolute[0] = 0xfffa;

    const lo: Uint16Array[0] = this.read(this.addressAbsolute[0] + 0);
    const hi: Uint16Array[0] = this.read(this.addressAbsolute[0] + 1);

    this.pc[0] = (hi << 8) | lo;

    this.cycles[0] = 8;
  }

  clock(): void {
	if (this.currentTime === undefined) this.currentTime = Date.now();
    
	if (this.cycles[0] === 0) {
      this.opcode[0] = this.read(this.pc[0]);
      this.setFlag(CPU_FLAG.U, true);
      this.pc[0]++;
      this.cycles[0] = lookup[this.opcode[0]].cycles[0];

      //if(!ops.includes(lookup[this.opcode[0]].name)) { ops.push(lookup[this.opcode[0]].name); console.log('OPCODE', ops); }
      //const combo = { code: this.opcode[0], name: lookup[this.opcode[0]].name, mode: lookup[this.opcode[0]].addressMode };
	  //if(!combos.some(c => c.code === combo.code)) { combos.push(combo); console.log('CODE', combos); }
	  
	  const additionalCycle1: Uint8Array[0] = lookup[this.opcode[0]].addressMode(this)[0];
      const additionalCycle2: Uint8Array[0] = lookup[this.opcode[0]].operate(this)[0];

	  //console.log('Additional cycles 1&2', additionalCycle1, additionalCycle2);

      this.cycles[0] += (additionalCycle1 & additionalCycle2);
      this.setFlag(CPU_FLAG.U, true);
    }

    this.clockCount[0]++;
    this.cycles[0]--;

	//this.renderDebugger();
	this.currentTime = Date.now();
  }

  complete(): boolean {
      return this.cycles[0] === 0;
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

		let opcode = this.bus.cpuRead(addr, true); 
        //console.log({ opcode, addr })
		addr++;
		//console.log('Code/Address', opcode, addr);
		try { inst += `${lookup[opcode].name} `; } catch (e) { console.log({inst, opcode}); }

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
  C = 0x01 << 0, // Carry Bit
  Z = 0x01 << 1, // Zero
  I = 0x01 << 2, // Disable Interrupts
  D = 0x01 << 3, // Decimal Mode (unused in this implementation)
  B = 0x01 << 4, // Break
  U = 0x01 << 5, // Unused
  V = 0x01 << 6, // Overflow
  N = 0x01 << 7, // Negative
}

export type OPERATION = (c: Cpu) => Uint8Array;
export type ADDRESS_MODE = (c: Cpu) => Uint8Array;

export interface INSTRUCTION {
  name: string;
  operate: OPERATION
  addressMode: ADDRESS_MODE
  cycles: Uint8Array;
}

export type InstructionMap = {
  [key: Uint16Array[0]]: string;
};

// Address Modes
export const IMP: ADDRESS_MODE = (c) => { c.fetched[0] = c.a[0]; return new Uint8Array(1); }
export const IMM: ADDRESS_MODE = (c) => { c.addressAbsolute[0] = c.pc[0]++; return new Uint8Array(1); }
export const ZP0: ADDRESS_MODE = (c) => { c.addressAbsolute[0] = c.read(c.pc[0]); c.pc[0]++; c.addressAbsolute[0] &= 0x00FF; return new Uint8Array(1); }
export const ZPX: ADDRESS_MODE = (c) => { c.addressAbsolute[0] = c.read(c.pc[0]) + c.x[0]; c.pc[0]++; c.addressAbsolute[0] &= 0x00FF; return new Uint8Array(1); }
export const ZPY: ADDRESS_MODE = (c) => { c.addressAbsolute[0] = c.read(c.pc[0]) + c.y[0]; c.pc[0]++; c.addressAbsolute[0] &= 0x00FF; return new Uint8Array(1); }

export const REL: OPERATION = (c) => {
    c.addressRelative[0] = c.read(c.pc[0]);
    c.pc[0]++;
    if(c.addressRelative[0] & 0x80)  c.addressRelative[0] |= 0xFF00
    return new Uint8Array(1);
}

export const ABS: OPERATION = (c) => {
    const lo = c.read(c.pc[0]);
    c.pc[0]++;
    const hi = c.read(c.pc[0])
    c.pc[0]++;
    c.addressAbsolute[0] = (hi << 8) | lo;
    return new Uint8Array(1);
}

export const ABX: OPERATION = (c) => {
    const lo = c.read(c.pc[0]);
	c.pc[0]++;
	const hi = c.read(c.pc[0]);
	c.pc[0]++;

	c.addressAbsolute[0] = (hi << 8) | lo;
	c.addressAbsolute[0] += c.x[0];

	const result = new Uint8Array(1);
	
	if ((c.addressAbsolute[0] & 0xFF00) !== (hi << 8))
		result[0] = 0x01;

	return result;
}

export const ABY: OPERATION = (c) => {
    const lo = c.read(c.pc[0]);
	c.pc[0]++;
	const hi = c.read(c.pc[0]);
	c.pc[0]++;

	c.addressAbsolute[0] = (hi << 8) | lo;
	c.addressAbsolute[0] += c.y[0];

	const result = new Uint8Array(1);
	
	if ((c.addressAbsolute[0] & 0xFF00) !== (hi << 8))
		result[0] = 0x01;

	return result;
}

export const IND: OPERATION = (c) => {
    const ptr_lo = c.read(c.pc[0]);
	c.pc[0]++;
	const ptr_hi = c.read(c.pc[0]);
	c.pc[0]++;

	const ptr = (ptr_hi << 8) | ptr_lo;

	if (ptr_lo == 0x00FF) {
		c.addressAbsolute[0] = (c.read(ptr & 0xFF00) << 8) | c.read(ptr + 0);
	}
	else {
		c.addressAbsolute[0] = (c.read(ptr + 1) << 8) | c.read(ptr + 0);
	}
	
	return  new Uint8Array(1);
}

export const IZX: OPERATION = (c) => {
    const t = c.read(c.pc[0]);
	c.pc[0]++;

	const lo = c.read((t + c.x[0]) & 0x00FF);
	const hi = c.read((t + c.x[0] + 1) & 0x00FF);

	c.addressAbsolute[0] = (hi << 8) | lo;
	
	return  new Uint8Array(1);
}

export const IZY: OPERATION = (c) => {
    const t = c.read(c.pc[0]);
	c.pc[0]++;

	const lo = c.read(t & 0x00FF);
	const hi = c.read((t + 1) & 0x00FF);

	c.addressAbsolute[0] = (hi << 8) | lo;
	c.addressAbsolute[0] += c.y[0];
	
	const result = new Uint8Array(1);
	
	if ((c.addressAbsolute[0] & 0xFF00) != (hi << 8))
		result[0] = 0x01;

	return result;
}

// Oc.pcodes (private)
export const ADC: OPERATION = (c) => {
    c.fetch();
    c.temp[0] = c.a[0] + c.fetched[0] + c.getFlag(CPU_FLAG.C);
    c.setFlag(CPU_FLAG.C, c.temp[0] > 255);
    c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0);
    c.setFlag(CPU_FLAG.V, !!((~(c.a[0] ^ c.fetched[0]) & (c.a[0] ^ c.temp[0])) & 0x0080));
    c.setFlag(CPU_FLAG.N, !!(c.temp[0] & 0x80));
    c.a[0] = c.temp[0] & 0xFF;

    const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const AND: OPERATION = (c) => {
    c.fetch();
	c.a[0] = c.a[0] & c.fetched[0];
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, !!(c.a[0] & 0x80));

	const result = new Uint8Array(1);
	result[0] = 0x01

	return result;
};
export const ASL: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.fetched[0] << 1;
	c.setFlag(CPU_FLAG.C, (c.temp[0] & 0xFF00) > 0);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x00);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x80) !== 0x00);
	if (lookup[c.opcode[0]].addressMode === IMP)
		c.a[0] = c.temp[0] & 0xFF;
	else
		c.write(c.addressAbsolute[0], c.temp[0] & 0x00FF);

    return  new Uint8Array(1);
};
export const BCC: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.C) === 0) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];
		
		if((c.addressAbsolute[0] & 0xFF00) !== (c.pc[0] & 0xFF00))
			c.cycles[0]++;
		
		c.pc[0] = c.addressAbsolute[0];
	}

    return  new Uint8Array(1);
};
export const BCS: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.C) == 1) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) != (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}

    return  new Uint8Array(1);
};
export const BEQ: OPERATION = (c) => {
    //console.log('Get Z Flage:', c.getFlag(CPU_FLAG.Z));
	if (c.getFlag(CPU_FLAG.Z) == 1) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) != (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}

    return  new Uint8Array(1);
};
export const BIT: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.a[0] & c.fetched[0];
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x00);
	c.setFlag(CPU_FLAG.N, (c.fetched[0] & (1 << 7)) !== 0x00);
	c.setFlag(CPU_FLAG.V, (c.fetched[0] & (1 << 6)) !== 0x00);
	
    return  new Uint8Array(1);
};
export const BMI: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.N) === 1) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) !== (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}

    return  new Uint8Array(1);
};
export const BNE: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.Z) == 0) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) != (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}
	
    return  new Uint8Array(1);
};
export const BPL: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.N) == 0)
	{
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) != (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}
	
    return  new Uint8Array(1);
};
export const BRK: OPERATION = (c) => {
    c.pc[0]++;
	
	c.setFlag(CPU_FLAG.I, true);
	c.write(0x0100 + c.stkp[0], (c.pc[0] >> 8) & 0x00FF);
	c.stkp[0]--;
	c.write(0x0100 + c.stkp[0], c.pc[0] & 0x00FF);
	c.stkp[0]--;

	c.setFlag(CPU_FLAG.B, true);
	c.write(0x0100 + c.stkp[0], c.status[0]);
	c.stkp[0]--;
	c.setFlag(CPU_FLAG.B, false);

	c.pc[0] = c.read(0xFFFE) | (c.read(0xFFFF) << 8);
	
    return  new Uint8Array(1);
};
export const BVC: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.V) === 0) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) != (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}
	
    return  new Uint8Array(1);
};
export const BVS: OPERATION = (c) => {
    if (c.getFlag(CPU_FLAG.V) === 1) {
		c.cycles[0]++;
		c.addressAbsolute[0] = c.pc[0] + c.addressRelative[0];

		if ((c.addressAbsolute[0] & 0xFF00) != (c.pc[0] & 0xFF00))
			c.cycles[0]++;

		c.pc[0] = c.addressAbsolute[0];
	}
	
    return  new Uint8Array(1);
};
export const CLC: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.C, false);
    
	return  new Uint8Array(1);
};
export const CLD: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.D, false);
    
	return  new Uint8Array(1);
};
export const CLI: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.I, false);
    
	return  new Uint8Array(1);
};
export const CLV: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.V, false);
    
	return  new Uint8Array(1);
};
export const CMP: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.a[0] - c.fetched[0];
	c.setFlag(CPU_FLAG.C, c.a[0] >= c.fetched[0]);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);

	const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const CPX: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.x[0] - c.fetched[0];
	c.setFlag(CPU_FLAG.C, c.x[0] >= c.fetched[0]);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);
	
    return  new Uint8Array(1);
};
export const CPY: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.y[0] - c.fetched[0];
	c.setFlag(CPU_FLAG.C, c.y[0] >= c.fetched[0]);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);
	
    return  new Uint8Array(1);
};
export const DEC: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.fetched[0] - 1;
	c.write(c.addressAbsolute[0], c.temp[0] & 0x00FF);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);
	
    return  new Uint8Array(1);
};
export const DEX: OPERATION = (c) => {
    c.x[0]--;
	c.setFlag(CPU_FLAG.Z, c.x[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x[0] & 0x80) !== 0x00);
	
    return  new Uint8Array(1);
};
export const DEY: OPERATION = (c) => {
    c.y[0]--;
	c.setFlag(CPU_FLAG.Z, c.y[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y[0] & 0x80) !== 0x00);
	
    return  new Uint8Array(1);
};
export const EOR: OPERATION = (c) => {
    c.fetch();
	c.a[0] = c.a[0] ^ c.fetched[0];	
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a[0] & 0x80) !== 0x00);

	const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const INC: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = c.fetched[0] + 1;
	c.write(c.addressAbsolute[0], c.temp[0] & 0x00FF);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);
	
    return  new Uint8Array(1);
};
export const INX: OPERATION = (c) => {
    c.x[0]++;
	c.setFlag(CPU_FLAG.Z, c.x[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const INY: OPERATION = (c) => {
    c.y[0]++;
	c.setFlag(CPU_FLAG.Z, c.y[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const JMP: OPERATION = (c) => {
    c.pc[0] = c.addressAbsolute[0];
	
    return new Uint8Array(1);
};
export const JSR: OPERATION = (c) => {
    c.pc[0]--;

	c.write(0x0100 + c.stkp[0], (c.pc[0] >> 8) & 0x00FF);
	c.stkp[0]--;
	c.write(0x0100 + c.stkp[0], c.pc[0] & 0x00FF);
	c.stkp[0]--;

	c.pc[0] = c.addressAbsolute[0];
	
    return new Uint8Array(1);
};
export const LDA: OPERATION = (c) => {
    c.fetch();
	c.a[0] = c.fetched[0];
	//console.log('Load Accum:', c.a[0], c.fetched[0], c);
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a[0] & 0x80) === 0x00);
	
    const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const LDX: OPERATION = (c) => {
    c.fetch();
	c.x[0] = c.fetched[0];
	c.setFlag(CPU_FLAG.Z, c.x[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x[0] & 0x80) === 0x00);

	const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const LDY: OPERATION = (c) => {
    c.fetch();
	c.y[0] = c.fetched[0];
	c.setFlag(CPU_FLAG.Z, c.y[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y[0] & 0x80) !== 0x00);

	const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const LSR: OPERATION = (c) => {
    c.fetch();
	c.setFlag(CPU_FLAG.C, (c.fetched[0] & 0x0001) !== 0x0000);
	c.temp[0] = c.fetched[0] >> 1;	
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);
	if (lookup[c.opcode[0]].addressMode === IMP)
		c.a[0] = c.temp[0] & 0xFF;
	else
		c.write(c.addressAbsolute[0], c.temp[0] & 0x00FF);
	
    return new Uint8Array(1);
};
export const NOP: OPERATION = (c) => {
    const result = new Uint8Array(1);

	switch (c.opcode[0]) {
        case 0x1C:
        case 0x3C:
        case 0x5C:
        case 0x7C:
        case 0xDC:
        case 0xFC:
            result[0] = 0x01;
            break;
    }
    
    return result;
};
export const ORA: OPERATION = (c) => {
    c.fetch();
	c.a[0] = c.a[0] | c.fetched[0];
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a[0] & 0x80) !== 0x00);

	const result = new Uint8Array(1);
	result[0] = 0x01;

	return result;
};
export const PHA: OPERATION = (c) => {
    c.write(0x0100 + c.stkp[0], c.a[0]);
	c.stkp[0]--;

	return new Uint8Array(1);
};
export const PHP: OPERATION = (c) => {
    c.write(0x0100 + c.stkp[0], c.status[0] | CPU_FLAG.B | CPU_FLAG.U);
	c.setFlag(CPU_FLAG.B, false);
	c.setFlag(CPU_FLAG.U, false);
	c.stkp[0]--;
	
    return new Uint8Array(1);
};
export const PLA: OPERATION = (c) => {
    c.stkp[0]++;
	c.a[0] = c.read(0x0100 + c.stkp[0]);
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const PLP: OPERATION = (c) => {
    c.stkp[0]++;
	c.status[0] = c.read(0x0100 + c.stkp[0]);
	c.setFlag(CPU_FLAG.U, true);
	
    return new Uint8Array(1);
};
export const ROL: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = <Uint16Array[0]>(c.fetched[0] << 1) | c.getFlag(CPU_FLAG.C);
	c.setFlag(CPU_FLAG.C, (c.temp[0] & 0xFF00) !== 0x0000);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x0000);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x0000);
	if (lookup[c.opcode[0]].addressMode === IMP)
		c.a[0] = c.temp[0] & 0xFF;
	else
		c.write(c.addressAbsolute[0], c.temp[0] & 0x00FF);
	
    return new Uint8Array(1);
};
export const ROR: OPERATION = (c) => {
    c.fetch();
	c.temp[0] = <Uint16Array[0]>(c.getFlag(CPU_FLAG.C) << 7) | (c.fetched[0] >> 1);
	c.setFlag(CPU_FLAG.C, (c.fetched[0] & 0x01) !== 0x00);
	c.setFlag(CPU_FLAG.Z, (c.temp[0] & 0x00FF) === 0x00);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0x00);
	if (lookup[c.opcode[0]].addressMode === IMP)
		c.a[0] = c.temp[0] & 0x00FF;
	else
		c.write(c.addressAbsolute[0], c.temp[0] & 0x00FF);
	
    return new Uint8Array(1);
};
export const RTI: OPERATION = (c) => {
    c.stkp[0]++;
	c.status[0] = c.read(0x0100 + c.stkp[0]);
	c.status[0] &= ~CPU_FLAG.B;
	c.status[0] &= ~CPU_FLAG.U;

	c.stkp[0]++;
	c.pc[0] = <Uint16Array[0]>c.read(0x0100 + c.stkp[0]);
	c.stkp[0]++;
	c.pc[0] |= <Uint16Array[0]>c.read(0x0100 + c.stkp[0]) << 8;
	
    return new Uint8Array(1);
};
export const RTS: OPERATION = (c) => {
    c.stkp[0]++;
	c.pc[0] = <Uint16Array[0]>c.read(0x0100 + c.stkp[0]);
	c.stkp[0]++;
	c.pc[0] |= <Uint16Array[0]>c.read(0x0100 + c.stkp[0]) << 8;
	
	c.pc[0]++;
	
    return new Uint8Array(1);
};
export const SBC: OPERATION = (c) => {
    c.fetch();
	
	const value = (<Uint16Array[0]>c.fetched[0]) ^ 0x00FF;
	
	c.temp[0] = <Uint16Array[0]>c.a[0] + value + <Uint16Array[0]>c.getFlag(CPU_FLAG.C);
	c.setFlag(CPU_FLAG.C, (c.temp[0] & 0xFF00) !== 0);
	c.setFlag(CPU_FLAG.Z, ((c.temp[0] & 0x00FF) === 0));
	c.setFlag(CPU_FLAG.V, ((c.temp[0] ^ <Uint16Array[0]>c.a[0]) & (c.temp[0] ^ value) & 0x0080) !== 0);
	c.setFlag(CPU_FLAG.N, (c.temp[0] & 0x0080) !== 0);
	c.a[0] = c.temp[0] & 0xFF;

	const result = new Uint8Array(1);
	result[0] = 0x01;
	
	return result;
};
export const SEC: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.C, true);
	
    return new Uint8Array(1);
};
export const SED: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.D, true);
	
    return new Uint8Array(1);
};
export const SEI: OPERATION = (c) => {
    c.setFlag(CPU_FLAG.I, true);
	
    return new Uint8Array(1);
};
export const STA: OPERATION = (c) => {
    c.write(c.addressAbsolute[0], c.a[0]);
	
    return new Uint8Array(1);
};
export const STX: OPERATION = (c) => {
    c.write(c.addressAbsolute[0], c.x[0]);
	
    return new Uint8Array(1);
};
export const STY: OPERATION = (c) => {
    c.write(c.addressAbsolute[0], c.y[0]);
	
    return new Uint8Array(1);
};
export const TAX: OPERATION = (c) => {
    c.x[0] = c.a[0];
	c.setFlag(CPU_FLAG.Z, c.x[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const TAY: OPERATION = (c) => {
    c.y[0] = c.a[0];
	c.setFlag(CPU_FLAG.Z, c.y[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.y[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const TSX: OPERATION = (c) => {
    c.x[0] = c.stkp[0];
	c.setFlag(CPU_FLAG.Z, c.x[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.x[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const TXA: OPERATION = (c) => {
    c.a[0] = c.x[0];
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const TXS: OPERATION = (c) => {
    c.stkp[0] = c.x[0];
	
    return new Uint8Array(1);
};
export const TYA: OPERATION = (c) => {
    c.a[0] = c.y[0];
	c.setFlag(CPU_FLAG.Z, c.a[0] === 0x00);
	c.setFlag(CPU_FLAG.N, (c.a[0] & 0x80) !== 0x00);
	
    return new Uint8Array(1);
};
export const XXX: OPERATION = (c) => {
    return new Uint8Array(1);
};

const lookup: INSTRUCTION[] = <INSTRUCTION[]>[
    { name: 'BRK', operate: BRK, addressMode: IMM, cycles: new Uint8Array([0x07]) },{ name: 'ORA', operate: ORA, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'ORA', operate: ORA, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'ASL', operate: ASL, addressMode: ZP0, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'PHP', operate: PHP, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'ORA', operate: ORA, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'ASL', operate: ASL, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'ORA', operate: ORA, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'ASL', operate: ASL, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },
	{ name: 'BPL', operate: BPL, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'ORA', operate: ORA, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'ORA', operate: ORA, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'ASL', operate: ASL, addressMode: ZPX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'CLC', operate: CLC, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'ORA', operate: ORA, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'ORA', operate: ORA, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'ASL', operate: ASL, addressMode: ABX, cycles: new Uint8Array([0x07]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },
	{ name: 'JSR', operate: JSR, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: 'AND', operate: AND, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: 'BIT', operate: BIT, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'AND', operate: AND, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'ROL', operate: ROL, addressMode: ZP0, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'PLP', operate: PLP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'AND', operate: AND, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'ROL', operate: ROL, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'BIT', operate: BIT, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'AND', operate: AND, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'ROL', operate: ROL, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },
	{ name: 'BMI', operate: BMI, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'AND', operate: AND, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'AND', operate: AND, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'ROL', operate: ROL, addressMode: ZPX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'SEC', operate: SEC, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'AND', operate: AND, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'AND', operate: AND, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'ROL', operate: ROL, addressMode: ABX, cycles: new Uint8Array([0x07]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },
	{ name: 'RTI', operate: RTI, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'EOR', operate: EOR, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'EOR', operate: EOR, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'LSR', operate: LSR, addressMode: ZP0, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'PHA', operate: PHA, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'EOR', operate: EOR, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'LSR', operate: LSR, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'JMP', operate: JMP, addressMode: ABS, cycles: new Uint8Array([0x03]) },{ name: 'EOR', operate: EOR, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'LSR', operate: LSR, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },
	{ name: 'BVC', operate: BVC, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'EOR', operate: EOR, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'EOR', operate: EOR, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'LSR', operate: LSR, addressMode: ZPX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'CLI', operate: CLI, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'EOR', operate: EOR, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'EOR', operate: EOR, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'LSR', operate: LSR, addressMode: ABX, cycles: new Uint8Array([0x07]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },
	{ name: 'RTS', operate: RTS, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'ADC', operate: ADC, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'ADC', operate: ADC, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'ROR', operate: ROR, addressMode: ZP0, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'PLA', operate: PLA, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'ADC', operate: ADC, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'ROR', operate: ROR, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'JMP', operate: JMP, addressMode: IND, cycles: new Uint8Array([0x05]) },{ name: 'ADC', operate: ADC, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'ROR', operate: ROR, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },
	{ name: 'BVS', operate: BVS, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'ADC', operate: ADC, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'ADC', operate: ADC, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'ROR', operate: ROR, addressMode: ZPX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'SEI', operate: SEI, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'ADC', operate: ADC, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'ADC', operate: ADC, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'ROR', operate: ROR, addressMode: ABX, cycles: new Uint8Array([0x07]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },
	{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'STA', operate: STA, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'STY', operate: STY, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'STA', operate: STA, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'STX', operate: STX, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'DEY', operate: DEY, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'TXA', operate: TXA, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'STY', operate: STY, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'STA', operate: STA, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'STX', operate: STX, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x04]) },
	{ name: 'BCC', operate: BCC, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'STA', operate: STA, addressMode: IZY, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'STY', operate: STY, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'STA', operate: STA, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'STX', operate: STX, addressMode: ZPY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'TYA', operate: TYA, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'STA', operate: STA, addressMode: ABY, cycles: new Uint8Array([0x05]) },{ name: 'TXS', operate: TXS, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'STA', operate: STA, addressMode: ABX, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },
	{ name: 'LDY', operate: LDY, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'LDA', operate: LDA, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: 'LDX', operate: LDX, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'LDY', operate: LDY, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'LDA', operate: LDA, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'LDX', operate: LDX, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x03]) },{ name: 'TAY', operate: TAY, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'LDA', operate: LDA, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'TAX', operate: TAX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'LDY', operate: LDY, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'LDA', operate: LDA, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'LDX', operate: LDX, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x04]) },
	{ name: 'BCS', operate: BCS, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'LDA', operate: LDA, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'LDY', operate: LDY, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'LDA', operate: LDA, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'LDX', operate: LDX, addressMode: ZPY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'CLV', operate: CLV, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'LDA', operate: LDA, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: 'TSX', operate: TSX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'LDY', operate: LDY, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'LDA', operate: LDA, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'LDX', operate: LDX, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x04]) },
	{ name: 'CPY', operate: CPY, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'CMP', operate: CMP, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: 'CPY', operate: CPY, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'CMP', operate: CMP, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'DEC', operate: DEC, addressMode: ZP0, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'INY', operate: INY, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'CMP', operate: CMP, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'DEX', operate: DEX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'CPY', operate: CPY, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'CMP', operate: CMP, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'DEC', operate: DEC, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },
	{ name: 'BNE', operate: BNE, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'CMP', operate: CMP, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'CMP', operate: CMP, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'DEC', operate: DEC, addressMode: ZPX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'CLD', operate: CLD, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'CMP', operate: CMP, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: 'NOP', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'CMP', operate: CMP, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'DEC', operate: DEC, addressMode: ABX, cycles: new Uint8Array([0x07]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },
	{ name: 'CPX', operate: CPX, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'SBC', operate: SBC, addressMode: IZX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: 'CPX', operate: CPX, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'SBC', operate: SBC, addressMode: ZP0, cycles: new Uint8Array([0x03]) },{ name: 'INC', operate: INC, addressMode: ZP0, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x05]) },{ name: 'INX', operate: INX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'SBC', operate: SBC, addressMode: IMM, cycles: new Uint8Array([0x02]) },{ name: 'NOP', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: SBC, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'CPX', operate: CPX, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'SBC', operate: SBC, addressMode: ABS, cycles: new Uint8Array([0x04]) },{ name: 'INC', operate: INC, addressMode: ABS, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },
	{ name: 'BEQ', operate: BEQ, addressMode: REL, cycles: new Uint8Array([0x02]) },{ name: 'SBC', operate: SBC, addressMode: IZY, cycles: new Uint8Array([0x05]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x08]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'SBC', operate: SBC, addressMode: ZPX, cycles: new Uint8Array([0x04]) },{ name: 'INC', operate: INC, addressMode: ZPX, cycles: new Uint8Array([0x06]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x06]) },{ name: 'SED', operate: SED, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: 'SBC', operate: SBC, addressMode: ABY, cycles: new Uint8Array([0x04]) },{ name: 'NOP', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x02]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },{ name: '???', operate: NOP, addressMode: IMP, cycles: new Uint8Array([0x04]) },{ name: 'SBC', operate: SBC, addressMode: ABX, cycles: new Uint8Array([0x04]) },{ name: 'INC', operate: INC, addressMode: ABX, cycles: new Uint8Array([0x07]) },{ name: '???', operate: XXX, addressMode: IMP, cycles: new Uint8Array([0x07]) },
];
