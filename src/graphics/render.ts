import { RCode } from '.';
import { Decal, DecalInstance, DecalMode } from './decal';
import { GameEngine } from './engine';
import { Pixel } from './pixel';
import { ResourcePack } from './resource';
import { Sprite } from './sprite';
import {} from 'tslib';

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

export interface Vertex {
    pos: Float32Array;
    tex: VF2D;
    col: Pixel;
}

export class Renderable {
    private _sprite: Sprite;
    private _decal: Decal;

    constructor() {
        this._sprite = <Sprite><unknown>undefined;
        this._decal = <Decal><unknown>undefined;
    }

    static createFromExistingRenderable(r: Renderable): Renderable {
        const renderable = new Renderable();

        renderable._sprite = r._sprite;
        renderable._decal = r._decal;

        return renderable;
    }

    load(file: string, pack: ResourcePack, filter: boolean = false, clamp: boolean = true): RCode {
        this._sprite = new Sprite('');
		if (this._sprite.loadFromFile(file, pack) === RCode.OK)
		{
			this._decal = new Decal(this._sprite, filter, clamp);
			return RCode.OK;
		} else {
			this._sprite = <Sprite><unknown>undefined;
			return RCode.NO_FILE;
		}
    }

    create(width: Uint32Array[0], height: Uint32Array[0], filter: boolean = false, clamp: boolean = true): void {
        this._sprite = Sprite.createSpriteFromDimensions(width, height);
        this._decal = new Decal(this._sprite, filter, clamp);
    }
    
    decal(): Decal { return this._decal; }
    
    sprite(): Sprite { return this._sprite; }
}

export abstract class Renderer {
    abstract prepareDevice(): void;
    abstract createDevice(params: any[], fullScreen: boolean, vSync: boolean): RCode;
    abstract destroyDevice(): RCode;
    abstract displayFrame(): void;
    abstract prepareDrawing(): void;
    abstract setDecalMode(mode: DecalMode): void;
    abstract drawLayerQuad(offset: VF2D, scale: VF2D, tint: Pixel): void;
    abstract drawDecal(decal: DecalInstance): void;
    abstract createTexture(width: Uint32Array[0], height: Uint32Array[0], filtered: boolean, clamp: boolean): Uint32Array[0];
    abstract updateTexture(id: Uint32Array[0], sprite: Sprite): void;
    abstract readTexture(id: Uint32Array[0], sprite: Sprite): void;
    abstract deleteTexture(id: Uint32Array[0]): Uint32Array[0];
    abstract applyTexture(id: Uint32Array[0]): void;
    abstract updateViewport(pos: VI2D, size: VI2D): void;
    abstract clearBuffer(p: Pixel, depth: boolean): void;
    
    static gameEngine: GameEngine;
}

export class V2D<NumType extends number> {
    constructor(public x: NumType = <NumType>0, public y: NumType = <NumType>0) {}

    mag() { return <NumType>Math.sqrt(this.x * this.x + this.y * this.y); }
    mag2() { return this.x * this.x + this.y * this.y; }
    norm() { 
        const r: NumType = <NumType>(1 / this.mag());
        return new V2D<NumType>(<NumType>(this.x * r), <NumType>(this.y * r)); }
    perp() { return new V2D<NumType>(<NumType>(-1 * this.y), this.x); }
    floor() { return new V2D<NumType>(<NumType>Math.floor(this.x), <NumType>Math.floor(this.y)); }
    ceil() { return new V2D<NumType>(<NumType>Math.ceil(this.x), <NumType>Math.ceil(this.y)); }
    max(v: V2D<NumType>) { return new V2D<NumType>(<NumType>Math.max(this.x, v.x), <NumType>Math.max(this.y, v.y)); }
    min(v: V2D<NumType>) { return new V2D<NumType>(<NumType>Math.min(this.x, v.x), <NumType>Math.min(this.y, v.y)); }
    cart() { return new V2D<NumType>(<NumType>(Math.cos(this.y) * this.x), <NumType>(Math.sin(this.y) * this.x)); }
    polar() { return new V2D<NumType>(this.mag(), <NumType>Math.atan2(this.y, this.x)); }
    dot(rhs: V2D<NumType>): NumType { return <NumType>(this.x * rhs.x + this.y * rhs.y); }
    cross(rhs: V2D<NumType>) { return <NumType>(this.x * rhs.y - this.y * rhs.x); }
    add(rhs: V2D<NumType>): V2D<NumType> { return new V2D<NumType>(<NumType>(this.x + rhs.x), <NumType>(this.y + rhs.y)); }
    addMutate(rhs: V2D<NumType>) {}
    sub(rhs: V2D<NumType>) { return new V2D<NumType>(<NumType>(this.x - rhs.x), <NumType>(this.y - rhs.y)); }
    subMutate(rhs: V2D<NumType>) {}
    multi(rhs: V2D<NumType>): V2D<NumType> { return rhs; }
    multiMutate(rhs: V2D<NumType>) {}
    div(rhs: V2D<NumType>) { return new V2D<NumType>(<NumType>(this.x / rhs.x), <NumType>(this.y / rhs.y)); }
    divMutate(rhs: V2D<NumType>) {}
    isEqual(rhs: V2D<NumType>): boolean { return false; }
    str(): string { return `(${this.x},${this.y})`; }
    scalarMulti(rhs: NumType): V2D<NumType> { return new V2D<NumType>(<NumType>(this.x * rhs), <NumType>(this.y * rhs)); }
    scalarDiv(rhs: NumType): V2D<NumType> { return new V2D<NumType>(<NumType>(this.x / rhs), <NumType>(this.y / rhs)); }
    scalarAdd(rhs: NumType): V2D<NumType> { return new V2D<NumType>(<NumType>(this.x + rhs), <NumType>(this.y + rhs)); }
    scalarSub(rhs: NumType): V2D<NumType> { return new V2D<NumType>(<NumType>(this.x - rhs), <NumType>(this.y - rhs)); }
}

export class VI2D extends V2D<Int32Array[0]> {}
export class VU2D extends V2D<Uint32Array[0]> {}
export class VF2D extends V2D<Float32Array[0]> {}
export class VD2D extends V2D<Float64Array[0]> {}

export class WebGLRenderer extends Renderer {
    display: any;
    config: any;
    context: any;
    surface: any;
    fullScreen: boolean = false;
    deviceContext: any;
    rendererContext: any;
    sync: boolean = false;
    decalMode: DecalMode = DecalMode.NORMAL;

    createShader: any;
	shaderSource: any;
	compileShader: any;
	deleteShader: any;
	createProgram: any;
	deleteProgram: any;
	linkProgram: any;
	attachShader: any;
	bindBuffer: any;
	bufferData: any;
	genBuffers: any;
	vertexAttribPointer: any;
	enableVertexAttribArray: any;
	useProgram: any;
	bindVertexArray: any;
	genVertexArrays: any;
	swapInterval: any;
	getShaderInfoLog: any;

    nFS: Uint32Array[0] = 0;
    nVS: Uint32Array[0] = 0;
    nQuadShader: Uint32Array[0] = 0;
    vbQuad: Uint32Array[0] = 0;
    vaQuad: Uint32Array[0] = 0;

    pVertexMem: Vertex[] = [];
    rendBlankQuad: Renderable = <Renderable><unknown>undefined;

    override prepareDevice(): void {
        
    }

    override createDevice(params: any[], fullScreen: boolean, vSync: boolean): RCode {
        return RCode.FAIL;
    }

    override destroyDevice(): RCode {
        return RCode.FAIL;
    }

    override displayFrame(): void {
        
    }

    override prepareDrawing(): void {
        
    }

    override setDecalMode(mode: DecalMode): void {
        
    }

    override drawLayerQuad(offset: VF2D, scale: VF2D, tint: Pixel): void {
        
    }

    override drawDecal(decal: DecalInstance): void {
        
    }

    override createTexture(width: number, height: number, filtered: boolean = false, clamp: boolean = true): number {
        return 0;
    }

    override updateTexture(id: number, sprite: Sprite): void {
        
    }

    override readTexture(id: number, sprite: Sprite): void {
        
    }

    override deleteTexture(id: number): number {
        return 0;
    }

    override applyTexture(id: number): void {
        
    }

    override updateViewport(pos: VI2D, size: VI2D): void {
        
    }

    override clearBuffer(p: Pixel, depth: boolean): void {
        
    }
}

export class WebGPURenderer extends Renderer {
    constructor() {
        super();

        //this.device = navigator.gpu
    }
    
    override prepareDevice(): void {
        throw new Error('Method not implemented.');
    }
    override createDevice(params: any[], fullScreen: boolean, vSync: boolean): RCode {
        throw new Error('Method not implemented.');
    }
    override destroyDevice(): RCode {
        throw new Error('Method not implemented.');
    }
    override displayFrame(): void {
        throw new Error('Method not implemented.');
    }
    override prepareDrawing(): void {
        throw new Error('Method not implemented.');
    }
    override setDecalMode(mode: DecalMode): void {
        throw new Error('Method not implemented.');
    }
    override drawLayerQuad(offset: VF2D, scale: VF2D, tint: Pixel): void {
        throw new Error('Method not implemented.');
    }
    override drawDecal(decal: DecalInstance): void {
        throw new Error('Method not implemented.');
    }
    override createTexture(width: number, height: number, filtered?: boolean, clamp?: boolean): number {
        return 0;
    }
    override updateTexture(id: number, sprite: Sprite): void {
        //throw new Error('Method not implemented.');
    }
    override readTexture(id: number, sprite: Sprite): void {
        throw new Error('Method not implemented.');
    }
    override deleteTexture(id: number): number {
        throw new Error('Method not implemented.');
    }
    override applyTexture(id: number): void {
        //throw new Error('Method not implemented.');
    }
    override updateViewport(pos: VI2D, size: VI2D): void {
        throw new Error('Method not implemented.');
    }
    override clearBuffer(p: Pixel, depth: boolean): void {
        throw new Error('Method not implemented.');
    }
}