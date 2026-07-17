import { HWButton, Key, RCode } from './index';
import { Decal, DecalInstance, DecalMode, DecalStructure } from './decal';
import { BLACK, Pixel, PixelMode, WHITE } from './pixel';
import { mapKeys, renderer, platform } from './platform';
import { createDefaultLayerDesc, LayerDesc, VF2D, VI2D } from './render';
import { SpriteMode, Sprite, Flip } from './sprite';
import { nMouseButtons } from './mouse';

let count = 5;
let now= Date.now();
const nDefaultAlpha = 0xFF;
const nTabSizeInSpaces = 4;
const nDefaultPixel = nDefaultAlpha << 24;
export abstract class GameEngine {
    sAppName: string;
    pDrawTarget: Sprite = new Sprite();
	nPixelMode:PixelMode = PixelMode.NORMAL;
	fBlendFactor: number = 1.0;
	vScreenSize: VI2D = new VI2D(256, 240);
	vInvScreenSize: VF2D = new VF2D(1.0 / 256.0, 1.0 / 240.0);
	vPixelSize: VI2D = new VI2D(4, 4);
	vScreenPixelSize: VI2D = new VI2D(4, 4);
	vMousePos: VI2D = new VI2D(0, 0);
	nMouseWheelDelta:Uint32Array[0] = 0;
	vMousePosCache: VI2D = new VI2D(0, 0);
	vMouseWindowPos: VI2D = new VI2D(0, 0);
	nMouseWheelDeltaCache:Uint32Array[0] = 0;
	vWindowSize: VI2D = new VI2D(0, 0);
	vViewPos: VI2D = new VI2D(0, 0);
	vViewSize: VI2D = new VI2D(0,0);
	bFullScreen: boolean = false;
	vPixel: VF2D = new VF2D(1.0, 1.0);
	bHasInputFocus: boolean = false;
	bHasMouseFocus: boolean = false;
	bEnableVSYNC: boolean = false;
	fFrameTimer: number = 1.0;
	fLastElapsed: number = 0.0;
	nFrameCount: number = 0;
	fontSprite: Sprite = <Sprite><unknown>undefined;
	fontDecal: Decal = <Decal><unknown>undefined;
	vLayers: LayerDesc[] = [];
	nTargetLayer: Uint8Array[0] = 0;
	nLastFPS: Uint32Array[0] = 0;
	bPixelCohesion: boolean = false;
	nDecalMode: DecalMode = DecalMode.NORMAL;
	nDecalStructure: DecalStructure = DecalStructure.FAN;
    vExtensions: GameEngineExtension[] = [];
	funcPixelMode = (x: number, y: number, p1: Pixel, p2: Pixel): Pixel => { return p2; };
	m_tp1: number = 0;
	m_tp2: number = 0;
	vFontSpacing: VI2D[] = [];

	// State of keyboard		
	pKeyNewState: HWButton[];
	pKeyOldState: HWButton[];
	pKeyboardState: HWButton[];

	// State of mouse
	pMouseNewState: HWButton[];
	pMouseOldState: HWButton[];
	pMouseState: HWButton[];

	// If anything sets this flag to false, the engine
	// "should" shut down gracefully
	bAtomActive: boolean = false;
    
    constructor() {
        this.sAppName = 'Undefined';
        GameEngineExtension.gameEngine = this;

		// State of keyboard
		this.pKeyNewState = [];
		this.pKeyOldState = [];
		this.pKeyboardState = [];

		for (let i = 0; i < 256; i ++) {
			this.pKeyNewState.push(Object.create({ bPressed: false, bReleased: false, bHeld: false }));
			this.pKeyOldState.push(Object.create({ bPressed: false, bReleased: false, bHeld: false }));
			this.pKeyboardState.push(Object.create({ bPressed: false, bReleased: false, bHeld: false }));
		}

		// State of mouse
		this.pMouseNewState = [];
		this.pMouseOldState = [];
		this.pMouseState = [];

		for (let index = 0; index < nMouseButtons; index++) {	
			this.pMouseNewState.push(Object.create({ bPressed: false, bReleased: false, bHeld: false }));
			this.pMouseOldState.push(Object.create({ bPressed: false, bReleased: false, bHeld: false }));
			this.pMouseState.push(Object.create({ bPressed: false, bReleased: false, bHeld: false }));
		}

        this.configureSystem();
    }

    static getKeyMap() { return mapKeys; }

    construct(
        screenWidth: number, screenHeight: number,
        pixelWidth: number, pixelHeight: number,
        fullScreen: boolean = false,
		vsync: boolean = false,
		cohesion: boolean = false): RCode {
        this.bPixelCohesion = cohesion;
        this.vScreenSize = new VI2D(screenWidth, screenHeight);
        this.vInvScreenSize = new VF2D(1.0 / screenWidth, 1.0 / screenHeight);
        this.vPixelSize = new VI2D(pixelWidth, pixelHeight);
        this.vWindowSize = this.vScreenSize.multi(this.vPixelSize);
        this.bFullScreen = fullScreen;
        this.bEnableVSYNC = vsync;
        this.vPixel = this.vScreenSize.scalarDiv(2.0);
    
        if (this.vPixelSize.x <= 0 || this.vPixelSize.y <= 0 || this.vScreenSize.x <= 0 || this.vScreenSize.y <= 0)
            return RCode.FAIL;
        return RCode.OK;
    }

    async start(): Promise<RCode> {
        if (platform.applicationStartUp() !== RCode.OK) return RCode.FAIL;

		// Construct the window
		if (platform.createWindowPane(new VI2D(30,30), this.vWindowSize, this.bFullScreen) !== RCode.OK) return RCode.FAIL;
		this.updateWindowSize(this.vWindowSize.x, this.vWindowSize.y);

		// Start the thread
		this.bAtomActive = true;
		await this.engineThread();

		// Some implementations may form an event loop here
		platform.startSystemEventLoop();

		// Wait for thread to be exited
		//if (platform.applicationCleanUp() !== RCode.OK) return RCode.FAIL;
		console.log('End of Start');
		return RCode.OK;
    }
    
    abstract onUserCreate(): boolean
    abstract onUserUpdate(elapsedTime: number): boolean
    abstract onUserDestroy(): boolean
    abstract configureSystem(): void 

    async engineThread() {
        if (platform.threadStartUp() === RCode.FAIL)	return;

		this.prepareEngine();

		// Create user resources as part of this thread
		for (const ext of this.vExtensions) ext.onBeforeUserCreate();
		if (!this.onUserCreate()) this.bAtomActive = false;
		for (const ext of this.vExtensions) ext.onAfterUserCreate();

		//while (this.bAtomActive) {
		//	// Run as fast as possible
		//	console.log('Delta Time', Date.now() - now);
		//	if ((Date.now() - now) > 10 * 1000) this.bAtomActive = false;
		//	while (this.bAtomActive) { await this.coreUpdate(); }
//
		//	// Allow the user to free resources if they have overrided the destroy function
		//	if (!this.onUserDestroy()) {
		//		// User denied destroy for some reason, so continue running
		//		this.bAtomActive = true;
		//	}
		//}

		this.coreUpdate();

		//platform.threadCleanUp();
    }

    isFocused(): boolean { return this.bHasInputFocus; }
    getKey(k: Key): HWButton { return this.pKeyboardState[k]; }
    getMouse(b: Uint32Array[0]): HWButton { return this.pMouseState[b]; }
    getMouseX(): number { return this.vMousePos.x; }
    getMouseY(): number { return this.vMousePos.y; }
    getMouseWheel(): number { return this.nMouseWheelDelta; }
    getWindowMouse(): VI2D { return this.vMouseWindowPos; }
    getMousePos(): VI2D { return this.vMousePos; }
    screenWidth(): number { return this.vScreenSize.x; }
    screenHeight(): number { return this.vScreenSize.y; }
    
    getDrawTargetWidth(): number {
		if (this.pDrawTarget)
			return this.pDrawTarget.width;
		else
			return 0;
    }
    
    getDrawTargetHeight(): number {
        if (this.pDrawTarget)
			return this.pDrawTarget.height;
		else
			return 0;
    }
    
    getDrawTarget(): Sprite { return this.pDrawTarget; }

    setScreenSize(w: number, h: number): void {
        this.vScreenSize = new VI2D(w, h);
		this.vInvScreenSize = new VF2D(1.0 / w, 1.0 / h);
		for (const layer of this.vLayers) {
			layer.drawTarget.create(this.vScreenSize.x, this.vScreenSize.y);
			layer.update = true;
		}
		this.setDrawTarget();
		renderer.clearBuffer(BLACK, true);
		renderer.displayFrame();
		renderer.clearBuffer(BLACK, true);
		renderer.updateViewport(this.vViewPos, this.vViewSize);
    }

    setDrawTarget(target?: Sprite): void {
        console.log('SetDrawTarget', target);
		if (target) {
			this.pDrawTarget = target;
		} else {
			this.nTargetLayer = 0;
			this.pDrawTarget = this.vLayers[0].drawTarget.sprite();
			console.log('SetDrawTarget Layer', this.vLayers[0].drawTarget.sprite());
		}
    }

    getFPS(): Uint32Array[0] { return this.nLastFPS; }
    getElapsedTime(): number { return this.fLastElapsed; }
    getWindowSize(): VI2D { return this.vWindowSize; }
    getPixelSize(): VI2D { return this.vPixelSize; }
    getScreenPixelSize(): VI2D { return this.vScreenPixelSize; }

    setDrawTargetByLayer(layer: Uint8Array[0]): void {
        if (layer < this.vLayers.length) {
			this.pDrawTarget = this.vLayers[layer].drawTarget.sprite();
			this.vLayers[layer].update = true;
			this.nTargetLayer = layer;
		}
    }

    enableLayer(layer: Uint8Array[0], b: boolean): void {
        if (layer < this.vLayers.length) this.vLayers[layer].show = b;
    }

    setLayerOffsetByVF2D(layer: Uint8Array[0], offset:VF2D): void {
        this.setLayerOffset(layer, offset.x, offset.y);
    }

    setLayerOffset(layer: Uint8Array[0], x: number, y: number): void {
        if (layer < this.vLayers.length) this.vLayers[layer].offset = new VF2D(x, y);
    }

    setLayerScaleByVF2D(layer: Uint8Array[0], scale:VF2D): void {
        this.setLayerScale(layer, scale.x, scale.y);
    }

    setLayerScale(layer: Uint8Array[0], x: number, y: number): void {
        if (layer < this.vLayers.length) this.vLayers[layer].offset = new VF2D(x, y);
    }

    setLayerTint(layer: Uint8Array[0], tint: Pixel): void {
        if (layer < this.vLayers.length) this.vLayers[layer].tint = tint;
    }

    setLayerCustomRenderFunction(layer: Uint8Array[0], f: () => void): void {
        if (layer < this.vLayers.length) this.vLayers[layer].funcHook = f;
    }

    getLayers(): LayerDesc[] { return this.vLayers; }
    
    createLayer(): Uint32Array[0] {
        let ld: LayerDesc = createDefaultLayerDesc();

		ld.drawTarget.create(this.vScreenSize.x, this.vScreenSize.y);
		ld.scale.x = this.vScreenSize.y / this.vScreenSize.x;
		this.vLayers.push(ld);
		return this.vLayers.length - 1;
    }
    
    setPixelMode(m: PixelMode): void { this.nPixelMode = m; }
    
    getPixelMode(): PixelMode { return this.nPixelMode; }
    
    setPixelModeByCallback(pixelModeCallback: (x: number, y: number, source: Pixel, dest: Pixel) => Pixel): void {
        this.funcPixelMode = pixelModeCallback;
		this.nPixelMode = PixelMode.CUSTOM;
    }
    
    setPixelBlend(blend: number): void {
        this.fBlendFactor = blend;
		if (this.fBlendFactor < 0.0) this.fBlendFactor = 0.0;
		if (this.fBlendFactor > 1.0) this.fBlendFactor = 1.0;
    }
    
    draw(x: number, y: number, p: Pixel = WHITE): boolean {
        //console.log('GE::draw()/Draw Target', this.pDrawTarget);
		if (!this.pDrawTarget) return false;

		if (this.nPixelMode === PixelMode.NORMAL) {
			return this.pDrawTarget.setPixel(x, y, p);
		}

		if (this.nPixelMode === PixelMode.MASK) {
			if (p.alpha === 255)
				return this.pDrawTarget.setPixel(x, y, p);
		}

		if (this.nPixelMode === PixelMode.ALPHA) {
			const d = this.pDrawTarget.getPixel(x, y);
			const a = (p.alpha / 255.0) * this.fBlendFactor;
			const c = 1.0 - a;
			const r = a * p.red + c * d.red;
			const g = a * p.green + c * d.green;
			const b = a * p.blue + c * d.blue;
			return this.pDrawTarget.setPixel(x, y, new Pixel(r, g, b));
		}

		if (this.nPixelMode === PixelMode.CUSTOM) {
			return this.pDrawTarget.setPixel(x, y, this.funcPixelMode(x, y, p, this.pDrawTarget.getPixel(x, y)));
		}

		return false;
    }

    drawByVI2D(pos: VI2D, p: Pixel): boolean {
        return this.draw(pos.x, pos.y, p);
    }
    
    drawLine(x1: number, y1: number, x2: number, y2: number, p: Pixel = WHITE, pattern: Uint32Array[0] = 0xFFFFFFFF): void {
        let x, y, dx, dy, dx1, dy1, px, py, xe, ye, i;
		dx = x2 - x1; 
        dy = y2 - y1;

		const rol = () => { pattern = (pattern << 1) | (pattern >> 31); return pattern & 1; };

		const p1 = new VI2D(x1, y1), p2 = new VI2D(x2, y2);
		
		x1 = p1.x; y1 = p1.y;
		x2 = p2.x; y2 = p2.y;

		if (dx === 0) {
			if (y2 < y1) swap(y1, y2)
			
            for (y = y1; y <= y2; y++) if (rol()) this.draw(x1, y, p);
			return;
		}

		if (dy == 0) {
			if (x2 < x1) swap(x1, x2);
			for (x = x1; x <= x2; x++) if (rol()) this.draw(x, y1, p);
			return;
		}

		// Line is Funk-aye
		dx1 = Math.abs(dx);
        dy1 = Math.abs(dy);
		px = 2 * dy1 - dx1;	py = 2 * dx1 - dy1;
		
        if (dy1 <= dx1) {
			if (dx >= 0) {
				x = x1; y = y1; xe = x2;
			} else {
				x = x2; y = y2; xe = x1;
			}

			if (rol()) this.draw(x, y, p);

			for (i = 0; x < xe; i++) {
				x = x + 1;
				if (px < 0)
					px = px + 2 * dy1;
				else {
					if ((dx < 0 && dy < 0) || (dx > 0 && dy > 0)) y = y + 1; else y = y - 1;
					px = px + 2 * (dy1 - dx1);
				}
				
                if (rol()) this.draw(x, y, p);
			}
		} else {
			if (dy >= 0) {
				x = x1; y = y1; ye = y2;
			} else {
				x = x2; y = y2; ye = y1;
			}

			if (rol()) this.draw(x, y, p);

			for (i = 0; y < ye; i++) {
				y = y + 1;
				if (py <= 0)
					py = py + 2 * dx1;
				else {
					if ((dx < 0 && dy < 0) || (dx > 0 && dy > 0)) x = x + 1;
                    else x = x - 1;
					
                    py = py + 2 * (dx1 - dy1);
				}
				
                if (rol()) this.draw(x, y, p);
			}
		}
    }
    
    drawLineByVI2D(pos1: VI2D, pos2: VI2D, p: Pixel = WHITE, pattern: Uint32Array[0] = 0xFFFFFFFF): void {
        this.drawLine(pos1.x, pos1.y, pos2.x, pos2.y, p, pattern);
    }
    
    drawCircle(x: number, y: number, radius: number, p: Pixel = WHITE, mask: number = 0xFF) {
        if (radius < 0 || x < -radius || y < -radius || x - this.getDrawTargetWidth() > radius || y - this.getDrawTargetHeight() > radius)
			return;

		if (radius > 0)
		{
			let x0 = 0;
			let y0 = radius;
			let d = 3 - 2 * radius;

			while (y0 >= x0) {
				// Draw even octants
				if (mask & 0x01) this.draw(x + x0, y - y0, p);// Q6 - upper right right
				if (mask & 0x04) this.draw(x + y0, y + x0, p);// Q4 - lower lower right
				if (mask & 0x10) this.draw(x - x0, y + y0, p);// Q2 - lower left left
				if (mask & 0x40) this.draw(x - y0, y - x0, p);// Q0 - upper upper left
				if (x0 != 0 && x0 != y0) {
					if (mask & 0x02) this.draw(x + y0, y - x0, p);// Q7 - upper upper right
					if (mask & 0x08) this.draw(x + x0, y + y0, p);// Q5 - lower right right
					if (mask & 0x20) this.draw(x - y0, y + x0, p);// Q3 - lower lower left
					if (mask & 0x80) this.draw(x - x0, y - y0, p);// Q1 - upper left left
				}

				if (d < 0)
					d += 4 * x0++ + 6;
				else
					d += 4 * (x0++ - y0--) + 10;
			}
		}
		else
			this.draw(x, y, p);
    }
    
    drawCircleByVI2D(pos: VI2D, radius: number, p: Pixel = WHITE, mask: number = 0xFF) {
        this.drawCircle(pos.x, pos.y, radius, p, mask);
    }
    
    fillCircle(x: number, y: number, radius: number, p = WHITE) {
        if (radius < 0 || x < -radius || y < -radius || x - this.getDrawTargetWidth() > radius || y - this.getDrawTargetHeight() > radius)
			return;

		if (radius > 0) {
			let x0 = 0;
			let y0 = radius;
			let d = 3 - 2 * radius;

			const drawline = (sx: number, ex: number, y: number) => {
				for (let x = sx; x <= ex; x++)
					this.draw(x, y, p);
			};

			while (y0 >= x0) {
				drawline(x - y0, x + y0, y - x0);
				if (x0 > 0)	drawline(x - y0, x + y0, y + x0);

				if (d < 0)
					d += 4 * x0++ + 6;
				else {
					if (x0 != y0) {
						drawline(x - x0, x + x0, y - y0);
						drawline(x - x0, x + x0, y + y0);
					}
					d += 4 * (x0++ - y0--) + 10;
				}
			}
		}
		else
			this.draw(x, y, p);
    }
    
    fillCircleByVI2D(pos: VI2D, radius: number, p = WHITE) {
        this.fillCircle(pos.x, pos.y, radius, p);
    }

    fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, p: Pixel) {
		const drawline = (sx: number, ex: number, ny: number) => { for (let i = sx; i <= ex; i++) this.draw(i, ny, p); };

		let t1x: number, t2x: number, y: number, minx: number, maxx: number, t1xp: number, t2xp: number;
		let changed1 = false;
		let changed2 = false;
		let signx1: number, signx2: number, dx1: number, dy1: number, dx2: number, dy2: number;
		let e1: number, e2: number;

		if (y1 > y2) { swap(y1, y2); swap(x1, x2); }
		if (y1 > y3) { swap(y1, y3); swap(x1, x3); }
		if (y2 > y3) { swap(y2, y3); swap(x2, x3); }

		t1x = t2x = x1; y = y1;
		dx1 = x2 - x1;
		
		if (dx1 < 0) { dx1 = -dx1; signx1 = -1; }
		else signx1 = 1;
		
		dy1 = y2 - y1;
		dx2 = x3 - x1;
		
		if (dx2 < 0) { dx2 = -dx2; signx2 = -1; }
		else signx2 = 1;
		
		dy2 = y3 - y1;

		if (dy1 > dx1) { swap(dx1, dy1); changed1 = true; }
		if (dy2 > dx2) { swap(dy2, dx2); changed2 = true; }

		e2 = dx2 >> 1;

		const next2 = () => {
			if (minx > t1x) minx = t1x;
			if (minx > t2x) minx = t2x;
			if (maxx < t1x) maxx = t1x;
			if (maxx < t2x) maxx = t2x;
			
			drawline(minx, maxx, y);    // Draw line from min to max points found on the y
										// Now increase y
			if (!changed1) t1x += signx1;
			
			t1x += t1xp;
			
			if (!changed2) t2x += signx2;
			
			t2x += t2xp;
			y += 1;
		};
		const next1 = () => {
			while (1) {
				e2 += dy2;
				
				while (e2 >= dx2) {
					e2 -= dx2;
					if (changed2) t2xp = signx2;//t2x += signx2;
					else next2();
				}
				
				if (changed2)     break;
				else t2x += signx2;
			}
		};
		const next4 = () => {
			if (minx > t1x) minx = t1x;
			if (minx > t2x) minx = t2x;
			if (maxx < t1x) maxx = t1x;
			if (maxx < t2x) maxx = t2x;
			
			drawline(minx, maxx, y);
			
			if (!changed1) t1x += signx1;
			t1x += t1xp;
			
			if (!changed2) t2x += signx2;
			t2x += t2xp;
			y += 1;
		};
		const next3 = () => {
			while (t2x !== x3) {
				e2 += dy2;
				
				while (e2 >= dx2) {
					e2 -= dx2;
					if (changed2) t2xp = signx2;
					else next4();
				}
				
				if (changed2)     break;
				else              t2x += signx2;
			}
		};
		const next  = () => {
			dx1 = x3 - x2;
		
			if (dx1 < 0) { dx1 = -dx1; signx1 = -1; }
			else signx1 = 1;
			
			dy1 = y3 - y2;
			t1x = x2;

			if (dy1 > dx1) {
				swap(dy1, dx1);
				changed1 = true;
			} else changed1 = false;

			e1 = dx1 >> 1;

			for (let i = 0; i <= dx1; i++) {
				t1xp = 0; t2xp = 0;

				if (t1x < t2x) { minx = t1x; maxx = t2x; }
				else { minx = t2x; maxx = t1x; }

				while (i < dx1) {
					e1 += dy1;
					while (e1 >= dx1) {
						e1 -= dx1;
						if (changed1) { t1xp = signx1; break; }
						else next3();
					}

					if (changed1) break;
					else t1x += signx1;

					if (i < dx1) i++;
				}
				next3();
				next4();

				if (y > y3) return;
			}
		};
		
		if (y1 === y2) next();
		
		e1 = dx1 >> 1;

		for (let i = 0; i < dx1;) {
			t1xp = 0; t2xp = 0;
			
			if (t1x < t2x) { minx = t1x; maxx = t2x; }
			else { minx = t2x; maxx = t1x; }
			
			while (i < dx1) {
				i++;
				e1 += dy1;
				
				while (e1 >= dx1) {
					e1 -= dx1;
					if (changed1) t1xp = signx1;
					else next1();
				}
				
				if (changed1) break;
				else t1x += signx1;
			}
		next1:
			next1();
		next2:
			next2();
			
			if (y == y2) break;
		}
	next:
		next();
	}

    fillTriangleByVI2D(pos1: VI2D, pos2: VI2D, pos3: VI2D, p: Pixel) {
        this.fillTriangle(pos1.x, pos1.y, pos2.x, pos2.y, pos3.x, pos3.y, p);
    }
    
    drawSprite(x: number, y: number, sprite: Sprite, scale: number = 1, flip: number = 0) {
        if (!sprite)
			return;

		let fxs = 0, fxm = 1, fx = 0;
		let fys = 0, fym = 1, fy = 0;
		
        if (flip & Flip.HORIZ) { fxs = sprite.width - 1; fxm = -1; }
		if (flip & Flip.VERT) { fys = sprite.height - 1; fym = -1; }

		if (scale > 1) {
			fx = fxs;
			
            for (let i = 0; i < sprite.width; i++, fx += fxm) {
				fy = fys;
				
                for (let j = 0; j < sprite.height; j++, fy += fym)
					for (let is = 0; is < scale; is++)
						for (let js = 0; js < scale; js++)
							this.draw(x + (i * scale) + is, y + (j * scale) + js, sprite.getPixel(fx, fy));
			}
		} else {
			fx = fxs;
			
            for (let i = 0; i < sprite.width; i++, fx += fxm) {
				fy = fys;
				
                for (let j = 0; j < sprite.height; j++, fy += fym)
					this.draw(x + i, y + j, sprite.getPixel(fx, fy));
			}
		}
    }
    
    drawSpriteByVI2D(pos: VI2D, sprite: Sprite, scale: number = 1, flip: number = 0) {
        this.drawSprite(pos.x, pos.y, sprite, scale, flip);
    }
    
    drawPartialSprite(x: number, y: number, sprite: Sprite, ox: number, oy: number, w: number, h: number, scale: number = 1, flip: number) {
        if (!sprite)
			return;

		let fxs = 0, fxm = 1, fx = 0;
		let fys = 0, fym = 1, fy = 0;
		
        if (flip & Flip.HORIZ) { fxs = w - 1; fxm = -1; }
		if (flip & Flip.VERT) { fys = h - 1; fym = -1; }

		if (scale > 1) {
			fx = fxs;
			
            for (let i = 0; i < w; i++, fx += fxm) {
				fy = fys;
				for (let j = 0; j < h; j++, fy += fym)
					for (let is = 0; is < scale; is++)
						for (let js = 0; js < scale; js++)
							this.draw(x + (i * scale) + is, y + (j * scale) + js, sprite.getPixel(fx + ox, fy + oy));
			}
		} else {
			fx = fxs;
			
            for (let i = 0; i < w; i++, fx += fxm) {
				fy = fys;
				for (let j = 0; j < h; j++, fy += fym)
					this.draw(x + i, y + j, sprite.getPixel(fx + ox, fy + oy));
			}
		}
    }
    
    drawPartialSpriteByVI2D(pos: VI2D, sprite: Sprite, sourcepos: VI2D, size: VI2D, scale: number = 1, flip: number) {
        this.drawPartialSprite(pos.x, pos.y, sprite, sourcepos.x, sourcepos.y, size.x, size.y, scale, flip);
    }
    
    drawString(x: number, y: number, sText: string, col: Pixel = WHITE, scale: number = 1) {
        if (!sText) return;

		let sx = 0;
		let sy = 0;
		let m: PixelMode = this.nPixelMode;

		if (m !== PixelMode.CUSTOM) { 
			if (col.alpha !== 255) this.setPixelMode(PixelMode.ALPHA);
			else this.setPixelMode(PixelMode.MASK);
		}
		
        for (const c of sText) {
			if (c === '\n') {
				sx = 0; sy += 8 * scale;
			} else if (c === '\t') {
				sx += 8 * nTabSizeInSpaces * scale;
			} else {
				let ox = (c.charCodeAt(0) - 32) % 16;
				let oy = Math.floor((c.charCodeAt(0) - 32) / 16);

				if (scale > 1) {
					for (let i = 0; i < 8; i++)
						for (let j = 0; j < 8; j++)
							if (this.fontSprite.getPixel(i + ox * 8, j + oy * 8).red > 0)
								for (let is = 0; is < scale; is++)
									for (let js = 0; js < scale; js++)
										this.draw(x + sx + (i * scale) + is, y + sy + (j * scale) + js, col);
				} else {
					for (let i = 0; i < 8; i++)
						for (let j = 0; j < 8; j++)
							if (this.fontSprite.getPixel(i + ox * 8, j + oy * 8).red > 0)
								this.draw(x + sx + i, y + sy + j, col);
				}
				sx += 8 * scale;
			}
		}
		this.setPixelMode(m);
    }    
    
    drawStringByVI2D(pos: VI2D, sText: string, col: Pixel = WHITE, scale: number = 1) {
        this.drawString(pos.x, pos.y, sText, col, scale);
    }
    
    getTextSize(s: string): VI2D {
        const size = new VI2D(0, 1);
		const pos = new VI2D(0, 1);
		for (const c of s) {
			if (c == '\n') {
                pos.y++;
                pos.x = 0;
            } else if (c == '\t') { pos.x += nTabSizeInSpaces; }
			else pos.x++;
			
            size.x = Math.max(size.x, pos.x);
			size.y = Math.max(size.y, pos.y);
		}
		
        return size.scalarMulti(8);
    }
    
    drawStringProp(x: number, y: number, sText: string, col:Pixel = WHITE, scale: number = 1) {
        let sx = 0;
		let sy = 0;
		let m: PixelMode = this.nPixelMode;

		if (m != PixelMode.CUSTOM) {
			if (col.alpha !== 255) this.setPixelMode(PixelMode.ALPHA);
			else this.setPixelMode(PixelMode.MASK);
		}

		for (const c of sText) {
			if (c === '\n') {
				sx = 0; sy += 8 * scale;
			} else if (c === '\t') {
				sx += 8 * nTabSizeInSpaces * scale;
			} else {
				const ox = (c.charCodeAt(0) - 32) % 16;
				const oy = (c.charCodeAt(0) - 32) / 16;

				if (scale > 1)
				{
					for (let i = 0; i < this.vFontSpacing[c.charCodeAt(0) - 32].y; i++)
						for (let j = 0; j < 8; j++)
							if (this.fontSprite.getPixel(i + ox * 8 + this.vFontSpacing[c.charCodeAt(0) - 32].x, j + oy * 8).red > 0)
								for (let is = 0; is < scale; is++)
									for (let js = 0; js < scale; js++)
										this.draw(x + sx + (i * scale) + is, y + sy + (j * scale) + js, col);
				}
				else
				{
					for (let i = 0; i < this.vFontSpacing[c.charCodeAt(0) - 32].y; i++)
						for (let j = 0; j < 8; j++)
							if (this.fontSprite.getPixel(i + ox * 8 + this.vFontSpacing[c.charCodeAt(0) - 32].x, j + oy * 8).red > 0)
								this.draw(x + sx + i, y + sy + j, col);
				}
				sx += this.vFontSpacing[c.charCodeAt(0) - 32].y * scale;
			}
		}
		this.setPixelMode(m);
    }
    
    drawStringPropByVI2D(pos: VI2D, sText: string, col: Pixel = WHITE, scale: number = 1) {
        this.drawStringProp(pos.x, pos.y, sText, col, scale);
    }
    
    getTextSizeProp(s: string) {
        const size: VI2D = new VI2D(0, 1);
		const pos: VI2D = new VI2D(0, 1);
		
        for (const c of s) {
			if (c === '\n') {
                pos.y += 1;
                pos.x = 0;
            } else if (c === '\t') { pos.x += nTabSizeInSpaces * 8; }
			else pos.x += this.vFontSpacing[c.charCodeAt(0) - 32].y;
			
            size.x = Math.max(size.x, pos.x);
			size.y = Math.max(size.y, pos.y);
		}

		size.y *= 8;
		return size;
    }
    
    setDecalMode(mode: DecalMode) { this.nDecalMode = mode; }
    
    setDecalStructure(structure: DecalStructure) { this.nDecalStructure = structure; }
    
    drawDecal(pos: VF2D, decal: Decal, scale: VF2D = new VF2D(1.0,1.0), tint: Pixel = WHITE) {
        const vScreenSpacePos = new VF2D(
            (pos.x * this.vInvScreenSize.x) * 2.0 - 1.0,
			((pos.y * this.vInvScreenSize.y) * 2.0 - 1.0) * -1.0
		);

		const vScreenSpaceDim = new VF2D(
			vScreenSpacePos.x + (2.0 * (decal.sprite.width) * this.vInvScreenSize.x) * scale.x,
			vScreenSpacePos.y - (2.0 * (decal.sprite.height) * this.vInvScreenSize.y) * scale.y
        );

		let di: DecalInstance = <DecalInstance>{};
		di.decal = decal;
		di.points = 4;
		di.tint = [ tint, tint, tint, tint ];
		di.pos = [ new VF2D(vScreenSpacePos.x, vScreenSpacePos.y), new VF2D(vScreenSpacePos.x, vScreenSpaceDim.y), new VF2D(vScreenSpaceDim.x, vScreenSpaceDim.y), new VF2D(vScreenSpaceDim.x, vScreenSpacePos.y) ];
		di.uv = [ new VF2D(0.0, 0.0), new VF2D(0.0, 1.0), new VF2D(1.0, 1.0), new VF2D(1.0, 0.0) ];
		di.w = [ 1, 1, 1, 1 ];
		di.mode = this.nDecalMode;
		di.structure = this.nDecalStructure;
		
        this.vLayers[this.nTargetLayer].vecDecalInstance.push(di);
    }
    
    drawPartialDecal(pos: VF2D, decal: Decal, source_pos: VF2D, source_size: VF2D, scale: VF2D = new VF2D(1.0,1.0), tint: Pixel = WHITE) {
        const vScreenSpacePos = new VF2D(
			  (pos.x * this.vInvScreenSize.x) * 2.0 - 1.0,
			-((pos.y * this.vInvScreenSize.y) * 2.0 - 1.0)
        );

		
		const vScreenSpaceDim = new VF2D(
			  ((pos.x + source_size.x * scale.x) * this.vInvScreenSize.x) * 2.0 - 1.0,
			-(((pos.y + source_size.y * scale.y) * this.vInvScreenSize.y) * 2.0 - 1.0)
        );

		const vWindow = new VF2D(this.vViewSize.x, this.vViewSize.y);
		const vQuantisedPos = vScreenSpacePos.multi(vWindow).add(new VF2D(0.5, 0.5))/* .floor() */ .div(vWindow);
		const vQuantisedDim = vScreenSpaceDim.multi(vWindow).add(new VF2D(0.5, -0.5))/* .ceil() */ .div(vWindow);

		let di: DecalInstance = <DecalInstance>{};
		di.points = 4;
		di.decal = decal;
		di.tint = [ tint, tint, tint, tint ];
		di.pos = [ new VF2D(vQuantisedPos.x, vQuantisedPos.y), new VF2D(vQuantisedPos.x, vQuantisedDim.y), new VF2D(vQuantisedDim.x, vQuantisedDim.y), new VF2D(vQuantisedDim.x, vQuantisedPos.y) ];
		
		let uvtl: VF2D = source_pos.add(new VF2D(0.0001, 0.0001)).multi(decal.uvScale);
		let uvbr: VF2D = source_pos.add(source_size).sub(new VF2D(0.0001, 0.0001)).multi(decal.uvScale);
		
		di.uv = [ new VF2D(uvtl.x, uvtl.y), new VF2D(uvtl.x, uvbr.y), new VF2D(uvbr.x, uvbr.y), new VF2D(uvbr.x, uvtl.y) ];
		di.w = [ 1,1,1,1 ];
		di.mode = this.nDecalMode;
		di.structure = this.nDecalStructure;
		this.vLayers[this.nTargetLayer].vecDecalInstance.push(di);
    }
    
    //drawPartialDecal(const olc::vf2d& pos, const olc::vf2d& size, olc::Decal* decal, const olc::vf2d& source_pos, const olc::vf2d& source_size, const olc::Pixel& tint = olc::WHITE) {
    //    olc::vf2d vScreenSpacePos =
	//	{
	//		(pos.x * vInvScreenSize.x) * 2.0f - 1.0f,
	//		((pos.y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f
	//	};
//
	//	olc::vf2d vScreenSpaceDim =
	//	{
	//		vScreenSpacePos.x + (2.0f * size.x * vInvScreenSize.x),
	//		vScreenSpacePos.y - (2.0f * size.y * vInvScreenSize.y)
	//	};
//
	//	DecalInstance di;
	//	di.points = 4;
	//	di.decal = decal;
	//	di.tint = { tint, tint, tint, tint };
	//	di.pos = { { vScreenSpacePos.x, vScreenSpacePos.y }, { vScreenSpacePos.x, vScreenSpaceDim.y }, { vScreenSpaceDim.x, vScreenSpaceDim.y }, { vScreenSpaceDim.x, vScreenSpacePos.y } };
	//	olc::vf2d uvtl = (source_pos) * decal->vUVScale;
	//	olc::vf2d uvbr = uvtl + ((source_size) * decal->vUVScale);
	//	di.uv = { { uvtl.x, uvtl.y }, { uvtl.x, uvbr.y }, { uvbr.x, uvbr.y }, { uvbr.x, uvtl.y } };
	//	di.w = { 1,1,1,1 };
	//	di.mode = nDecalMode;
	//	di.structure = nDecalStructure;
	//	vLayers[nTargetLayer].vecDecalInstance.push_back(di);
    //}
    
    //drawExplicitDecal(olc::Decal* decal, const olc::vf2d* pos, const olc::vf2d* uv, const olc::Pixel* col, uint32_t elements = 4) {
    //    DecalInstance di;
	//	di.decal = decal;
	//	di.pos.resize(elements);
	//	di.uv.resize(elements);
	//	di.w.resize(elements);
	//	di.tint.resize(elements);
	//	di.points = elements;
	//	for (uint32_t i = 0; i < elements; i++)
	//	{
	//		di.pos[i] = { (pos[i].x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos[i].y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//		di.uv[i] = uv[i];
	//		di.tint[i] = col[i];
	//		di.w[i] = 1.0f;
	//	}
	//	di.mode = nDecalMode;
	//	di.structure = nDecalStructure;
	//	vLayers[nTargetLayer].vecDecalInstance.push_back(di);
    //}
    
    //drawWarpedDecal(olc::Decal* decal, const olc::vf2d(&pos)[4], const olc::Pixel& tint = olc::WHITE) {
    //    DecalInstance di;
	//	di.points = 4;
	//	di.decal = decal;
	//	di.tint = { tint, tint, tint, tint };
	//	di.w = { 1, 1, 1, 1 };
	//	di.pos.resize(4);
	//	di.uv = { { 0.0f, 0.0f}, {0.0f, 1.0f}, {1.0f, 1.0f}, {1.0f, 0.0f} };
	//	olc::vf2d center;
	//	float rd = ((pos[2].x - pos[0].x) * (pos[3].y - pos[1].y) - (pos[3].x - pos[1].x) * (pos[2].y - pos[0].y));
	//	if (rd != 0)
	//	{
	//		rd = 1.0f / rd;
	//		float rn = ((pos[3].x - pos[1].x) * (pos[0].y - pos[1].y) - (pos[3].y - pos[1].y) * (pos[0].x - pos[1].x)) * rd;
	//		float sn = ((pos[2].x - pos[0].x) * (pos[0].y - pos[1].y) - (pos[2].y - pos[0].y) * (pos[0].x - pos[1].x)) * rd;
	//		if (!(rn < 0.f || rn > 1.f || sn < 0.f || sn > 1.f)) center = pos[0] + rn * (pos[2] - pos[0]);
	//		float d[4];	for (int i = 0; i < 4; i++)	d[i] = (pos[i] - center).mag();
	//		for (int i = 0; i < 4; i++)
	//		{
	//			float q = d[i] == 0.0f ? 1.0f : (d[i] + d[(i + 2) & 3]) / d[(i + 2) & 3];
	//			di.uv[i] *= q; di.w[i] *= q;
	//			di.pos[i] = { (pos[i].x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos[i].y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//		}
	//		di.mode = nDecalMode;
	//		di.structure = nDecalStructure;
	//		vLayers[nTargetLayer].vecDecalInstance.push_back(di);
	//	}
    //}
    
    //drawPartialWarpedDecal(decal: Decal, pos: VF2D[], source_pos: VF2D, source_size: VF2D, tint = WHITE) {
    //    const di: DecalInstance = {};
	//	di.points = 4;
	//	di.decal = decal;
	//	di.tint = [ tint, tint, tint, tint ];
	//	di.w = [ 1, 1, 1, 1 ];
	//	di.pos.resize(4);
	//	di.uv = [ new VF2D(0.0, 0.0), new VF2D(0.0, 1.0), new VF2D(1.0, 1.0), new VF2D(1.0, 0.0) ];
	//	
    //    let center: VF2D;
	//	const rd = ((pos[2].x - pos[0].x) * (pos[3].y - pos[1].y) - (pos[3].x - pos[1].x) * (pos[2].y - pos[0].y));
	//	
    //    if (rd != 0) {
	//		olc::vf2d uvtl = source_pos * decal->vUVScale;
	//		olc::vf2d uvbr = uvtl + (source_size * decal->vUVScale);
	//		di.uv = { { uvtl.x, uvtl.y }, { uvtl.x, uvbr.y }, { uvbr.x, uvbr.y }, { uvbr.x, uvtl.y } };
//
	//		rd = 1.0 / rd;
	//		
    //        float rn = ((pos[3].x - pos[1].x) * (pos[0].y - pos[1].y) - (pos[3].y - pos[1].y) * (pos[0].x - pos[1].x)) * rd;
	//		float sn = ((pos[2].x - pos[0].x) * (pos[0].y - pos[1].y) - (pos[2].y - pos[0].y) * (pos[0].x - pos[1].x)) * rd;
	//		
    //        if (!(rn < 0. || rn > 1. || sn < 0. || sn > 1.)) center = pos[0] + rn * (pos[2] - pos[0]);
	//		
    //        float d[4];	
    //        
    //        for (let i = 0; i < 4; i++)	d[i] = (pos[i] - center).mag();
	//		
    //        for (let i = 0; i < 4; i++) {
	//			const q = d[i] === 0.0 ? 1.0 : (d[i] + d[(i + 2) & 3]) / d[(i + 2) & 3];
	//			di.uv[i] *= q; di.w[i] *= q;
	//			di.pos[i] = new VF2D(pos[i].x * this.vInvScreenSize.x * 2.0 - 1.0, ((pos[i].y * vInvScreenSize.y) * 2.0 - 1.0) * -1.0);
	//		}
//
	//		di.mode = this.nDecalMode;
	//		di.structure = this.nDecalStructure;
	//		this.vLayers[this.nTargetLayer].vecDecalInstance.push(di);
	//	}
    //}
    
    //drawPartialWarpedDecal(olc::Decal* decal, const olc::vf2d* pos, const olc::vf2d& source_pos, const olc::vf2d& source_size, const olc::Pixel& tint = olc::WHITE) {}
    //drawPartialWarpedDecal(olc::Decal* decal, const std::array<olc::vf2d, 4>& pos, const olc::vf2d& source_pos, const olc::vf2d& source_size, const olc::Pixel& tint = olc::WHITE) {}
    
    //drawRotatedDecal(const olc::vf2d& pos, olc::Decal* decal, const float fAngle, const olc::vf2d& center = { 0.0, 0.0 }, const olc::vf2d& scale = { 1.0,1.0 }, const olc::Pixel& tint = olc::WHITE) {
    //    DecalInstance di;
	//	di.decal = decal;
	//	di.pos.resize(4);
	//	di.uv = { { 0.0f, 0.0f}, {0.0f, 1.0f}, {1.0f, 1.0f}, {1.0f, 0.0f} };
	//	di.w = { 1, 1, 1, 1 };
	//	di.tint = { tint, tint, tint, tint };
	//	di.points = 4;
	//	di.pos[0] = (olc::vf2d(0.0f, 0.0f) - center) * scale;
	//	di.pos[1] = (olc::vf2d(0.0f, float(decal->sprite->height)) - center) * scale;
	//	di.pos[2] = (olc::vf2d(float(decal->sprite->width), float(decal->sprite->height)) - center) * scale;
	//	di.pos[3] = (olc::vf2d(float(decal->sprite->width), 0.0f) - center) * scale;
	//	float c = cos(fAngle), s = sin(fAngle);
	//	for (int i = 0; i < 4; i++)
	//	{
	//		di.pos[i] = pos + olc::vf2d(di.pos[i].x * c - di.pos[i].y * s, di.pos[i].x * s + di.pos[i].y * c);
	//		di.pos[i] = di.pos[i] * vInvScreenSize * 2.0f - olc::vf2d(1.0f, 1.0f);
	//		di.pos[i].y *= -1.0f;
	//		di.w[i] = 1;
	//	}
	//	di.mode = nDecalMode;
	//	di.structure = nDecalStructure;
	//	vLayers[nTargetLayer].vecDecalInstance.push_back(di);
    //}

    drawPartialRotatedDecal(pos: VF2D, decal: Decal, fAngle: number, center:VF2D, source_pos: VF2D, source_size: VF2D, scale: VF2D = new VF2D(1.0, 1.0), tint: Pixel = WHITE) {
        const di: DecalInstance = <DecalInstance>{};
		di.decal = decal;
		di.points = 4;
		di.tint = [ tint, tint, tint, tint ];
		di.w = [ 1, 1, 1, 1 ];
		di.pos = [
			new VF2D(0.0, 0.0).sub(center).multi(scale),
			new VF2D(0.0, source_size.y).sub(center).multi(scale),
			new VF2D(source_size.x, source_size.y).sub(center).multi(scale),
			new VF2D(source_size.x, 0.0).sub(center).multi(scale),
		];
		
        const c = Math.cos(fAngle);
        const s = Math.sin(fAngle);
		
        for (let i = 0; i < 4; i++) {
			di.pos[i] = pos.add(new VF2D(di.pos[i].x * c - di.pos[i].y * s, di.pos[i].x * s + di.pos[i].y * c));
			di.pos[i] = di.pos[i].multi(this.vInvScreenSize).scalarMulti(2.0).sub(new VF2D(1.0, 1.0));
			di.pos[i].y *= -1.0;
		}

		let uvtl: VF2D = source_pos.multi(decal.uvScale);
		let uvbr: VF2D = uvtl.add(source_size.multi(decal.uvScale));
		di.uv = [ new VF2D(uvtl.x, uvtl.y), new VF2D(uvtl.x, uvbr.y), new VF2D(uvbr.x, uvbr.y), new VF2D(uvbr.x, uvtl.y) ];
		di.mode = this.nDecalMode;
		di.structure = this.nDecalStructure;
		this.vLayers[this.nTargetLayer].vecDecalInstance.push(di);
    }
    
    //drawStringDecal(const olc::vf2d& pos, const std::string& sText, const Pixel col = olc::WHITE, const olc::vf2d& scale = { 1.0, 1.0 }) {
    //    olc::vf2d spos = { 0.0, 0.0 };
	//	for (auto c : sText)
	//	{
	//		if (c == '\n')
	//		{
	//			spos.x = 0; spos.y += 8.0 * scale.y;
	//		}
	//		else if (c == '\t')
	//		{
	//			spos.x += 8.0 * float(nTabSizeInSpaces) * scale.x;
	//		}
	//		else
	//		{
	//			int32_t ox = (c - 32) % 16;
	//			int32_t oy = (c - 32) / 16;
	//			DrawPartialDecal(pos + spos, fontDecal, { float(ox) * 8.0, float(oy) * 8.0 }, { 8.0, 8.0 }, scale, col);
	//			spos.x += 8.0 * scale.x;
	//		}
	//	}
    //}
    
    //drawStringPropDecal(const olc::vf2d& pos, const std::string& sText, const Pixel col = olc::WHITE, const olc::vf2d& scale = { 1.0, 1.0 }) {
    //    olc::vf2d spos = { 0.0, 0.0 };
	//	for (auto c : sText)
	//	{
	//		if (c == '\n')
	//		{
	//			spos.x = 0; spos.y += 8.0 * scale.y;
	//		}
	//		else if (c == '\t')
	//		{
	//			spos.x += 8.0 * float(nTabSizeInSpaces) * scale.x;
	//		}
	//		else
	//		{
	//			int32_t ox = (c - 32) % 16;
	//			int32_t oy = (c - 32) / 16;
	//			DrawPartialDecal(pos + spos, fontDecal, { float(ox) * 8.0 + float(vFontSpacing[c - 32].x), float(oy) * 8.0 }, { float(vFontSpacing[c - 32].y), 8.0 }, scale, col);
	//			spos.x += float(vFontSpacing[c - 32].y) * scale.x;
	//		}
	//	}
    //}

    fillRect(x: number, y: number, w: number, h: number, p: Pixel) {
		let x2 = x + w;
		let y2 = y + h;

		if (x < 0) x = 0;
		if (x >= this.getDrawTargetWidth()) x = this.getDrawTargetWidth();
		if (y < 0) y = 0;
		if (y >= this.getDrawTargetHeight()) y = this.getDrawTargetHeight();

		if (x2 < 0) x2 = 0;
		if (x2 >= this.getDrawTargetWidth()) x2 = this.getDrawTargetWidth();
		if (y2 < 0) y2 = 0;
		if (y2 >= this.getDrawTargetHeight()) y2 = this.getDrawTargetHeight();

		for (let i = x; i < x2; i++)
			for (let j = y; j < y2; j++)
				this.draw(i, j, p);
	}

    fillRectByVI2D(pos: VI2D, size: VI2D, p: Pixel) {
        this.fillRect(pos.x, pos.y, size.x, size.y, p);
    }
    
    //fillRectDecal(const olc::vf2d& pos, const olc::vf2d& size, const olc::Pixel col = olc::WHITE) {
    //    olc::vf2d vNewSize = (size - olc::vf2d(0.375f, 0.375f)).ceil();
	//	std::array<olc::vf2d, 4> points = { { {pos}, {pos.x, pos.y + vNewSize.y}, {pos + vNewSize}, {pos.x + vNewSize.x, pos.y} } };
	//	std::array<olc::vf2d, 4> uvs = { {{0,0},{0,0},{0,0},{0,0}} };
	//	std::array<olc::Pixel, 4> cols = { {col, col, col, col} };
	//	this.drawExplicitDecal(nullptr, points.data(), uvs.data(), cols.data(), 4);
    //}
    
    //gradientFillRectDecal(const olc::vf2d& pos, const olc::vf2d& size, const olc::Pixel colTL, const olc::Pixel colBL, const olc::Pixel colBR, const olc::Pixel colTR) {
    //    std::array<olc::vf2d, 4> points = { { {pos}, {pos.x, pos.y + size.y}, {pos + size}, {pos.x + size.x, pos.y} } };
	//	std::array<olc::vf2d, 4> uvs = { {{0,0},{0,0},{0,0},{0,0}} };
	//	std::array<olc::Pixel, 4> cols = { {colTL, colBL, colBR, colTR} };
	//	this.drawExplicitDecal(nullptr, points.data(), uvs.data(), cols.data(), 4);
    //}
    
    //drawPolygonDecal(olc::Decal* decal, const std::vector<olc::vf2d>& pos, const std::vector<olc::vf2d>& uv, const olc::Pixel tint = olc::WHITE) {
    //    DecalInstance di;
	//	di.decal = decal;
	//	di.points = uint32_t(pos.size());
	//	di.pos.resize(di.points);
	//	di.uv.resize(di.points);
	//	di.w.resize(di.points);
	//	di.tint.resize(di.points);
	//	for (uint32_t i = 0; i < di.points; i++)
	//	{
	//		di.pos[i] = { (pos[i].x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos[i].y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//		di.uv[i] = uv[i];
	//		di.tint[i] = tint;
	//		di.w[i] = 1.0f;
	//	}
	//	di.mode = nDecalMode;
	//	di.structure = nDecalStructure;
	//	vLayers[nTargetLayer].vecDecalInstance.push_back(di);
    //}
    
    //drawPolygonDecal(olc::Decal* decal, const std::vector<olc::vf2d>& pos, const std::vector<float>& depth, const std::vector<olc::vf2d>& uv, const olc::Pixel tint = olc::WHITE) {
    //    const di: DecalInstance = {};
	//	di.decal = decal;
	//	di.points = uint32_t(pos.size());
	//	di.pos.resize(di.points);
	//	di.uv.resize(di.points);
	//	di.w.resize(di.points);
	//	di.tint.resize(di.points);
//
	//	for (let i = 0; i < di.points; i++) {
	//		di.pos[i] = { (pos[i].x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos[i].y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//		di.uv[i] = uv[i];
	//		di.tint[i] = tint;
	//		di.w[i] = 1.0f;
	//	}
	//	di.mode = nDecalMode;
	//	di.structure = nDecalStructure;
	//	this.vLayers[this.nTargetLayer].vecDecalInstance.push(di);
    //}
    
    //drawPolygonDecal(olc::Decal* decal, const std::vector<olc::vf2d>& pos, const std::vector<olc::vf2d>& uv, const std::vector<olc::Pixel>& tint) {
    //    DecalInstance di;
	//	di.decal = decal;
	//	di.points = uint32_t(pos.size());
	//	di.pos.resize(di.points);
	//	di.uv.resize(di.points);
	//	di.w.resize(di.points);
	//	di.tint.resize(di.points);
	//	for (uint32_t i = 0; i < di.points; i++)
	//	{
	//		di.pos[i] = { (pos[i].x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos[i].y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//		di.uv[i] = uv[i];
	//		di.tint[i] = tint[i];
	//		di.w[i] = 1.0f;
	//	}
	//	di.mode = nDecalMode;
	//	di.structure = nDecalStructure;
	//	vLayers[nTargetLayer].vecDecalInstance.push_back(di);
    //}
    
    //drawLineDecal(const olc::vf2d& pos1, const olc::vf2d& pos2, Pixel p = olc::WHITE) {
    //    DecalInstance di;
	//	di.decal = nullptr;
	//	di.points = uint32_t(2);
	//	di.pos.resize(di.points);
	//	di.uv.resize(di.points);
	//	di.w.resize(di.points);
	//	di.tint.resize(di.points);
	//	di.pos[0] = { (pos1.x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos1.y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//	di.uv[0] = { 0.0f, 0.0f };
	//	di.tint[0] = p;
	//	di.w[0] = 1.0f;
	//	di.pos[1] = { (pos2.x * vInvScreenSize.x) * 2.0f - 1.0f, ((pos2.y * vInvScreenSize.y) * 2.0f - 1.0f) * -1.0f };
	//	di.uv[1] = { 0.0f, 0.0f };
	//	di.tint[1] = p;
	//	di.w[1] = 1.0f;
	//	di.mode = olc::DecalMode::WIREFRAME;
	//	vLayers[nTargetLayer].vecDecalInstance.push_back(di);
    //}

    drawRect(x: number, y: number, w: number, h: number, p: Pixel) {
		this.drawLine(x, y, x + w, y, p);
		this.drawLine(x + w, y, x + w, y + h, p);
		this.drawLine(x, y + h, x + w, y + h, p);
		this.drawLine(x, y, x, y + h, p);
	}

    drawRectByVI2D(pos: VI2D, size: VI2D, p: Pixel) {
        this.drawRect(pos.x, pos.y, size.x, size.y, p);
    }
    
    drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, p: Pixel) {
		this.drawLine(x1, y1, x2, y2, p);
		this.drawLine(x2, y2, x3, y3, p);
		this.drawLine(x3, y3, x1, y1, p);
	}

    drawTriangleByVI2D(pos1: VI2D, pos2: VI2D, pos3: VI2D, p: Pixel) {
		this.drawTriangle(pos1.x, pos1.y, pos2.x, pos2.y, pos3.x, pos3.y, p);
	}
    
    drawRotatedStringDecal(pos: VF2D, sText: string, fAngle: number, center: VF2D = new VF2D(0.0, 0.0), col: Pixel = WHITE, scale:VF2D = new VF2D(1.0, 1.0)) {
        const spos = center;
		for (const c of sText) {
			if (c === '\n') {
				spos.x = center.x; spos.y -= 8.0;
			} else if (c === '\t') {
				spos.x += 8.0 * nTabSizeInSpaces * scale.x;
			}
			else
			{
				const ox = (c.charCodeAt(0) - 32) % 16;
				const oy = (c.charCodeAt(0) - 32) / 16;
                const sourcePos = new VF2D(ox * 8.0, oy * 8.0);
                const sourceSize = new VF2D(8.0, 8.0);
				
                this.drawPartialRotatedDecal(pos, this.fontDecal, fAngle, spos, sourcePos, sourceSize, scale, col);
				spos.x -= 8.0;
			}
		}
    }
    
    drawRotatedStringPropDecal(pos:VF2D, sText: string, fAngle: number, center: VF2D = new VF2D(0.0, 0.0), col: Pixel = WHITE, scale: VF2D = new VF2D(1.0, 1.0)) {
        const spos = center;
		for (const c of sText) {
			if (c === '\n') {
				spos.x = center.x; spos.y -= 8.0;
			} else if (c === '\t') {
				spos.x += 8.0 * nTabSizeInSpaces * scale.x;
			} else {
				const ox = (c.charCodeAt(0) - 32) % 16;
				const oy = (c.charCodeAt(0) - 32) / 16;
                const sourcePos = new VF2D(ox * 8.0 + this.vFontSpacing[c.charCodeAt(0) - 32].x, oy * 8.0);
                const sourceSize = new VF2D(this.vFontSpacing[c.charCodeAt(0) - 32].y, 8.0);
				
                this.drawPartialRotatedDecal(pos, this.fontDecal, fAngle, spos, sourcePos, sourceSize, scale, col);
				spos.x -= this.vFontSpacing[c.charCodeAt(0) - 32].y;
			}
		}
    }

    clear(p: Pixel) {
        const pixels = this.getDrawTargetWidth() * this.getDrawTargetHeight();
		const m = this.getDrawTarget().getData();

		//console.log(m);
		
        for (let i = 0; i < pixels; i++) m[i] = p;
    }
    
    clearBuffer(p: Pixel, bDepth = true) { renderer.clearBuffer(p, bDepth); }
    
    getFontSprite() { return this.fontSprite; }
    
    clipLineToScreen(in_p1: VI2D, in_p2: VI2D) {
        const SEG_I = 0b0000, SEG_L = 0b0001, SEG_R = 0b0010, SEG_B = 0b0100, SEG_T = 0b1000;
		const Segment = (v: VI2D) => {
			let i = SEG_I;
			if (v.x < 0) i |= SEG_L; else if (v.x > this.vScreenSize.x) i |= SEG_R;
			if (v.y < 0) i |= SEG_B; else if (v.y > this.vScreenSize.y) i |= SEG_T;
			return i;
		};

		let s1 = Segment(in_p1), s2 = Segment(in_p2);

		while (true)
		{
			if (!(s1 | s2))	  return true;
			else if (s1 & s2) return false;
			else
			{
				const s3 = s2 > s1 ? s2 : s1;
				const n = new VI2D();
				
                if (s3 & SEG_T) {
                    n.x = in_p1.x + (in_p2.x - in_p1.x) * (this.vScreenSize.y - in_p1.y) / (in_p2.y - in_p1.y);
                    n.y = this.vScreenSize.y;
                } else if (s3 & SEG_B) {
                    n.x = in_p1.x + (in_p2.x - in_p1.x) * (0 - in_p1.y) / (in_p2.y - in_p1.y);
                    n.y = 0;
                } else if (s3 & SEG_R) {
                    n.x = this.vScreenSize.x;
                    n.y = in_p1.y + (in_p2.y - in_p1.y) * (this.vScreenSize.x - in_p1.x) / (in_p2.x - in_p1.x);
                } else if (s3 & SEG_L) {
                    n.x = 0; n.y = in_p1.y + (in_p2.y - in_p1.y) * (0 - in_p1.x) / (in_p2.x - in_p1.x);
                } if (s3 == s1) {
                    in_p1 = n;
                    s1 = Segment(in_p1);
                } else {
                    in_p2 = n;
                    s2 = Segment(in_p2);
                }
			}
		}
		return true;
    }

    updateMouse(x: Int32Array[0], y: Int32Array[0]) {
        this.bHasMouseFocus = true;
		this.vMouseWindowPos = new VI2D(x, y);
		// Full Screen mode may have a weird viewport we must clamp to
		x -= this.vViewPos.x;
		y -= this.vViewPos.y;
		
		this.vMousePosCache.x = (x / (this.vWindowSize.x - (this.vViewPos.x * 2)) * this.vScreenSize.x);
		this.vMousePosCache.y = (y / (this.vWindowSize.y - (this.vViewPos.y * 2)) * this.vScreenSize.y);
		
		if (this.vMousePosCache.x >= this.vScreenSize.x) this.vMousePosCache.x = this.vScreenSize.x - 1;
		if (this.vMousePosCache.y >= this.vScreenSize.y) this.vMousePosCache.y = this.vScreenSize.y - 1;
		if (this.vMousePosCache.x < 0) this.vMousePosCache.x = 0;
		if (this.vMousePosCache.y < 0) this.vMousePosCache.y = 0;
    }

    updateMouseWheel(delta: Int32Array[0]) { this.nMouseWheelDeltaCache += delta; }

    updateWindowSize(x: number, y: number) {
        this.vWindowSize = new VI2D(x, y);
		this.updateViewport();
    }

    updateViewport() {
        console.log('GE::updateViewport()');
		let ww = this.vScreenSize.x * this.vPixelSize.x;
		let wh = this.vScreenSize.y * this.vPixelSize.y;
		let wasp = ww / wh;

		if (this.bPixelCohesion) {
			this.vScreenPixelSize = this.vWindowSize.div(this.vScreenSize);
			this.vViewSize = this.vWindowSize.div(this.vScreenSize).multi(this.vScreenSize);
		} else {
			this.vViewSize.x = this.vWindowSize.x;
			this.vViewSize.y = this.vViewSize.x / wasp;

			if (this.vViewSize.y > this.vWindowSize.y) {
				this.vViewSize.y = this.vWindowSize.y;
				this.vViewSize.x = this.vViewSize.y * wasp;
			}
		}

		this.vViewPos = this.vWindowSize.sub(this.vViewSize).scalarDiv(2);
    }
    
    constructFontSheet() {
        console.log('FontSheet*********')
		let data = '';
		data += '?Q`0001oOch0o01o@F40o0<AGD4090LAGD<090@A7ch0?00O7Q`0600>00000000';
		data += 'O000000nOT0063Qo4d8>?7a14Gno94AA4gno94AaOT0>o3`oO400o7QN00000400';
		data += 'Of80001oOg<7O7moBGT7O7lABET024@aBEd714AiOdl717a_=TH013Q>00000000';
		data += '720D000V?V5oB3Q_HdUoE7a9@DdDE4A9@DmoE4A;Hg]oM4Aj8S4D84@`00000000';
		data += 'OaPT1000Oa`^13P1@AI[?g`1@A=[OdAoHgljA4Ao?WlBA7l1710007l100000000';
		data += 'ObM6000oOfMV?3QoBDD`O7a0BDDH@5A0BDD<@5A0BGeVO5ao@CQR?5Po00000000';
		data += 'Oc``000?Ogij70PO2D]??0Ph2DUM@7i`2DTg@7lh2GUj?0TO0C1870T?00000000';
		data += '70<4001o?P<7?1QoHg43O;`h@GT0@:@LB@d0>:@hN@L0@?aoN@<0O7ao0000?000';
		data += 'OcH0001SOglLA7mg24TnK7ln24US>0PL24U140PnOgl0>7QgOcH0K71S0000A000';
		data += '00H00000@Dm1S007@DUSg00?OdTnH7YhOfTL<7Yh@Cl0700?@Ah0300700000000';
		data += '<008001QL00ZA41a@6HnI<1i@FHLM81M@@0LG81?O`0nC?Y7?`0ZA7Y300080000';
		data += 'O`082000Oh0827mo6>Hn?Wmo?6HnMb11MP08@C11H`08@FP0@@0004@000000000';
		data += '00P00001Oab00003OcKP0006@6=PMgl<@440MglH@000000`@000001P00000000';
		data += 'Ob@8@@00Ob@8@Ga13R@8Mga172@8?PAo3R@827QoOb@820@0O`0007`0000007P0';
		data += 'O`000P08Od400g`<3V=P0G`673IP0`@3>1`00P@6O`P00g`<O`000GP800000000';
		data += '?P9PL020O`<`N3R0@E4HC7b0@ET<ATB0@@l6C4B0O`H3N7b0?P01L3R000000020';

		this.fontSprite = Sprite.createSpriteFromDimensions(128, 48);
		let px = 0, py = 0;
		
		for (let b = 0; b < 1024; b += 4) {
			let sym1 = data.charCodeAt(b + 0) - 48;
			let sym2 = data.charCodeAt(b + 1) - 48;
			let sym3 = data.charCodeAt(b + 2) - 48;
			let sym4 = data.charCodeAt(b + 3) - 48;
			let r = sym1 << 18 | sym2 << 12 | sym3 << 6 | sym4;

			for (let i = 0; i < 24; i++) {
				let k = r & (1 << i) ? 255 : 0;
				this.fontSprite.setPixel(px, py, new Pixel(k, k, k, k));
				
				if (++py === 48) { px++; py = 0; }
			}
		}

		this.fontDecal = new Decal(this.fontSprite);

		const vSpacing: Uint8Array = Uint8Array.of(
			0x03,0x25,0x16,0x08,0x07,0x08,0x08,0x04,0x15,0x15,0x08,0x07,0x15,0x07,0x24,0x08,
			0x08,0x17,0x08,0x08,0x08,0x08,0x08,0x08,0x08,0x08,0x24,0x15,0x06,0x07,0x16,0x17,
			0x08,0x08,0x08,0x08,0x08,0x08,0x08,0x08,0x08,0x17,0x08,0x08,0x17,0x08,0x08,0x08,
			0x08,0x08,0x08,0x08,0x17,0x08,0x08,0x08,0x08,0x17,0x08,0x15,0x08,0x15,0x08,0x08,
			0x24,0x18,0x17,0x17,0x17,0x17,0x17,0x17,0x17,0x33,0x17,0x17,0x33,0x18,0x17,0x17,
			0x17,0x17,0x17,0x17,0x07,0x17,0x17,0x18,0x18,0x17,0x17,0x07,0x33,0x07,0x08,0x00,);

		for (const c of vSpacing) this.vFontSpacing.push(new VI2D(c >> 4, c & 15));
    }
    
    coreUpdate() {
        //console.log('Core Update', this);
		const step: FrameRequestCallback = (s) => {
			this.m_tp2 = s;
			const elapsedTime = this.m_tp2 - this.m_tp1;
			this.m_tp1 = this.m_tp2;

			// Our time per frame coefficient
			let fElapsedTime = elapsedTime;
			this.fLastElapsed = fElapsedTime;

			// Some platforms will need to check for events
			platform.handleSystemEvent();

			// Compare hardware input states from previous frame
			let ScanHardware = (pKeys: HWButton[], pStateOld: HWButton[], pStateNew: HWButton[], nKeyCount: Uint32Array[0]) => {
				for (let i = 0; i < nKeyCount; i++) {
					//console.log('Button', pKeys[i]);
					//pKeys[i].bPressed = false;
					//pKeys[i].bReleased = false;

					if (!this.compareButtonStateIsEqual(pStateNew[i], pStateOld[i])) {
						console.log('KB State Change');
						if (pStateNew[i]) {
							pKeys[i].bPressed = !pKeys[i].bHeld;
							pKeys[i].bHeld = true;
						} else {
							pKeys[i].bReleased = true;
							pKeys[i].bHeld = false;
						}
					}
					pStateOld[i].bHeld = pStateNew[i].bHeld;
					pStateOld[i].bPressed = pStateNew[i].bPressed;
					pStateOld[i].bReleased = pStateNew[i].bReleased;
				}
			};

			//console.log('Scanning HW');

			ScanHardware(this.pKeyboardState, this.pKeyOldState, this.pKeyNewState, 256);
			ScanHardware(this.pMouseState, this.pMouseOldState, this.pMouseNewState, nMouseButtons);

			// Cache mouse coordinates so they remain consistent during frame
			this.vMousePos = this.vMousePosCache;
			this.nMouseWheelDelta = this.nMouseWheelDeltaCache;
			this.nMouseWheelDeltaCache = 0;

			// renderer->ClearBuffer(olc::BLACK, true);

			// Handle Frame Update
			let bExtensionBlockFrame = false;
			for (const ext of this.vExtensions) bExtensionBlockFrame ||= ext.onBeforeUserUpdate(fElapsedTime);

			if (!bExtensionBlockFrame) {
				if (!this.onUserUpdate(s)) { this.bAtomActive = false; }
			}

			for (const ext of this.vExtensions) ext.onAfterUserUpdate(fElapsedTime);

			renderer.updateViewport(this.vViewPos, this.vViewSize);
			renderer.clearBuffer(BLACK, true);

			this.vLayers[0].update = true;
			this.vLayers[0].show = true;

			this.setDecalMode(DecalMode.NORMAL);

			renderer.prepareDrawing();

			for (const layer of this.vLayers) {
				//console.log('Layer', this.vLayers.length);
				if (layer.show) {
					if (layer.funcHook === undefined) {
						renderer.applyTexture(layer.drawTarget.decal().id);
						if (layer.update) {
							layer.drawTarget.decal().update();
							layer.update = false;
						}

						renderer.drawLayerQuad(layer.offset, layer.scale, layer.tint);

						for (const decal of layer.vecDecalInstance)
							renderer.drawDecal(decal);
						layer.vecDecalInstance = [];
					} else {
						console.log('Layer Function Hook', layer.funcHook);
						layer.funcHook();
					}
				}
			}

			// Present Graphics to screen
			renderer.displayFrame();

			// Update Title Bar
			this.fFrameTimer += fElapsedTime;
			this.nFrameCount++;

			if (this.fFrameTimer >= 1.0) {
				this.nLastFPS = this.nFrameCount;
				this.fFrameTimer -= 1.0;
				const sTitle = 'NES Game Engine - ' + this.sAppName + ' - FPS: ' + this.nFrameCount;
				platform.setWindowTitle(sTitle);
				this.nFrameCount = 0;
			}
			requestAnimationFrame(step);
		}

		requestAnimationFrame(step);
    }

    prepareEngine() {
        if (platform.createGraphics(this.bFullScreen, this.bEnableVSYNC, this.vViewPos, this.vViewSize) === RCode.FAIL) return;

		console.log('Graphics created');
		this.constructFontSheet();

		// Create Primary Layer "0"
		this.createLayer();
		this.vLayers[0].update = true;
		this.vLayers[0].show = true;
		this.setDrawTarget(undefined);

		this.m_tp1 = Date.now();
		this.m_tp2 = Date.now();
    }

    updateMouseState(button: Int32Array[0], state: HWButton) { this.pMouseNewState[button] = state; }

    updateKeyState(key:Int32Array[0], state: HWButton) { this.pKeyNewState[key] = state; }

    updateMouseFocus(state: boolean) { this.bHasMouseFocus = state; }
    
    updateKeyFocus(state: boolean) { this.bHasInputFocus = state; }

    terminate() { this.bAtomActive = false; }

    reanimate() { this.bAtomActive = true; }

    isRunning() { return this.bAtomActive; }
    
    register(gex: GameEngineExtension): void {
        if (!this.vExtensions.includes(gex))
			this.vExtensions.push(gex);
    }

	hex(n: Uint32Array[0], d: Uint8Array[0]): string {
		const s: string[] = [];
		for (let i: number = d - 1; i >= 0; i--, n >>= 4)
			s[i] = '0123456789ABCDEF'[n & 0xF];
		return s.join('');
	}

	setKeyboardState(key: string, button: HWButton): void {
		console.log('GE::setKeyboardState()/button', `'${key}'`, button);
		/* switch(key) {
			case 'a':
			case 'A':
				this.pKeyboardState[1].bHeld = button.bHeld;
				this.pKeyboardState[1].bPressed = button.bPressed;
				this.pKeyboardState[1].bReleased = button.bReleased;
			case 'b':
			case 'B':
				this.pKeyboardState[2].bHeld = button.bHeld;
				this.pKeyboardState[2].bPressed = button.bPressed;
				this.pKeyboardState[2].bReleased = button.bReleased;
			case 'c':
			case 'C':
				this.pKeyboardState[3].bHeld = button.bHeld;
				this.pKeyboardState[3].bPressed = button.bPressed;
				this.pKeyboardState[3].bReleased = button.bReleased;
			case 'd':
			case 'D':
				this.pKeyboardState[4].bHeld = button.bHeld;
				this.pKeyboardState[4].bPressed = button.bPressed;
				this.pKeyboardState[4].bReleased = button.bReleased;
			case 'e':
			case 'E':
				this.pKeyboardState[5].bHeld = button.bHeld;
				this.pKeyboardState[5].bPressed = button.bPressed;
				this.pKeyboardState[5].bReleased = button.bReleased;
			case 'f':
			case 'F':
				this.pKeyboardState[6].bHeld = button.bHeld;
				this.pKeyboardState[6].bPressed = button.bPressed;
				this.pKeyboardState[6].bReleased = button.bReleased;
		} */

		const keyEnum = key.toUpperCase();

		if (keyEnum in Key) {
			//console.log('Key Index:', <any>Key[<any>keyEnum]);
			const keyIndex:number = (<any>Key)[keyEnum];
			this.pKeyboardState[keyIndex].bHeld = button.bHeld;
			this.pKeyboardState[keyIndex].bPressed = button.bPressed;
			this.pKeyboardState[keyIndex].bReleased = button.bHeld;
			console.log('Key:', keyIndex, 'C:', this.getKey(Key.C));
		} else {
			switch (key) {
				case 'ArrowUp':
					this.pKeyboardState[Key.UP].bHeld = button.bHeld;
					this.pKeyboardState[Key.UP].bPressed = button.bPressed;
					this.pKeyboardState[Key.UP].bReleased = button.bHeld;
					console.log(key, this.getKey(Key.UP))
					break;
				
				case 'ArrowDown':
					this.pKeyboardState[Key.DOWN].bHeld = button.bHeld;
					this.pKeyboardState[Key.DOWN].bPressed = button.bPressed;
					this.pKeyboardState[Key.DOWN].bReleased = button.bHeld;
					break;
				
				case 'ArrowLeft':
					this.pKeyboardState[Key.LEFT].bHeld = button.bHeld;
					this.pKeyboardState[Key.LEFT].bPressed = button.bPressed;
					this.pKeyboardState[Key.LEFT].bReleased = button.bHeld;
					break;
				
				case 'ArrowRight':
					this.pKeyboardState[Key.RIGHT].bHeld = button.bHeld;
					this.pKeyboardState[Key.RIGHT].bPressed = button.bPressed;
					this.pKeyboardState[Key.RIGHT].bReleased = button.bHeld;
					break;
				
				case ' ':
					this.pKeyboardState[Key.SPACE].bHeld = button.bHeld;
					this.pKeyboardState[Key.SPACE].bPressed = button.bPressed;
					this.pKeyboardState[Key.SPACE].bReleased = button.bHeld;
					break;
				
				default:
					break;
			}
		}
		//console.log('Current State', this.pKeyboardState);
		//console.log('New State', this.pKeyNewState);
		//console.log('Old State', this.pKeyOldState);
	}

	compareButtonStateIsEqual(b1: HWButton, b2: HWButton): boolean {
		return b1.bHeld === b2.bHeld && b1.bPressed === b2.bPressed && b1.bReleased === b2.bReleased;
	}
}

export abstract class GameEngineExtension {
    constructor(hook: boolean = false) { if(hook) GameEngineExtension.gameEngine.register(this); }

    abstract onBeforeUserCreate(): void
    abstract onAfterUserCreate(): void
    abstract onBeforeUserUpdate(fElapsedTime: number): boolean
    abstract onAfterUserUpdate(fElapsedTime: number): void

    static gameEngine: GameEngine;
}

const swap = <T>(x1: T, x2: T) => {
    const temp = x2;
    x2 = x1;
    x1 = temp;
}