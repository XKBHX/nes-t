import * as fs from 'fs';
import * as path from 'path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Bus } from '../src/bus';
import { findTestRom, loadCartridge } from './helpers';

/**
 * Optional ROM-backed suites from
 * https://www.nesdev.org/wiki/Emulator_tests
 *
 * nestest (kevtris): start at $C000, compare nestest.log, then $02/$03.
 * Skipped when rom/nestest.nes is not present so CI stays ROM-free.
 */
describe('NESdev test ROMs', () => {
  it('nestest: official log, $C66E, and $02/$03', { timeout: 60_000 }, (t) => {
    const romPath = findTestRom('nestest.nes');
    if (!romPath) {
      t.skip('rom/nestest.nes not present');
      return;
    }

    const logPath = process.env.NESTEST_LOG || path.join(__dirname, '..', 'scripts', 'nestest.log');
    const expected = fs.existsSync(logPath) ? parseNestestLog(logPath) : [];
    const cart = loadCartridge(romPath);
    assert.equal(cart.imageValid(), true);

    const bus = new Bus();
    bus.insertCartridge(cart);
    bus.reset();
    bus.cpu.pc[0] = 0xc000;
    bus.cpu.a[0] = 0x00;
    bus.cpu.x[0] = 0x00;
    bus.cpu.y[0] = 0x00;
    bus.cpu.stkp[0] = 0xfd;
    bus.cpu.status[0] = 0x24;
    bus.cpu.cycles[0] = 0;

    const OFFICIAL_PASS_PC = 0xc66e;
    const MAX_INSTRUCTIONS = 200_000;
    const HANG_THRESHOLD = 256;

    let instructions = 0;
    let reachedOfficial = false;
    let officialR02 = 0xff;
    let logMatches = 0;
    let lastPc = -1;
    let hangCount = 0;

    while (instructions < MAX_INSTRUCTIONS) {
      const pc = bus.cpu.pc[0];
      if (instructions < expected.length) {
        const exp = expected[instructions];
        if (
          pc === exp.pc &&
          bus.cpu.a[0] === exp.a &&
          bus.cpu.x[0] === exp.x &&
          bus.cpu.y[0] === exp.y &&
          bus.cpu.status[0] === exp.p &&
          bus.cpu.stkp[0] === exp.sp
        ) {
          logMatches++;
        }
      }

      if (!reachedOfficial && pc === OFFICIAL_PASS_PC) {
        reachedOfficial = true;
        officialR02 = bus.cpuRead(0x0002);
      }

      if (pc === lastPc) {
        hangCount++;
        if (hangCount >= HANG_THRESHOLD) break;
      } else {
        hangCount = 0;
        lastPc = pc;
      }

      do {
        bus.cpu.clock();
      } while (!bus.cpu.complete());
      instructions++;
    }

    const r02 = bus.cpuRead(0x0002);
    const r03 = bus.cpuRead(0x0003);
    assert.equal(reachedOfficial, true, 'never reached nestest official marker $C66E');
    assert.equal(officialR02, 0, `official $02 at $C66E was $${hex(officialR02)}`);
    assert.equal(r02, 0, `official $02 ended at $${hex(r02)}`);
    assert.equal(r03, 0, `unofficial $03 ended at $${hex(r03)}`);
    if (expected.length > 0) {
      assert.equal(logMatches, expected.length, `log match ${logMatches}/${expected.length}`);
    }
  });
});

interface LogLine {
  pc: number;
  a: number;
  x: number;
  y: number;
  p: number;
  sp: number;
}

function parseNestestLog(logPath: string): LogLine[] {
  const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/);
  const parsed: LogLine[] = [];
  const re =
    /^([0-9A-Fa-f]{4}).*A:([0-9A-Fa-f]{2}) X:([0-9A-Fa-f]{2}) Y:([0-9A-Fa-f]{2}) P:([0-9A-Fa-f]{2}) SP:([0-9A-Fa-f]{2})/;
  for (const raw of lines) {
    const match = raw.match(re);
    if (!match) continue;
    parsed.push({
      pc: parseInt(match[1], 16),
      a: parseInt(match[2], 16),
      x: parseInt(match[3], 16),
      y: parseInt(match[4], 16),
      p: parseInt(match[5], 16),
      sp: parseInt(match[6], 16),
    });
  }
  return parsed;
}

function hex(n: number): string {
  return n.toString(16).toUpperCase().padStart(2, '0');
}
