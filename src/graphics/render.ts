import {} from 'tslib';
import { RCode } from '.';
import { Decal, DecalInstance, DecalMode, DecalStructure } from './decal';
import { GameEngine } from './engine';
import { Pixel, WHITE } from './pixel';
import { ResourcePack } from './resource';
import { Sprite } from './sprite';
import { createGPUBuffer } from '../gpu';
import { GPUViewportDescriptor, ImageWebGPURenderable } from './webgpu.renderable';
import square from '../square.shader';
import textureShader from '../texture.shader';

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

export const createDefaultLayerDesc = (): LayerDesc => (<LayerDesc><unknown>{
    offset: new VF2D(),
	scale: new VF2D(1, 1),
	show: false,
	update: false,
    drawTarget: new Renderable(),
    resID: 0,
    vecDecalInstance: [],
    tint: WHITE,
});

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

    load(file: ImageBitmap, pack: ResourcePack, filter: boolean = false, clamp: boolean = true): RCode {
        this._sprite = new Sprite();
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

export class ResourceBuffer {
    private memory: ArrayBuffer = <ArrayBuffer><unknown>undefined;

    constructor() {}

    //addFile()
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

let count = 0;

export class WebGPURenderer extends Renderer {
    private adapter: GPUAdapter = <GPUAdapter><unknown>undefined;
    private device: GPUDevice = <GPUDevice><unknown>undefined;
    private context: GPUCanvasContext = <GPUCanvasContext><unknown>undefined;
    private format: GPUTextureFormat = <GPUTextureFormat><unknown>undefined;
    private decalMode: DecalMode;
    private decalStructure: DecalStructure = DecalStructure.FAN
    private sync: boolean = false;
    private displayVertexData: Float32Array = <Float32Array><unknown>undefined;
    private displayColorData: Float32Array = <Float32Array><unknown>undefined;
    private mainSprite: Sprite = <Sprite><unknown>undefined;
    private defaultTexture: GPUTexture = <GPUTexture><unknown>undefined;
    private currentClearColor: GPUColorDict = { r: 0, g: 0, b: 0, a: 0 };
    private mouseX: number = 0;
    private mouseY: number = 0;
    
    constructor() {
        super();

        //const descriptor: GPUTextureDescriptor = { format: this.format,  };

        //this.defaultTexture = this.device.createTexture(descriptor);
        this.decalMode = DecalMode.NORMAL;

        document.addEventListener('mousemove', e => {
            this.mouseX = e.pageX / window.innerWidth * 2;
            this.mouseY = e.pageY / window.innerHeight * 2;
        }, false);
    }

    setup(adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) {
        this.adapter = adapter;
        this.device = device;
        this.context = context;
        this.format = format;

        this.defaultTexture = this.context.getCurrentTexture();
    }
    
    override prepareDevice(): void {
    }
    
    override createDevice(params: any[], fullScreen: boolean, vSync: boolean): RCode {
        this.sync = vSync;
        
        return RCode.OK;
    }
    override destroyDevice(): RCode {
        console.log('GPU Device is DESTROYED!!!!')
        this.context.unconfigure();
        this.device.destroy();

        return RCode.OK;
    }
    override displayFrame(): void {
        
    }
    override prepareDrawing(): void {
        this.decalMode = DecalMode.NORMAL;
        this.decalStructure = DecalStructure.FAN;
    }
    override setDecalMode(mode: DecalMode): void {
        this.decalMode = mode;
    }
    override drawLayerQuad(offset: VF2D, scale: VF2D, tint: Pixel): void {
        // Layer quads are not submitted; avoid allocating GPU pipelines every frame.
    }
    override drawDecal(decal: DecalInstance): void {
        this.setDecalMode(decal.mode);
    }
    override createTexture(width: number, height: number, filtered?: boolean, clamp?: boolean): number {
        console.log('Renderer::createdTexture()');

        //const usage = GPUTextureUsage.COPY_DST;
        //const descriptor: GPUTextureDescriptor = { size: [ width, height ], usage, format: this.format };
        //const newTexture = this.device.createTexture(descriptor);

        //this.textures.push(newTexture);
        return 0; //this.textures.findIndex(texture => texture === newTexture);
    }
    override updateTexture(id: number, sprite: Sprite): void {
        this.mainSprite = sprite;
        //console.log('Renderer::updateTexture()');
        

        //if(pixelCount > 0) console.log('Pixel Count', pixelCount);

        //throw new Error('Method not implemented.');
    }
    override readTexture(id: number, sprite: Sprite): void {
        console.log('Renderer::readTexture()');

        //throw new Error('Method not implemented.');
    }
    override deleteTexture(id: number): number {
        console.log('Renderer::deleteTexture()');

        throw new Error('Method not implemented.');
    }
    override applyTexture(id: number): void {
        //console.log('Renderer::applyTexture()');

        //throw new Error('Method not implemented.');
    }
    override updateViewport(pos: VI2D, size: VI2D): void {
        // Display is submitted through drawImages(); do not allocate per-pixel GPU buffers here.
    }
    
    override clearBuffer(p: Pixel, depth: boolean): void {
        this.currentClearColor = this.getGPUColor(p);
    }

    getPixelCount(): number {
        const dimensions = this.getScreenDimensions();
        
        return dimensions.x * dimensions.y;
    }

    getScreenDimensions(): VI2D {
        const canvas = <HTMLCanvasElement>this.context.canvas;
        const width = canvas.width;
        const height = canvas.height;

        return new VI2D(width, height);
    }

    getGPUColor(p: Pixel): GPUColorDict {
        if (!p) return this.currentClearColor;

        return { r: p.red / 255, g: p.green / 255, b: p.blue / 255, a: p.alpha / 255 };
    }

    getQuadArrayBuffer(pos1: VF2D, pos2: VF2D, pos3: VF2D, pos4: VF2D): Float32Array {
        const buffer = new Float32Array(6 * 2);

        return buffer;
    }

    getVertexState(): GPUVertexState {
        const vertexBufferAttributes: GPUVertexAttribute[] = [
            { shaderLocation: 0, format: 'float32x2', offset: 0 },
            { shaderLocation: 1, format: 'float32x4', offset: 0 },
        ]
        const vertexBuffers: GPUVertexBufferLayout[] = [
            { arrayStride: 8, attributes: [ vertexBufferAttributes[0] ] },
            { arrayStride: 16, attributes: [ vertexBufferAttributes[1] ] },
        ]
        
        const module = this.device.createShaderModule({ code: square });

        return { module, entryPoint: 'vs_main', buffers: vertexBuffers };
    }

    getFragmentState(): GPUFragmentState {
        const module = this.device.createShaderModule({ code: square });

        return { module, entryPoint: 'fs_main', targets: [{ format: this.format }] };
    }

    getRenderPassDescriptor(): GPURenderPassDescriptor {
        const view = this.context.getCurrentTexture().createView();
        const colorAttachment: GPURenderPassColorAttachment = {
            view,
            clearValue: this.currentClearColor,
            loadOp: 'clear',
            storeOp: 'store'
        };
        
        return { colorAttachments: [ colorAttachment ] };
    }

    getPrimitive(): GPUPrimitiveState {
        return { topology: 'triangle-list' };
    }

    getColorBuffer(c: GPUColorDict, size: number): Float32Array {
        const arrayLength = size * 4;
        const buffer = new Float32Array(arrayLength);

        for (let x = 0; x < arrayLength; x += 4) {
            buffer[x] = c.r;
            buffer[x + 1] = c.g;
            buffer[x + 2] = c.b;
            buffer[x + 3] = c.a;
        }

        return buffer;
    }

    drawImage(sprite: Sprite, scale: VF2D, offset: VF2D = new VF2D(0, 0), imageFile: ImageBitmap =  new ImageBitmap()): void {
        const pixelCount = sprite.width * sprite.height;
        const spriteDimensions = new VI2D(sprite.width, sprite.height);
        const dimensions = this.getScreenDimensions();
        const format = this.format;
        const width = dimensions.x;
        const height = dimensions.y;
        const vertexData = new Float32Array([
            +1, +1,    1, 0,
            -1, +1,    0, 0,
            -1, -1,    0, 1,
            +1, -1,    1, 1,
            +1, +1,    1, 0,
            -1, -1,    0, 1,
        ]);

        if(pixelCount !== (sprite.width * sprite.height)) console.log('***Size Mismatch***', sprite, pixelCount);

        const attributes: GPUVertexAttribute[] = [
            { shaderLocation: 0, format: 'float32x2', offset: 0 },
            { shaderLocation: 1, format: 'float32x2', offset: 2 * 4 },
        ];
        const vertexBuffers: GPUVertexBufferLayout[] = [
            { arrayStride: 4 * 4, attributes },
        ];
        
        const clearValue: GPUColorDict = { r: 1, g: 0, b: 0, a: 1 };
        //console.log('Clear Color', clearValue);
        const blend: GPUBlendState = {
            alpha: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
            color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }
        };
        
        const vertexBuffer = createGPUBuffer(this.device, vertexData);
        const module = this.device.createShaderModule({ code: textureShader });
        
        const vertex: GPUVertexState = { module, entryPoint: 'vs_main', buffers: vertexBuffers };
        const fragment: GPUFragmentState = { module, entryPoint: 'fs_main', targets: [{ format, blend }] };
        const primitive: GPUPrimitiveState = { topology: 'triangle-list' };
        const depthStencil: GPUDepthStencilState = { depthWriteEnabled: false, depthCompare: 'less', format: 'rgba8unorm' };
        
        
        const textureSize = { width: imageFile.width, height: imageFile.height };
        const descriptor: GPUTextureDescriptor = {
            size: textureSize,
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };
        
        const texture = this.device.createTexture(descriptor);
        const view = this.context.getCurrentTexture().createView();
        
        
        
        this.device.queue.writeBuffer(vertexBuffer, 0, vertexData);
        
        const colorAttachment: GPURenderPassColorAttachment = { view, clearValue, loadOp: 'clear', storeOp: 'store' }; 
        const passDescriptor: GPURenderPassDescriptor = { colorAttachments: [ colorAttachment ] }
        
        this.device.queue.copyExternalImageToTexture({ source: imageFile }, { texture }, textureSize);
        
        const sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });
        
        const samplerBindingLayout: GPUSamplerBindingLayout = { type: 'filtering' }
        const textureBindingLayout: GPUTextureBindingLayout = { sampleType: 'float' }
        const bindGroupLayout = this.device.createBindGroupLayout({ entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: samplerBindingLayout },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: textureBindingLayout }
        ] })
        const textureGroup = this.device.createBindGroup({
            label: 'Image Texture',
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() },
            ]
        });
        const layout: GPUPipelineLayout = this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] })
        
        const pipelineDescriptor: GPURenderPipelineDescriptor = { vertex, fragment, primitive, layout };
        const pipeline = this.device.createRenderPipeline(pipelineDescriptor)
        
        let aspect = imageFile.width / imageFile.height;
        const position = { x: 0, y: 0 };
        const _scale = { x: 1, y: 1 };
        
        const commandEncoder = this.device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(passDescriptor)
        const cWidth = (this.context.canvas as HTMLCanvasElement).clientWidth
        const cHeight = (this.context.canvas as HTMLCanvasElement).clientHeight
        const tWidth = cWidth * 0.5
        const tHeight = cHeight * 0.5
        const screenPosX = (cWidth * 780 - 1) + ( 2 * cWidth)
        const screenPosY = (cWidth * 780 - 1) + ( 2 * cWidth)

        //console.log(cWidth, cHeight)
        
        renderPass.setPipeline(pipeline)
        renderPass.setBindGroup(0, textureGroup)
        renderPass.setVertexBuffer(0, vertexBuffer)
        renderPass.setViewport(Math.min(1560 - tWidth, offset.x), Math.min(960 - tHeight, offset.y), tWidth, cHeight * 0.5, 0, 0)
        renderPass.draw(6)
        renderPass.end()
        this.device.queue.submit([ commandEncoder.finish() ])
    }

    drawImages(...imageRenderables: ImageWebGPURenderable[]) {
        const commandEncoder = this.getCommandEncoder();
        const renderPass = this.getImageRenderPassEncoder(commandEncoder);
        let pos = 0;

        for (const renderable of imageRenderables) {
            const [ tWidth, tHeight ] = renderable.size;
            const index = renderable.renderIndex;
            const bindGroup = renderable.getBingGroup(this.device);
            const vertexBuffer = renderable.getVertexBuffer(this.device);
            const viewportDescriptor: GPUViewportDescriptor = {
                x: 0,
                y: 0,
                width: tWidth,
                height: tHeight,
                minDepth: 0,
                maxDepth: 1,
            };

            const { x, y, width, height, minDepth, maxDepth } = viewportDescriptor;

            
            renderable.setViewportDescriptor(x, y, width, height, minDepth, maxDepth);
            renderable.uploadPixels(this.device);

            renderPass.setPipeline(renderable.getPipeline(this.device));
            renderPass.setBindGroup(index, bindGroup);
            renderPass.setVertexBuffer(index, vertexBuffer);
            renderPass.setViewport(x, y, width, height, minDepth, maxDepth);
            renderPass.draw(6)

            pos++;
        }

        renderPass.end()
        this.device.queue.submit([ commandEncoder.finish() ])
    }

    getCommandEncoder(): GPUCommandEncoder {
        return this.device.createCommandEncoder();
    }

    getImageRenderPassEncoder(commandEncoder: GPUCommandEncoder): GPURenderPassEncoder {
        const view = this.context.getCurrentTexture().createView();
        const clearValue: GPUColorDict = { r: 0, g: 0, b: 128 / 255, a: 1 };
        const colorAttachment: GPURenderPassColorAttachment = { view, clearValue, loadOp: 'clear', storeOp: 'store' }; 
        const passDescriptor: GPURenderPassDescriptor = { colorAttachments: [ colorAttachment ] };
        const renderPass = commandEncoder.beginRenderPass(passDescriptor);

        return renderPass;
    }

    drawColors() {}

    getVertexBufferFromDimensions(dimensions: VI2D, offset: VF2D = new VF2D(0, 0)): Float32Array {
        const pixelCount = dimensions.x * dimensions.y;
        const width = dimensions.x;
        const height = dimensions.y;
        const screenDimensions = this.getScreenDimensions();
        const vertexData = new Float32Array(2 * pixelCount * 1);
        
        for (let x = 0; x < pixelCount; x ++) {  
            const a = -1 + (((x % width) / screenDimensions.x) * 2);
            const b =  1 - ((Math.floor(x / width) / screenDimensions.y) * 2);
            
            vertexData[2 * x] = a + this.mouseX; 
            vertexData[2 * x + 1] = b - this.mouseY;
            //vertexData[4 * x + 2] = a + 0.1;
            //vertexData[4 * x + 3] = b + 0.1;
        }

        return vertexData;
    }

    getColorBufferFromPixels(pixels: Pixel[]): Float32Array {
        const pixelCount = pixels.length;
        const colorData = new Float32Array(4 * pixelCount * 1);
        
        for (let i = 0; i < pixelCount; i += 4) {
            const color = this.getGPUColor(pixels[i]);
            colorData[4 * i] = color.r; 
            colorData[4 * i + 1] = color.g; 
            colorData[4 * i + 2] = color.b; 
            colorData[4 * i + 3] = color.a; 
            //colorData[8 * i + 4] = color.r; 
            //colorData[8 * i + 5] = color.g; 
            //colorData[8 * i + 6] = color.b; 
            //colorData[8 * i + 7] = color.a; 
        }

        return colorData;
    }
}