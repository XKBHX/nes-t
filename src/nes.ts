import { Bus } from './bus';
import { Cartridge } from './cartridge';
import { clearOpposingDirections, connectedGamepads, nesButtonsFromGamepad, packNesButtons } from './controller';
import { GameEngine } from './graphics/engine';
import { CYAN, DARK_BLUE, GREEN, Key, Pixel, RED, Sprite, VERY_DARK_BLUE, WHITE } from './graphics';
import { CPU_FLAG } from './cpu';
import { Decal } from './graphics/decal';
import { VF2D, WebGPURenderer } from './graphics/render';
import { renderer } from './graphics/platform';
import { ImageWebGPURenderable } from './graphics/webgpu.renderable';
import head from './rom/small-head.png';

let count = 0;
let drawCount = 0;
let mapAsm;

const TARGET_FPS = 60;
const NES_WIDTH = 256;
const NES_HEIGHT = 240;
const DISPLAY_SCALE = 2;
const MAX_FRAME_CATCH_UP = 0.1;

export class NESGameEngine extends GameEngine {
    private nes: Bus;
    private cartridge: Cartridge = <Cartridge><unknown>undefined;
    private emulationRun: boolean;
    private gamepad: Gamepad = <Gamepad><unknown>undefined;
    private residualTime: number;
    private selectedPalette: number;
    private audio: [number, number, number, number];
    private accumulatedTime: number;
    private mapAsm: Record<number, string> = {};
    private clockCount = 0;
    private currentTime = Date.now();  
    private sprite: Sprite = <Sprite><unknown>undefined;
    private decal: Decal = <Decal><unknown>undefined;
    private specialRenderable: ImageWebGPURenderable = <ImageWebGPURenderable><unknown>undefined;
    private screenRenderable: ImageWebGPURenderable = <ImageWebGPURenderable><unknown>undefined;
    private debugElements: Record<string, HTMLElement | null> | undefined;

    constructor(private romBuffer: ArrayBuffer = new ArrayBuffer(0), public imageFile: ImageBitmap = new ImageBitmap(), private soundSampleFrequency: number = 44100) {
        super();
        this.sAppName = 'NES Emulator';
        this.nes = new Bus();
        //this.cartridge = new Cartridge('rom/Super Mario Bros 3 (E).nes');
        this.emulationRun = true;
        this.residualTime = 0.0;
        this.selectedPalette = 0x00;
        this.audio = [0, 0, 0, 0];
        this.accumulatedTime = 0.0;

        document.addEventListener('mousemove', e => {
            this.updateMouse(e.pageX, e.pageY);
        }, false);

        //this.setSpecialRenderable();
    }

    override onUserCreate(): boolean {
        //console.log('Creating User');
        this.cartridge = new Cartridge(this.romBuffer);

        if(!this.cartridge.imageValid()) return false;
        this.nes.insertCartridge(this.cartridge);
        this.mapAsm = this.nes.cpu.disassemble(0x0000, 0xffff);
        this.nes.reset();
        console.log('NES Cartridge', this.nes.cartridge, this.nes.ppu);

        this.nes.setSampleFrequency(this.soundSampleFrequency);
        //this.sprite = Sprite.createSpriteFromFile(this.imageFile);
        //this.decal = new Decal(this.sprite);
        //console.log(this.sprite);
        //console.log('Format', (<any>renderer).format);

        this.setupButton();

        //this.simpleRomSetup();
        return true; 
    }

    override onUserUpdate(elapsedTime: number): boolean {
        this.updateController();
        this.renderDebugger();
        if (this.emulationRun) this.executeEmulation(elapsedTime);
        else this.executeDebugEmulation(elapsedTime);

        const screenSprite = this.nes.ppu.getScreen();
        if (!this.screenRenderable) {
            this.screenRenderable = ImageWebGPURenderable.createFromSprite(
                screenSprite,
                0,
                [NES_WIDTH * DISPLAY_SCALE, NES_HEIGHT * DISPLAY_SCALE]
            );
        }
        this.screenRenderable.updateImageFromSprite(screenSprite);
        (<WebGPURenderer>renderer).drawImages(this.screenRenderable);

        this.clockCount++;
        count++;
        return true;
    }
        
    override onUserDestroy(): boolean { return false; }
    override configureSystem(): void {}

    executeEmulation(elapsedTime: number): void {
        const frameTime = 1.0 / TARGET_FPS;
        this.accumulatedTime += Math.min(elapsedTime, MAX_FRAME_CATCH_UP);

        while (this.accumulatedTime >= frameTime) {
            do { this.nes.clock(); } while (!this.nes.ppu.frameComplete);
            this.nes.ppu.frameComplete = false;
            this.accumulatedTime -= frameTime;
        }
    }

    executeDebugEmulation(elapsedTime: number): void {
        if (this.getKey(Key.C).bPressed) {
            console.log('C Pressed State', this.getKey(Key.C));
            do { this.nes.clock(); } while (!this.nes.cpu.complete());
			do { this.nes.clock(); } while (this.nes.cpu.complete());
            drawCount++;
            console.log('Controller State:', (<any>this.nes).controllerState);
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
        if (!this.debugElements) {
            this.debugElements = {
                n: document.getElementById('n'),
                v: document.getElementById('v'),
                u: document.getElementById('u'),
                b: document.getElementById('b'),
                d: document.getElementById('d'),
                i: document.getElementById('i'),
                z: document.getElementById('z'),
                c: document.getElementById('c'),
                a: document.getElementById('a'),
                x: document.getElementById('x'),
                y: document.getElementById('y'),
                sp: document.getElementById('sp'),
                pc: document.getElementById('pc'),
                fps: document.getElementById('fps'),
                cycles: document.getElementById('cycles'),
            };
        }

        const n = this.debugElements.n!;
        const v = this.debugElements.v!;
        const u = this.debugElements.u!;
        const b = this.debugElements.b!;
        const d = this.debugElements.d!;
        const i = this.debugElements.i!;
        const z = this.debugElements.z!;
        const c = this.debugElements.c!;
    
        const a = this.debugElements.a!;
        const x = this.debugElements.x!;
        const y = this.debugElements.y!;
        const sp = this.debugElements.sp!;
        const pc = this.debugElements.pc!;
        const fps = this.debugElements.fps!;
        const cycles = this.debugElements.cycles!;
    
        const positiveColor = 'blue';
        const negativeColor = 'red';
        const positiveWeight = 'bold';
        const negativeWeight = 'normal';
    
        //console.log(this.currentTime);
    
        this.setFlagStyle(n, this.nes.cpu.getFlag(CPU_FLAG.N) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(v, this.nes.cpu.getFlag(CPU_FLAG.V) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(u, this.nes.cpu.getFlag(CPU_FLAG.U) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(b, this.nes.cpu.getFlag(CPU_FLAG.B) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(d, this.nes.cpu.getFlag(CPU_FLAG.D) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(i, this.nes.cpu.getFlag(CPU_FLAG.I) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(z, this.nes.cpu.getFlag(CPU_FLAG.Z) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setFlagStyle(c, this.nes.cpu.getFlag(CPU_FLAG.C) !== 0x00, positiveColor, negativeColor, positiveWeight, negativeWeight);
        this.setDebugText(pc, ` $${this.hex(this.nes.cpu.pc[0], 4)} [${String(this.nes.cpu.pc)}]`);
        this.setDebugText(a, ` $${this.hex(this.nes.cpu.a[0], 2)}   [${String(this.nes.cpu.a)}]`);
        this.setDebugText(x, ` $${this.hex(this.nes.cpu.x[0], 2)}   [${String(this.nes.cpu.x[0])}]`);
        this.setDebugText(y, ` $${this.hex(this.nes.cpu.y[0], 2)}   [${String(this.nes.cpu.y)}]`);
        this.setDebugText(sp, ` $${this.hex(this.nes.cpu.stkp[0], 4)} [${String(this.nes.cpu.stkp)}]`);
        this.setDebugText(fps, ` ${fpsCount}`);
        this.setDebugText(cycles, ` ${this.nes.cpu.cycles}`);

        //console.log('Reg', this.nes.cpu.a, this.nes.cpu.x, this.nes.cpu.y);
    }

    drawCpu(x: number, y: number): void {
        const status = 'STATUS: ';
        
        this.drawString(x , y , 'STATUS:', WHITE);
        this.drawString(x  + 64, y, 'N', this.nes.cpu.status[0] & CPU_FLAG.N ? GREEN : RED);
        this.drawString(x  + 80, y , 'V', this.nes.cpu.status[0] & CPU_FLAG.V ? GREEN : RED);
        this.drawString(x  + 96, y , '-', this.nes.cpu.status[0] & CPU_FLAG.U ? GREEN : RED);
        this.drawString(x  + 112, y , 'B', this.nes.cpu.status[0] & CPU_FLAG.B ? GREEN : RED);
        this.drawString(x  + 128, y , 'D', this.nes.cpu.status[0] & CPU_FLAG.D ? GREEN : RED);
        this.drawString(x  + 144, y , 'I', this.nes.cpu.status[0] & CPU_FLAG.I ? GREEN : RED);
        this.drawString(x  + 160, y , 'Z', this.nes.cpu.status[0] & CPU_FLAG.Z ? GREEN : RED);
        this.drawString(x  + 178, y , 'C', this.nes.cpu.status[0] & CPU_FLAG.C ? GREEN : RED);
        this.drawString(x , y + 10, 'PC: $' + this.hex(this.nes.cpu.pc[0], 4));
        this.drawString(x , y + 20, 'A: $' +  this.hex(this.nes.cpu.a[0], 2) + '  [' + String(this.nes.cpu.a) + ']');
        this.drawString(x , y + 30, 'X: $' +  this.hex(this.nes.cpu.x[0], 2) + '  [' + String(this.nes.cpu.x[0]) + ']');
        this.drawString(x , y + 40, 'Y: $' +  this.hex(this.nes.cpu.y[0], 2) + '  [' + String(this.nes.cpu.y) + ']');
        this.drawString(x , y + 50, 'Stack P: $' + this.hex(this.nes.cpu.stkp[0], 4));
    }

    drawCode(x: number, y: number, lines: number): void {
        let currentPCPosition = this.nes.cpu.pc[0];
        let it_a = this.mapAsm[this.nes.cpu.pc[0]];
        //if (drawCount >= 5 && drawCount < 6) console.log('Map:', this.mapAsm, it_a);
        //if (!it_a) { /* console.log('D Code IT_A', it_a, this.nes.cpu.pc, this.mapAsm); */ return; }
		let nLineY = (lines >> 1) * 10 + y;
        let mapAsmEnd = Object.keys(this.mapAsm).length;

		if (currentPCPosition !== mapAsmEnd) {
			this.drawString(x, nLineY, it_a, CYAN);
			while (nLineY < (lines * 10) + y) {
				nLineY += 10;
				if (++currentPCPosition !== mapAsmEnd) {
					this.drawString(x, nLineY, this.mapAsm[currentPCPosition]);
				}
			}
		}

		currentPCPosition = this.nes.cpu.pc[0];
        it_a = this.mapAsm[this.nes.cpu.pc[0]];
		nLineY = (lines >> 1) * 10 + y;
		
        if (currentPCPosition !== mapAsmEnd) {
			while (nLineY > y) {
				nLineY -= 10;
				if (--currentPCPosition !== mapAsmEnd) {
					this.drawString(x, nLineY, this.mapAsm[currentPCPosition]);
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

    simpleRomSetup() {
        const buffer = new Uint8Array(48);
        const instructions = 'A2 0A 8E 00 00 A2 03 8E 01 00 AC 00 00 A9 00 18 6D 01 00 88 D0 FA 8D 02 00 EA EA EA';
        let offset = 0x8000;

        this.addHeader(buffer);

        instructions.split(' ').map((instr, i) => {
            const byte = Number(`0x${instr}`);
            this.nes.cpuRam[offset++] = byte;
            buffer[16 + i] = byte;
        });

        this.nes.cpuRam[0xfffc] = 0x00;
        this.nes.cpuRam[0xfffd] = 0x80;

        //this.mapAsm = this.nes.cpu.disassemble(0x0000, 0xffff);
        //this.nes.cpu.reset();
        this.cartridge = new Cartridge(buffer);
        this.nes.insertCartridge(this.cartridge);
        this.mapAsm = this.nes.cpu.disassemble(0x0000, 0xffff);
        this.nes.cpu.reset();
    }

    addHeader(buffer: Uint8Array) {
        buffer.set([ 0x4E, 0x45, 0x53, 0x1A, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ], 0);
    }

    updateController() {
        this.nes.controller[0] = packNesButtons({
            a: this.getKey(Key.X).bHeld,
            b: this.getKey(Key.Z).bHeld,
            select: this.getKey(Key.A).bHeld,
            start: this.getKey(Key.S).bHeld,
            up: this.getKey(Key.UP).bHeld,
            down: this.getKey(Key.DOWN).bHeld,
            left: this.getKey(Key.LEFT).bHeld,
            right: this.getKey(Key.RIGHT).bHeld,
        });
        this.nes.controller[1] = 0x00;

        if (this.getKey(Key.SPACE).bPressed) this.emulationRun = !this.emulationRun;
        if (this.getKey(Key.R).bPressed) this.nes.reset();
        if (this.getKey(Key.P).bPressed) this.selectedPalette = (++this.selectedPalette) & 0x07;

        const pads = typeof navigator !== 'undefined' && navigator.getGamepads
            ? connectedGamepads(navigator.getGamepads())
            : [];

        if (pads[0]) this.nes.controller[0] |= nesButtonsFromGamepad(pads[0]);
        this.nes.controller[0] = clearOpposingDirections(this.nes.controller[0]);
        if (pads[1]) this.nes.controller[1] = nesButtonsFromGamepad(pads[1]);

        this.consumeKeyEdges();
    }

    getControllerState() {
        const pads = typeof navigator !== 'undefined' && navigator.getGamepads
            ? connectedGamepads(navigator.getGamepads())
            : [];
        return pads[0] ? nesButtonsFromGamepad(pads[0]) : 0;
    }

    async setSpecialRenderable() {
        const c = document.createElement('canvas');
        const cxt = c.getContext('2d')!;
        const i = new Image();
        i.src = head;

        await i.decode();            
        c.width = i.width;
        c.height = i.height;
            
        cxt.drawImage(i, 0, 0);
            
        const data = cxt.getImageData(0, 0, i.width, i.height);
        //console.log('ImageData', data);

        const d = await createImageBitmap(data);
        //this.specialRenderable = new ImageWebGPURenderable(d, 0);
        this.specialRenderable = new ImageWebGPURenderable(d, 0);
        //this.specialRenderable = new ImageWebGPURenderable(d, 0);
    }

    connectGamepad(gamepad: Gamepad) {
        this.gamepad = gamepad
    }

    disconnectGamepad() {
        this.gamepad = <Gamepad><unknown>undefined;
    }

    setupButton() {
        const step = document.getElementById('step');
        if (step) {
            step.addEventListener('click', () => {
                do { this.nes.clock(); } while (!this.nes.cpu.complete());
                do { this.nes.clock(); } while (this.nes.cpu.complete());
                drawCount++;
            });
        }

        this.bindHoldButton('L', 'ArrowLeft');
        this.bindHoldButton('U', 'ArrowUp');
        this.bindHoldButton('R', 'ArrowRight');
        this.bindHoldButton('D', 'ArrowDown');
        this.bindHoldButton('select', 'a');
        this.bindHoldButton('start', 's');
        this.bindHoldButton('_b', 'z');
        this.bindHoldButton('_a', 'x');
    }

    private setDebugText(el: HTMLElement | null, value: string): void {
        if (el && el.textContent !== value) el.textContent = value;
    }

    private setFlagStyle(el: HTMLElement | null, on: boolean, positiveColor: string, negativeColor: string, positiveWeight: string, negativeWeight: string): void {
        if (!el) return;
        const color = on ? positiveColor : negativeColor;
        const weight = on ? positiveWeight : negativeWeight;
        if (el.style.color !== color) el.style.color = color;
        if (el.style.fontWeight !== weight) el.style.fontWeight = weight;
    }

    private bindHoldButton(id: string, key: string): void {
        const el = document.getElementById(id);
        if (!el) return;

        const press = (e: PointerEvent) => {
            e.preventDefault();
            el.setPointerCapture(e.pointerId);
            this.setKeyboardState(key, { bHeld: true, bPressed: true, bReleased: false });
        };
        const release = (e: PointerEvent) => {
            e.preventDefault();
            this.setKeyboardState(key, { bHeld: false, bPressed: false, bReleased: true });
        };

        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
    }
}
