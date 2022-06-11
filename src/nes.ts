import { Bus } from './bus';
import { Cartridge } from './cartridge';
import { GameEngine } from './graphics/engine';
import { CYAN, DARK_BLUE, GREEN, Key, Pixel, RED, Sprite, VERY_DARK_BLUE, WHITE } from './graphics';
import { CPU_FLAG } from './cpu';
import { Decal } from './graphics/decal';
import { VF2D, WebGPURenderer } from './graphics/render';
import { renderer } from './graphics/platform';

let count = 0;

export class NESGameEngine extends GameEngine {
    private nes: Bus;
    private cartridge: Cartridge = <Cartridge><unknown>undefined;
    private emulationRun: boolean;
    private residualTime: number;
    private selectedPalette: number;
    private audio: [number, number, number, number];
    private accumulatedTime: number;
    private mapAsm: Record<number, string> = [];
    private clockCount = 0;
    private currentTime = Date.now();
    private sprite: Sprite = <Sprite><unknown>undefined;
    private decal: Decal = <Decal><unknown>undefined;

    constructor(private romBuffer: ArrayBuffer = new ArrayBuffer(0), public imageFile: ImageData = new ImageData(0, 0), private soundSampleFrequency: number = 44100) {
        super();
        this.sAppName = 'NES Emulator';
        this.nes = new Bus();
        //this.cartridge = new Cartridge('rom/Super Mario Bros 3 (E).nes');
        this.emulationRun = false;
        this.residualTime = 0.0;
        this.selectedPalette = 0x00;
        this.audio = [0, 0, 0, 0];
        this.accumulatedTime = 0.0;

        document.addEventListener('mousemove', e => {
            this.updateMouse(e.pageX, e.pageY);
        }, false);
    }

    override onUserCreate(): boolean {
        console.log('Creating User');
        //this.cartridge = new Cartridge(this.romBuffer);

        //if(!this.cartridge.imageValid()) return false;
        //this.nes.insertCartridge(this.cartridge);
        //this.nes.reset();
        //console.log('NES Cartridge', this.nes.cartridge, this.nes.ppu);

        //this.nes.setSampleFrequency(this.soundSampleFrequency);
        this.sprite = Sprite.createSpriteFromFile(this.imageFile);
        this.decal = new Decal(this.sprite);
        console.log(this.sprite);
        
        return true; 
    }

    override onUserUpdate(elapsedTime: number): boolean {
        //console.log('User Update', elapsedTime);
        //this.clear(DARK_BLUE);

        // TODO Controller stuff

        //this.renderDebugger()
        //if (this.emulationRun) this.executeEmulation(elapsedTime);
        //else this.executeDebugEmulation(elapsedTime);

        //this.drawCpu(516, 2);

        //const swatchSize = 6;
/* 
        for (let p = 0; p < 8; p++)
			for (let s = 0; s < 4; s++)
				this.fillRect(516 + p * (swatchSize * 5) + s * swatchSize, 340,
					swatchSize, swatchSize, this.nes.ppu.getColorFromPaletteRam(p, s));

		this.drawRect(516 + this.selectedPalette * (swatchSize * 5) - 1, 339, (swatchSize * 4), swatchSize, WHITE);

		this.drawSprite(516, 348, this.nes.ppu.getPatternTable(0, this.selectedPalette));
		this.drawSprite(648, 348, this.nes.ppu.getPatternTable(1, this.selectedPalette));
		this.drawSprite(0, 0, this.nes.ppu.getScreen(), 2); */

        //this.clockCount++;
        const pos = this.getMousePos();
        //this.clear(VERY_DARK_BLUE);
        (<WebGPURenderer>renderer).drawImage(this.sprite, new VF2D(1, 1));
        //this.drawDecal(pos, this.decal, new VF2D(0.1, 0.1), RED);
        //this.drawSprite(pos.x, pos.y, this.sprite);
        //if (count < 3) console.log('Decal', this.decal);
        count++;
        //console.log('Position', pos);

        return true;
    }
        
    override onUserDestroy(): boolean { return false; }
    override configureSystem(): void {}

    executeEmulation(elapsedTime: number): void {
        if (this.residualTime > 0.0)
            this.residualTime -= elapsedTime;
		else
		{
			this.residualTime += (1.0 / 60.0) - elapsedTime;
			do { this.nes.clock(); } while (!this.nes.ppu.frameComplete);
			this.nes.ppu.frameComplete = false;
		}
    }

    executeDebugEmulation(elapsedTime: number): void {
        if (this.getKey(Key.C).bPressed) {
            console.log('C Pressed State', this.getKey(Key.C));
            do { this.nes.clock(); } while (!this.nes.cpu.complete());
			do { this.nes.clock(); } while (this.nes.cpu.complete());
		} else return;
        
		if (true) {
            //console.log('Debugging')
			do { this.nes.clock(); } while (!this.nes.ppu.frameComplete);
			do { this.nes.clock(); } while (!this.nes.cpu.complete());
			
			this.nes.ppu.frameComplete = false;
		}
    }

    renderDebugger(): void {
        //console.log('Time Delta', Date.now() - this.currentTime);
        const fpsCount = Math.floor(this.clockCount / ((Date.now() - this.currentTime) / 1000));
        const n = document.getElementById('n')!;
        const v = document.getElementById('v')!;
        const u = document.getElementById('u')!;
        const b = document.getElementById('b')!;
        const d = document.getElementById('d')!;
        const i = document.getElementById('i')!;
        const z = document.getElementById('z')!;
        const c = document.getElementById('c')!;
    
        const a = document.getElementById('a')!;
        const x = document.getElementById('x')!;
        const y = document.getElementById('y')!;
        const sp = document.getElementById('sp')!;
        const pc = document.getElementById('pc')!;
        const fps = document.getElementById('fps')!;
        const cycles = document.getElementById('cycles')!;
    
        const positiveColor = 'blue';
        const negativeColor = 'red';
        const positiveWeight = 'bold';
        const negativeWeight = 'red';
    
        //console.log(this.currentTime);
    
        if (n && this.nes.cpu.getFlag(CPU_FLAG.N) !== 1) {
            n.style.fontWeight = positiveWeight;
            n.style.color = positiveColor;
        } else if(n) { n.style.fontWeight = negativeWeight; n.style.color = negativeColor; }
        if (v && this.nes.cpu.getFlag(CPU_FLAG.V) !== 1) {
            v.style.fontWeight = positiveWeight;
            v.style.color = positiveColor;
        } else if(v) { v.style.fontWeight = negativeWeight; v.style.color = negativeColor; }
        if (u && this.nes.cpu.getFlag(CPU_FLAG.U) !== 1) {
            u.style.fontWeight = positiveWeight;
            u.style.color = positiveColor;
        } else if(u) { u.style.fontWeight = negativeWeight; u.style.color = negativeColor; }
        if (b && this.nes.cpu.getFlag(CPU_FLAG.B) !== 1) {
            b.style.fontWeight = positiveWeight;
            b.style.color = positiveColor;
        } else if(b) { b.style.fontWeight = negativeWeight; b.style.color = negativeColor; }
        if (d && this.nes.cpu.getFlag(CPU_FLAG.D) !== 1) {
            d.style.fontWeight = positiveWeight;
            d.style.color = positiveColor;
        } else if(d) { d.style.fontWeight = negativeWeight; d.style.color = negativeColor; }
        if (i && this.nes.cpu.getFlag(CPU_FLAG.I) !== 1) {
            i.style.fontWeight = positiveWeight;
            i.style.color = positiveColor;
        } else if(i) { i.style.fontWeight = negativeWeight; i.style.color = negativeColor; }
        if (z && this.nes.cpu.getFlag(CPU_FLAG.Z) !== 1) {
            z.style.fontWeight = positiveWeight;
            z.style.color = positiveColor;
        } else if(z) { z.style.fontWeight = negativeWeight; z.style.color = negativeColor; }
        if (c && this.nes.cpu.getFlag(CPU_FLAG.C) !== 1) {
            c.style.fontWeight = positiveWeight;
            c.style.color = positiveColor;
        } else if(c) { c.style.fontWeight = negativeWeight; c.style.color = negativeColor; }
        if (pc) { pc.innerHTML = ` $${this.hex(this.nes.cpu.pc, 4)}`; }
        if (a) { a.innerHTML = ` $${this.hex(this.nes.cpu.a, 2)} [${String(this.nes.cpu.a)}]`; }
        if (x) { x.innerHTML = ` $${this.hex(this.nes.cpu.x, 2)} [${String(this.nes.cpu.x)}]`; }
        if (y) { y.innerHTML = ` $${this.hex(this.nes.cpu.y, 2)} [${String(this.nes.cpu.y)}]`; }
        if (sp) { sp.innerHTML = ` $${this.hex(this.nes.cpu.stkp, 2)}`; }
        if (fps) { fps.innerHTML = ` ${fpsCount}` }
        if (cycles) { cycles.innerHTML = ` ${this.nes.cpu.cycles}` }
      }
    
      

    drawCpu(x: number, y: number): void {
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

    drawCode(x: number, y: number, lines: number): void {
        let it_a = this.mapAsm[this.nes.cpu.pc];
		let nLineY = (lines >> 1) * 10 + y;
        let mapAsmEnd =Math.max(...Object.keys(this.mapAsm).map(k => +k))

		if (it_a !== this.mapAsm[mapAsmEnd]) {
			this.drawString(x, nLineY, it_a, CYAN);
			while (nLineY < (lines * 10) + y) {
				nLineY += 10;
				if ((it_a.charCodeAt(0) + 1) !== mapAsmEnd) {
					this.drawString(x, nLineY, it_a);
				}
			}
		}

		it_a = this.mapAsm[this.nes.cpu.pc];
		nLineY = (lines >> 1) * 10 + y;
		
        if (it_a !== this.mapAsm[mapAsmEnd]) {
			while (nLineY > y) {
				nLineY -= 10;
				if (String.fromCharCode(it_a.charCodeAt(0) - 1) !== this.mapAsm[mapAsmEnd]) {
					this.drawString(x, nLineY, it_a);
				}
			}
		}
    }

    drawRam(x: number, y: number, address: Uint16Array[0], rows: number, columns: number): void {
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
}
