import { Bus } from './bus';
import { Cartridge } from './cartridge';

export class Visualizer {
    private nes: Bus
    private cart: Cartridge;
    private emulationRun: boolean = false;
    private residualTime: number = 0.0;
    private selectedPalette: Uint8Array[0] = 0x00;
    private audio: Uint16Array[];
    private accumulatedTime: number = 0.0;
    private mapAsm: AsmMap;

    constructor() {}

    private hex(n: Uint32Array[0], d: Uint8Array[0]): string {
        let s = ''

        for(let i = d - 1; i >= 0; i--, n >>= 4) s = s.padStart(s.length + 1, '0123456789ABCDEF'[n & 0xF]);
        

        return s;
    }

    private drawRam(x: number, y: number, address: Uint16Array[0], rows: number, columns: number): void {
        const ramX = x;
        let ramY = y;

        for(let row = 0; row < rows; row++) {
            let offset = `$${this.hex(address, 4)}:`;

            for(let col = 0; col < columns; col++) {
                offset += ` ${this.hex(this.nes.cpuRead(address, true), 2)}`;
                address++;
            }
            this.drawString(ramX, ramY, offset);
            ramY += 10;
        }
    }

    private drawCpu(x: number, y: number): void {
        const status = 'STATUS: ';
        drawString(x , y , "STATUS:", olc::WHITE);
        drawString(x  + 64, y, "N", nes.cpu.status & olc6502::N ? olc::GREEN : olc::RED);
        drawString(x  + 80, y , "V", nes.cpu.status & olc6502::V ? olc::GREEN : olc::RED);
        drawString(x  + 96, y , "-", nes.cpu.status & olc6502::U ? olc::GREEN : olc::RED);
        drawString(x  + 112, y , "B", nes.cpu.status & olc6502::B ? olc::GREEN : olc::RED);
        drawString(x  + 128, y , "D", nes.cpu.status & olc6502::D ? olc::GREEN : olc::RED);
        drawString(x  + 144, y , "I", nes.cpu.status & olc6502::I ? olc::GREEN : olc::RED);
        drawString(x  + 160, y , "Z", nes.cpu.status & olc6502::Z ? olc::GREEN : olc::RED);
        drawString(x  + 178, y , "C", nes.cpu.status & olc6502::C ? olc::GREEN : olc::RED);
        drawString(x , y + 10, "PC: $" + hex(nes.cpu.pc, 4));
        drawString(x , y + 20, "A: $" +  hex(nes.cpu.a, 2) + "  [" + std::to_string(nes.cpu.a) + "]");
        drawString(x , y + 30, "X: $" +  hex(nes.cpu.x, 2) + "  [" + std::to_string(nes.cpu.x) + "]");
        drawString(x , y + 40, "Y: $" +  hex(nes.cpu.y, 2) + "  [" + std::to_string(nes.cpu.y) + "]");
        drawString(x , y + 50, "Stack P: $" + hex(nes.cpu.stkp, 4));
    }

    private drawCode(x: number, y: number, lines: number): void {
        
    }
}

type AsmMap = {
    [key: Uint16Array[0]]: string;
}