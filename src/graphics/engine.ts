import { HWButton, Key, RCode } from '.';
import { Pixel, WHITE } from './pixel';
import { mapKeys } from './platform';
import { LayerDesc } from './render';
import { Mode, Sprite } from './sprite';

export abstract class GameEngine {
    constructor() {}

    static getKeyMap() { return mapKeys; }

    construct(
        screenWidth: number, screenHeight: number,
        pixelWidth: number, pixelHeight: number,
        fullScreen: boolean = false, vsync: boolean = false, cohesion: boolean = false): RCode {
        return RCode.FAIL;
    }

    start(): RCode { return RCode.FAIL; }
    
    abstract onUserCreate(): boolean
    abstract onUserUpdate(elapsedTime: number): boolean
    abstract onUserDestroy(): boolean

    isFocused(): boolean { return false; }
    getKey(k: Key): HWButton { return undefined; }
    getMouse(b: Uint32Array[0]): HWButton { return undefined; }
    getMouseX(): number { return 0; }
    getMouseY(): number { return 0; }
    getMouseWheel(): number { return 0; }
    getWindowMouse(): VI2D { return undefined; }
    getMousePos(): VI2D { return undefined; }
    screenWidth(): number { return 0; }
    screenHeight(): number { return 0; }
    getDrawTargetWidth(): number { return 0; }
    getDrawTargetHeight(): number { return 0; }
    getDrawTarget(): Sprite { return undefined; }
    setScreenSize(w: number, h: number): void {}
    setDrawTarget(target: Sprite): void {}
    getFPS(): Uint32Array[0] { return 0; }
    getElapsedTime(): number { return 0; }
    getWindowSize(): VI2D { return undefined; }
    getPixelSize(): VI2D { return undefined; }
    getScreenPixelSize(): VI2D { return undefined; }
    setDrawTargetByLayer(layer: Uint8Array[0]): void {}
    enableLayer(layer: Uint8Array[0], b: boolean): void {}
    setLayerOffset(layer: Uint8Array[0], offset:VF2D): void {}
    setLayerOffsetByPos(layer: Uint8Array[0], x: number, y: number): void {}
    setLayerScale(layer: Uint8Array[0], scale:VF2D): void {}
    setLayerScaleByPos(layer: Uint8Array[0], x: number, y: number): void {}
    setLayerTint(layer: Uint8Array[0], tint: Pixel): void {}
    setLayerCustomRenderFunction(layer: Uint8Array[0], f: () => void): void {}
    getLayers(): LayerDesc[] { return []; }
    createLayer(): Uint32Array[0] { return 0; }
    setPixelMode(m: Mode): void {}
    getPixelMode(): Mode { return Mode.CLAMP; }
    setPixelModeByCallback(pixelModeCallback: (x: number, y: number, source: Pixel, dest: Pixel) => Pixel): void {}
    setPixelBlend(blend: number): void {}
    draw(x: number, y: number, p: Pixel = WHITE): boolean { return false; }
    drawLine(x1: number, y1: number, x2: number, y2: number, p: Pixel = WHITE, pattern: Uint32Array[0] = 0xFFFFFFFF): void {}
    drawLineByVI2D(pos1: VI2D, pos2: VI2D, p: Pixel = WHITE, pattern: Uint32Array[0] = 0xFFFFFFFF): void {}
}