/**
 * Headless nestest.nes automation suite.
 * Starts at $C000 (not the reset vector) and runs official + unofficial tests.
 *
 * Official tests: compare every instruction against nestest.log, then $C66E / $02.
 * Unofficial tests: continue after $C66E and read $03.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Cartridge } from '../src/cartridge';
import { Bus } from '../src/bus';

const OFFICIAL_PASS_PC = 0xc66e;
const MAX_INSTRUCTIONS = 200_000;
const HANG_THRESHOLD = 256;
const MAX_MISMATCHES = 20;

interface LogLine {
  pc: number;
  a: number;
  x: number;
  y: number;
  p: number;
  sp: number;
  raw: string;
}

function hex(n: number, width: number): string {
  return n.toString(16).toUpperCase().padStart(width, '0');
}

function stepInstruction(bus: Bus): void {
  do {
    bus.cpu.clock();
  } while (!bus.cpu.complete());
}

function parseNestestLog(logPath: string): LogLine[] {
  const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
  const parsed: LogLine[] = [];
  const re = /^([0-9A-Fa-f]{4}).*A:([0-9A-Fa-f]{2}) X:([0-9A-Fa-f]{2}) Y:([0-9A-Fa-f]{2}) P:([0-9A-Fa-f]{2}) SP:([0-9A-Fa-f]{2})/;
  for (const raw of lines) {
    const m = raw.match(re);
    if (!m) continue;
    parsed.push({
      pc: parseInt(m[1], 16),
      a: parseInt(m[2], 16),
      x: parseInt(m[3], 16),
      y: parseInt(m[4], 16),
      p: parseInt(m[5], 16),
      sp: parseInt(m[6], 16),
      raw,
    });
  }
  return parsed;
}

function main(): void {
  const romPath = path.join(__dirname, '../rom/nestest.nes');
  const logPath = process.env.NESTEST_LOG || path.join(__dirname, 'nestest.log');
  if (!fs.existsSync(romPath)) {
    throw new Error(`nestest.nes not found at ${romPath}`);
  }

  const rom = fs.readFileSync(romPath);
  const cart = new Cartridge(rom.buffer.slice(rom.byteOffset, rom.byteOffset + rom.byteLength));
  if (!cart.imageValid()) {
    throw new Error('nestest.nes failed to parse');
  }

  const expected = fs.existsSync(logPath) ? parseNestestLog(logPath) : [];
  if (expected.length === 0) {
    console.log(`nestest: no nestest.log at ${logPath}; skipping instruction-level compare`);
  } else {
    console.log(`nestest: comparing ${expected.length} official instructions against nestest.log`);
  }

  const bus = new Bus();
  bus.insertCartridge(cart);
  bus.reset();

  // Automation entry: ignore RESET ($C004) and start at $C000.
  // Match nestest.log power-up: A/X/Y=0, SP=$FD, P=$24.
  bus.cpu.pc[0] = 0xc000;
  bus.cpu.a[0] = 0x00;
  bus.cpu.x[0] = 0x00;
  bus.cpu.y[0] = 0x00;
  bus.cpu.stkp[0] = 0xfd;
  bus.cpu.status[0] = 0x24;
  bus.cpu.cycles[0] = 0;

  let instructions = 0;
  let reachedOfficialPass = false;
  let officialAt: { instr: number; r02: number; r03: number } | null = null;
  let lastPc = -1;
  let hangCount = 0;
  let logMatches = 0;
  const mismatches: string[] = [];

  while (instructions < MAX_INSTRUCTIONS) {
    const pc = bus.cpu.pc[0];
    const a = bus.cpu.a[0];
    const x = bus.cpu.x[0];
    const y = bus.cpu.y[0];
    const p = bus.cpu.status[0];
    const sp = bus.cpu.stkp[0];

    if (instructions < expected.length) {
      const exp = expected[instructions];
      const ok =
        pc === exp.pc && a === exp.a && x === exp.x && y === exp.y && p === exp.p && sp === exp.sp;
      if (ok) {
        logMatches++;
      } else if (mismatches.length < MAX_MISMATCHES) {
        mismatches.push(
          `  #${instructions} got  ${hex(pc, 4)} A:${hex(a, 2)} X:${hex(x, 2)} Y:${hex(y, 2)} P:${hex(p, 2)} SP:${hex(sp, 2)}\n` +
            `         want ${hex(exp.pc, 4)} A:${hex(exp.a, 2)} X:${hex(exp.x, 2)} Y:${hex(exp.y, 2)} P:${hex(exp.p, 2)} SP:${hex(exp.sp, 2)}`
        );
      }
    }

    if (!reachedOfficialPass && pc === OFFICIAL_PASS_PC) {
      reachedOfficialPass = true;
      officialAt = {
        instr: instructions,
        r02: bus.cpuRead(0x0002),
        r03: bus.cpuRead(0x0003),
      };
      console.log(
        `nestest: official marker $C66E after ${instructions} instructions ` +
          `($02=${hex(officialAt.r02, 2)} $03=${hex(officialAt.r03, 2)})`
      );
    }

    if (pc === lastPc) {
      hangCount++;
      if (hangCount >= HANG_THRESHOLD) {
        console.log(`nestest: halted in a tight loop at $${hex(pc, 4)} after ${instructions} instructions`);
        break;
      }
    } else {
      hangCount = 0;
      lastPc = pc;
    }

    stepInstruction(bus);
    instructions++;
  }

  const r02 = bus.cpuRead(0x0002);
  const r03 = bus.cpuRead(0x0003);
  const pc = bus.cpu.pc[0];

  console.log('nestest: --- results ---');
  console.log(`  instructions: ${instructions}`);
  console.log(`  PC:           $${hex(pc, 4)}`);
  if (expected.length > 0) {
    console.log(`  log match:    ${logMatches}/${expected.length}`);
    if (mismatches.length > 0) {
      console.log(`  first mismatches (${mismatches.length}${logMatches + mismatches.length < expected.length ? '+' : ''}):`);
      for (const line of mismatches) console.log(line);
    }
  }
  console.log(`  official $02: $${hex(r02, 2)} ${r02 === 0 && reachedOfficialPass ? 'PASS' : 'FAIL'}`);
  console.log(`  unofficial $03: $${hex(r03, 2)} ${r03 === 0 && reachedOfficialPass ? 'PASS' : 'FAIL'}`);
  if (officialAt) {
    console.log(
      `  at $C66E:     $02=$${hex(officialAt.r02, 2)} $03=$${hex(officialAt.r03, 2)} (${officialAt.instr} instr)`
    );
  } else {
    console.log('  official marker $C66E was never reached');
  }

  const logPass = expected.length === 0 || logMatches === expected.length;
  const officialPass = reachedOfficialPass && officialAt !== null && officialAt.r02 === 0;
  const unofficialPass = r03 === 0 && r02 === 0 && reachedOfficialPass;

  if (!logPass || !officialPass || !unofficialPass) {
    const parts: string[] = [];
    if (!logPass) parts.push(`log ${logMatches}/${expected.length}`);
    if (!reachedOfficialPass) parts.push('did not reach $C66E');
    if (r02 !== 0) parts.push(`official failure code $${hex(r02, 2)}`);
    if (r03 !== 0) parts.push(`unofficial failure code $${hex(r03, 2)}`);
    throw new Error(`nestest failed: ${parts.join('; ')}`);
  }

  console.log('validate-nestest: all checks passed');
}

main();
