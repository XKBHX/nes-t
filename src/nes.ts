import { Bus } from './bus';
import { Cartridge } from './cartridge';
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
        //console.log('User Update', elapsedTime);
        this.clear(DARK_BLUE);

        //if(this.specialRenderable) {
        //    (<WebGPURenderer>renderer).drawImages(this.specialRenderable);
        //}

        // TODO Controller stuff
        this.updateController()

        this.renderDebugger()
        if (this.emulationRun) this.executeEmulation(elapsedTime);
        else this.executeDebugEmulation(elapsedTime);

        const swatchSize = 6;
        //const { width, height } = screenSprite;
        
        this.drawCpu(516, 2);

        //for (let c = 0; c < 26; c++) {
        //    const s = `${this.hex(c, 2)}: (${this.nes.ppu.OAM[c].x}, ${this.nes.ppu.OAM[c].y}) ID: ${this.hex(this.nes.ppu.OAM[c].id, 2)} AT: ${this.hex(this.nes.ppu.OAM[c].attribute, 2)}`;
        //    this.drawString(516, 72 + c * 10, s);
        //}

        //this.drawString(516, 72, `${this.hex(0, 2)}: (${JSON.stringify(this.nes.ppu.OAM[0].x)}, ${this.nes.ppu.OAM[0].y}) ID: ${this.hex(this.nes.ppu.OAM[0].id, 2)} AT: ${this.hex(this.nes.ppu.OAM[0].attribute, 2)}`)
        //this.drawString(516, 82, this.nes.ppu.OAM.length.toString());

        for (let p = 0; p < 8; p++)
        for (let s = 0; s < 4; s++)
        this.fillRect(516 + p * (swatchSize * 5) + s * swatchSize, 340,
        swatchSize, swatchSize, this.nes.ppu.getColorFromPaletteRam(p, s));
        
		this.drawRect(516 + this.selectedPalette * (swatchSize * 5) - 1, 339, (swatchSize * 4), swatchSize, WHITE);
        
		const pt1 = this.nes.ppu.getPatternTable(0, this.selectedPalette);
		const pt2 = this.nes.ppu.getPatternTable(1, this.selectedPalette);
        this.drawSprite(516, 348, pt1);
		this.drawSprite(648, 348, pt2);
		this.drawSprite(648, 348, this.nes.ppu.getNameTable(0));
        const s = Sprite.createSpriteFromDimensions(16, 4);
        s.colData = (<any>this.nes.ppu).palScreen;
        const screenSprite = this.nes.ppu.getScreen();
		this.drawSprite(0, 0, screenSprite, 2);
        //this.drawRam(2, 2, 0x0000, 16, 16);
        //this.drawRam(2, 182, 0x8000, 16, 16);
        //this.drawSprite(0, 0, s, 20);
        //this.drawCode(516, 72, 26);

        //const pattern = this.nes.ppu.getPatternTable(1, this.selectedPalette);
        //for (let y = 0; y < 30; y++)
        //    for (let x = 0; x < 32; x++) {
        //        const id = (<any>this.nes.ppu).tblName[0][y * 32 + x];
        //        this.drawPartialSprite(x * 16, y * 16, pattern, (id & 0x0f) << 3, ((id >> 4) & 0x0f) << 3, 8, 8, 2, 0);
        //    }

        this.clockCount++;
        //const pos = this.getWindowMouse();
        //console.log('Pos', pos);
        //this.clear(VERY_DARK_BLUE);
        //(<WebGPURenderer>renderer).drawImage(this.sprite, new VF2D(2, 2), new VF2D(pos.x, pos.y), this.imageFile);
        //(<WebGPURenderer>renderer).drawImage(this.sprite, new VF2D(1, 1), new VF2D(500, 500), this.imageFile);
        //this.drawDecal(pos, this.decal, new VF2D(0.1, 0.1), RED);
        //this.drawSprite(pos.x, pos.y, this.sprite);
        //if (count < 3) console.log('Decal', this.decal);

        //const renderables = [ new ImageWebGPURenderable(this.imageFile, 0), new ImageWebGPURenderable(this.imageFile, 1)];
        //(<WebGPURenderer>renderer).drawImages(...renderables);
        //console.log('Spritedddd', this.sprite);
        
        if (elapsedTime < 50) console.log('Screen Sprite', screenSprite, elapsedTime, performance.now());
        if (!this.screenRenderable) ImageWebGPURenderable.createFromSprite(this.pDrawTarget, 0, [this.vScreenSize.x * this.vPixelSize.x, this.vScreenSize.y * this.vPixelSize.y]).then(r => this.screenRenderable = r)
        if (this.screenRenderable) { this.screenRenderable.updateImageFromSprite(this.pDrawTarget); (<WebGPURenderer>renderer).drawImages(this.screenRenderable); }
        //ImageWebGPURenderable.createFromSprite(this.pDrawTarget, 0, [1560, 960]).then(r => (<WebGPURenderer>renderer).drawImages(r));
        //setTimeout(console.log, 3000);
        
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
        const negativeWeight = 'normal';
    
        //console.log(this.currentTime);
    
        if (n && this.nes.cpu.getFlag(CPU_FLAG.N) !== 0x00) {
            n.style.fontWeight = positiveWeight;
            n.style.color = positiveColor;
        } else if(n) { n.style.fontWeight = negativeWeight; n.style.color = negativeColor; }
        if (v && this.nes.cpu.getFlag(CPU_FLAG.V) !== 0x00) {
            v.style.fontWeight = positiveWeight;
            v.style.color = positiveColor;
        } else if(v) { v.style.fontWeight = negativeWeight; v.style.color = negativeColor; }
        if (u && this.nes.cpu.getFlag(CPU_FLAG.U) !== 0x00) {
            u.style.fontWeight = positiveWeight;
            u.style.color = positiveColor;
        } else if(u) { u.style.fontWeight = negativeWeight; u.style.color = negativeColor; }
        if (b && this.nes.cpu.getFlag(CPU_FLAG.B) !== 0x00) {
            b.style.fontWeight = positiveWeight;
            b.style.color = positiveColor;
        } else if(b) { b.style.fontWeight = negativeWeight; b.style.color = negativeColor; }
        if (d && this.nes.cpu.getFlag(CPU_FLAG.D) !== 0x00) {
            d.style.fontWeight = positiveWeight;
            d.style.color = positiveColor;
        } else if(d) { d.style.fontWeight = negativeWeight; d.style.color = negativeColor; }
        if (i && this.nes.cpu.getFlag(CPU_FLAG.I) !== 0x00) {
            i.style.fontWeight = positiveWeight;
            i.style.color = positiveColor;
        } else if(i) { i.style.fontWeight = negativeWeight; i.style.color = negativeColor; }
        if (z && this.nes.cpu.getFlag(CPU_FLAG.Z) !== 0x00) {
            z.style.fontWeight = positiveWeight;
            z.style.color = positiveColor;
        } else if(z) { z.style.fontWeight = negativeWeight; z.style.color = negativeColor; }
        if (c && this.nes.cpu.getFlag(CPU_FLAG.C) !== 0x00) {
            c.style.fontWeight = positiveWeight;
            c.style.color = positiveColor;
        } else if(c) { c.style.fontWeight = negativeWeight; c.style.color = negativeColor; }
        if (pc) { pc.innerHTML = ` $${this.hex(this.nes.cpu.pc[0], 4)} [${String(this.nes.cpu.pc)}]`; }
        if (a) { a.innerHTML = ` $${this.hex(this.nes.cpu.a[0], 2)}   [${String(this.nes.cpu.a)}]`; }
        if (x) { x.innerHTML = ` $${this.hex(this.nes.cpu.x[0], 2)}   [${String(this.nes.cpu.x[0])}]`; }
        if (y) { y.innerHTML = ` $${this.hex(this.nes.cpu.y[0], 2)}   [${String(this.nes.cpu.y)}]`; }
        if (sp) { sp.innerHTML = ` $${this.hex(this.nes.cpu.stkp[0], 4)} [${String(this.nes.cpu.stkp)}]`; }
        if (fps) { fps.innerHTML = ` ${fpsCount}` }
        if (cycles) { cycles.innerHTML = ` ${this.nes.cpu.cycles}` }

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
        this.nes.controller[0] = 0x00;
		this.nes.controller[0] |= this.getKey(Key.X).bHeld ? 0x80 : 0x00;     // A Button
		this.nes.controller[0] |= this.getKey(Key.Z).bHeld ? 0x40 : 0x00;     // B Button
		this.nes.controller[0] |= this.getKey(Key.A).bHeld ? 0x20 : 0x00;     // Select
		this.nes.controller[0] |= this.getKey(Key.S).bHeld ? 0x10 : 0x00;     // Start
		this.nes.controller[0] |= this.getKey(Key.UP).bHeld ? 0x08 : 0x00;
		this.nes.controller[0] |= this.getKey(Key.DOWN).bHeld ? 0x04 : 0x00;
		this.nes.controller[0] |= this.getKey(Key.LEFT).bHeld ? 0x02 : 0x00;
		this.nes.controller[0] |= this.getKey(Key.RIGHT).bHeld ? 0x01 : 0x00;

        if (this.getKey(Key.SPACE).bPressed) this.emulationRun = !this.emulationRun;
		if (this.getKey(Key.R).bPressed) this.nes.reset();
		if (this.getKey(Key.P).bPressed) this.selectedPalette = (++this.selectedPalette) & 0x07;

        if (this.gamepad && this.gamepad.connected) {
            this.nes.controller[0] |= this.getControllerState();
        }
        if (this.nes.controller[0]) console.log({ c: this.nes.controller[0] });
    }

    getControllerState() {
        const state = new Uint8Array(1);
        const gamepad = navigator.getGamepads()[0]!;

        state[0] |= gamepad.buttons[1].pressed ? 0x00 : 0x00;
        state[0] |= gamepad.buttons[2].pressed ? 0x01 : 0x00;
        state[0] |= gamepad.buttons[8].pressed ? 0x02 : 0x00;
        state[0] |= gamepad.buttons[9].pressed ? 0x03 : 0x00;
        state[0] |= gamepad.buttons[12].pressed ? 0x04 : 0x00;
        state[0] |= gamepad.buttons[13].pressed ? 0x05 : 0x00;
        state[0] |= gamepad.buttons[14].pressed ? 0x06 : 0x00;
        state[0] |= gamepad.buttons[15].pressed ? 0x07 : 0x00;

        //console.log(this.gamepad.buttons.filter(b => b.pressed));
        if (gamepad.buttons[0].pressed) this.selectedPalette = (++this.selectedPalette) & 0x07;

        return state[0];
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
        const b = <HTMLButtonElement>document.getElementById('step')!;
        const l = <HTMLButtonElement>document.getElementById('L')!;
        const u = <HTMLButtonElement>document.getElementById('U')!;
        const r = <HTMLButtonElement>document.getElementById('R')!;
        const d = <HTMLButtonElement>document.getElementById('D')!;
        const select = <HTMLButtonElement>document.getElementById('select')!;
        const start = <HTMLButtonElement>document.getElementById('start')!;
        const _b = <HTMLButtonElement>document.getElementById('_b')!;
        const _a = <HTMLButtonElement>document.getElementById('_a')!;

        if (!this.emulationRun) {
            b.addEventListener('click', e => {
                do { this.nes.clock(); } while (!this.nes.cpu.complete());
			    do { this.nes.clock(); } while (this.nes.cpu.complete());
                drawCount++;
                console.log('Controller State:', (<any>this.nes).controllerState);
            });
        }

        l.addEventListener('click', e => { this.setKeyboardState('ArrowLeft', { bHeld: true, bPressed: true, bReleased: false }); });
        u.addEventListener('click', e => { this.setKeyboardState('ArrowUp', { bHeld: true, bPressed: true, bReleased: false }); });
        r.addEventListener('click', e => { this.setKeyboardState('ArrowRight', { bHeld: true, bPressed: true, bReleased: false }); });
        d.addEventListener('click', e => { this.setKeyboardState('ArrowDown', { bHeld: true, bPressed: true, bReleased: false }); });
        select.addEventListener('click', e => { this.setKeyboardState('a', { bHeld: true, bPressed: true, bReleased: false }); });
        start.addEventListener('click', e => { this.setKeyboardState('s', { bHeld: true, bPressed: true, bReleased: false }); });
        _b.addEventListener('click', e => { this.setKeyboardState('z', { bHeld: true, bPressed: true, bReleased: false }); });
        _a.addEventListener('click', e => { this.setKeyboardState('x', { bHeld: true, bPressed: true, bReleased: false }); });
    }
}
