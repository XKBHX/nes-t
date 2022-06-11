import { Bus } from './bus';
import { Cartridge } from './cartridge';
import { CPU_FLAG } from './cpu';
import { GREEN, Pixel, RED, WHITE } from './graphics';

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
        
        this.drawString(x , y , 'STATUS:', WHITE);
        this.drawString(x  + 64, y, 'N', this.nes.cpu.status & CPU_FLAG.N ? GREEN : RED);
        this.drawString(x  + 80, y , 'V', this.nes.cpu.status & CPU_FLAG.V ? GREEN : RED);
        this.drawString(x  + 96, y , '-', this.nes.cpu.status & CPU_FLAG.U ? GREEN : RED);
        this.drawString(x  + 112, y , 'B', this.nes.cpu.status & CPU_FLAG.B ? GREEN : RED);
        this.drawString(x  + 128, y , 'D', this.nes.cpu.status & CPU_FLAG.D ? GREEN : RED);
        this.drawString(x  + 144, y , 'I', this.nes.cpu.status & CPU_FLAG.I ? GREEN : RED);
        this.drawString(x  + 160, y , 'Z', this.nes.cpu.status & CPU_FLAG.Z ? GREEN : RED);
        this.drawString(x  + 178, y , 'C', this.nes.cpu.status & CPU_FLAG.C ? GREEN : RED);
        this.drawString(x , y + 10, 'PC: $' + this.hex(this.nes.cpu.pc, 4));
        this.drawString(x , y + 20, 'A: $' +  this.hex(this.nes.cpu.a, 2) + '  [' + String(this.nes.cpu.a) + ']');
        this.drawString(x , y + 30, 'X: $' +  this.hex(this.nes.cpu.x, 2) + '  [' + String(this.nes.cpu.x) + ']');
        this.drawString(x , y + 40, 'Y: $' +  this.hex(this.nes.cpu.y, 2) + '  [' + String(this.nes.cpu.y) + ']');
        this.drawString(x , y + 50, 'Stack P: $' + this.hex(this.nes.cpu.stkp, 4));
    }

    private drawCode(x: number, y: number, lines: number): void {
        
    }

    private drawString(x: number, y: number, text: string, col: Pixel = WHITE, scale: number = 1): void {}
}

type AsmMap = {
    [key: Uint16Array[0]]: string;
}