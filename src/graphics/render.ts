import { RCode } from '.';
import { Decal, DecalInstance, DecalMode } from './decal';
import { GameEngine } from './engine';
import { Pixel } from './pixel';
import { ResourcePack } from './resource';
import { Sprite } from './sprite';

export interface LayerDesc {
	offset: VF2D; // { 0, 0 };
	scale: VF2D; // { 1, 1 };
	show: boolean; // false;
	update: boolean // false;
	drawTarget: Renderable;
	resID: Uint32Array[0]; // 0;
	vecDecalInstance: DecalInstance[];
	tint: Pixel; // WHITE;
	funcHook: () => void;
}

export class Renderable {
    private _sprite: Sprite;
    private _decal: Decal;

    constructor(r: Renderable) {}

    load(file: string, pack: ResourcePack, filiter: boolean = false, clamp: boolean = true): RCode { return RCode.FAIL; }
    create(width: Uint32Array[0], height: Uint32Array[0], filter: boolean = false, clamp: boolean = true): void {}
    decal(): Decal { return undefined; }
    sprite(): Sprite { return undefined; }
}

export abstract class Renderer {
    prepareDevice(): void {}
    createDevice(params: any[], fullScreen: boolean, vSync: boolean): RCode { return RCode.FAIL; }
    destroyDevice(): RCode { return RCode.FAIL; }
    displayFrame(): void {}
    prepareDrawing(): void {}
    setDecalMode(mode: DecalMode): void {}
    drawLayerQuad(offset: VF2D, scale: VF2D, tint: Pixel): void {}
    drawDecal(decal: DecalInstance): void {}
    createTexture(width: Uint32Array[0], height: Uint32Array[0], filtered: boolean = false, clamp: boolean = true): Uint32Array[0] { return 0; }
    updateTexture(id: Uint32Array[0], sprite: Sprite): void {}
    readTexture(id: Uint32Array[0], sprite: Sprite): void {}
    deleteTexture(id: Uint32Array[0]): Uint32Array[0] { return 0; }
    applyTexture(id: Uint32Array[0]): void {}
    updateViewport(pos: VI2D, size: VI2D): void {}
    clearBuffer(p: Pixel, depth: boolean): void {}
    
    static gameEngine: GameEngine;
}