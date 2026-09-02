import {} from 'tslib';
import { VF2D } from './render';
import textureShader from '../texture.shader';
import { createGPUBuffer } from '../gpu';
import { Sprite } from './sprite';

export interface WebGPURenderable {}

export type GPUViewportDescriptor = {
    x: number; y: number;
    width: number; height: number;
    minDepth: number; maxDepth: number;
}

const WEBGPU_BYTES_PER_ROW_ALIGNMENT = 256;
const RGBA_BYTES = 4;

export class ImageWebGPURenderable implements WebGPURenderable {
    scale: VF2D = new VF2D(1, 1);
    offset: VF2D = new VF2D(1, 1);
    format: GPUTextureFormat = 'rgba8unorm';
    texture: GPUTexture = <GPUTexture><unknown>undefined;
    pipelineFormat: GPUTextureFormat = 'bgra8unorm';
    viewportDescriptor: GPUViewportDescriptor = <GPUViewportDescriptor>{};
    imageWidth: number;
    imageHeight: number;

    private pixelBuffer: Uint8Array = <Uint8Array><unknown>undefined;
    private pixelBytesPerRow = 0;
    private cachedPipeline: GPURenderPipeline = <GPURenderPipeline><unknown>undefined;
    private cachedBindGroupLayout: GPUBindGroupLayout = <GPUBindGroupLayout><unknown>undefined;
    private cachedBindGroup: GPUBindGroup = <GPUBindGroup><unknown>undefined;
    private cachedSampler: GPUSampler = <GPUSampler><unknown>undefined;
    private cachedVertexBuffer: GPUBuffer = <GPUBuffer><unknown>undefined;
    private cachedTextureView: GPUTextureView = <GPUTextureView><unknown>undefined;

    constructor(public image: ImageBitmap | undefined, public renderIndex: number, public size: [number, number] = [100, 100], imageWidth = 0, imageHeight = 0) {
        this.imageWidth = imageWidth || image?.width || 0;
        this.imageHeight = imageHeight || image?.height || 0;
    }

    static createFromSprite(sprite: Sprite, renderIndex: number, size: [number, number] = [100, 100]): ImageWebGPURenderable {
        const renderable = new ImageWebGPURenderable(undefined, renderIndex, size, sprite.width, sprite.height);
        renderable.updateImageFromSprite(sprite);
        return renderable;
    }

    static async createImageBitmapFromSprite(sprite: Sprite): Promise<ImageBitmap> {
        const { colData, width, height } = sprite;
        const pixelData = new Uint8ClampedArray(colData.length * RGBA_BYTES);

        for (let i = 0; i < colData.length; i++) {
            pixelData[i * RGBA_BYTES + 0] = colData[i].red;
            pixelData[i * RGBA_BYTES + 1] = colData[i].green;
            pixelData[i * RGBA_BYTES + 2] = colData[i].blue;
            pixelData[i * RGBA_BYTES + 3] = colData[i].alpha;
        }

        const imageData = new ImageData(pixelData, width, height);
        return await createImageBitmap(imageData);
    }

    updateImageFromSprite(sprite: Sprite): void {
        const { colData, width, height } = sprite;
        this.imageWidth = width;
        this.imageHeight = height;
        this.ensurePixelBuffer(width, height);

        const rowStride = this.pixelBytesPerRow;
        const buffer = this.pixelBuffer;

        for (let y = 0; y < height; y++) {
            const srcRow = y * width;
            const dstRow = y * rowStride;
            for (let x = 0; x < width; x++) {
                const pixel = colData[srcRow + x];
                const dst = dstRow + x * RGBA_BYTES;
                buffer[dst] = pixel.red;
                buffer[dst + 1] = pixel.green;
                buffer[dst + 2] = pixel.blue;
                buffer[dst + 3] = pixel.alpha;
            }
        }
    }

    uploadPixels(device: GPUDevice): void {
        const texture = this.getTexture(device);

        if (this.pixelBuffer && this.imageWidth > 0 && this.imageHeight > 0) {
            device.queue.writeTexture(
                { texture },
                this.pixelBuffer,
                { bytesPerRow: this.pixelBytesPerRow, rowsPerImage: this.imageHeight },
                { width: this.imageWidth, height: this.imageHeight }
            );
            return;
        }

        if (this.image) {
            device.queue.copyExternalImageToTexture(
                { source: this.image },
                { texture },
                { width: this.image.width, height: this.image.height }
            );
        }
    }

    getVertexData(): Float32Array {
        return new Float32Array([
            +1, +1,    1, 0,
            -1, +1,    0, 0,
            -1, -1,    0, 1,
            +1, -1,    1, 1,
            +1, +1,    1, 0,
            -1, -1,    0, 1,
        ]);
    }

    getGPUTextureDescriptor(): GPUTextureDescriptor {
        const width = this.imageWidth || this.image?.width || 1;
        const height = this.imageHeight || this.image?.height || 1;
        const { format } = this;
        const size = { width, height };
        const usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;

        return { size, format, usage };
    }

    getTexture(device: GPUDevice): GPUTexture {
        if (!this.texture) {
            const descriptor = this.getGPUTextureDescriptor();
            this.texture = device.createTexture(descriptor);
        }

        return this.texture;
    }

    getPipelineDescriptor(device: GPUDevice):GPURenderPipelineDescriptor {
        const { pipelineFormat: format } = this;

        const attributes: GPUVertexAttribute[] = [
            { shaderLocation: 0, format: 'float32x2', offset: 0 },
            { shaderLocation: 1, format: 'float32x2', offset: 2 * 4 },
        ];

        const blend: GPUBlendState = { alpha: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, color: { operation: 'add', srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' } };
        const bindGroupLayout = this.getBindGroupLayout(device);
        const buffers: GPUVertexBufferLayout[] = [{ arrayStride: 4 * 4, attributes }]
        const module = device.createShaderModule({ code: textureShader });
        const vertex: GPUVertexState = { module, entryPoint: 'vs_main', buffers };
        const fragment: GPUFragmentState = { module, entryPoint: 'fs_main', targets: [{ format, blend }] };
        const primitive: GPUPrimitiveState = { topology: 'triangle-list' };
        const layout: GPUPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

        return { vertex, fragment, primitive, layout };
    }

    getPipeline(device: GPUDevice): GPURenderPipeline {
        if (!this.cachedPipeline) {
            this.cachedPipeline = device.createRenderPipeline(this.getPipelineDescriptor(device));
        }

        return this.cachedPipeline;
    }

    getSamplerBindingLayout(): GPUSamplerBindingLayout {
        return { type: 'filtering' };
    }

    getTextureBindingLayout(): GPUTextureBindingLayout {
        return { sampleType: 'float' };
    }

    getBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (!this.cachedBindGroupLayout) {
            const samplerBindingLayout: GPUSamplerBindingLayout = this.getSamplerBindingLayout();
            const textureBindingLayout: GPUTextureBindingLayout = this.getTextureBindingLayout();
            this.cachedBindGroupLayout = device.createBindGroupLayout({ entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: samplerBindingLayout },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: textureBindingLayout }
            ] });
        }

        return this.cachedBindGroupLayout;
    }

    getBingGroup(device: GPUDevice): GPUBindGroup {
        if (!this.cachedBindGroup) {
            const bindGroupLayout = this.getBindGroupLayout(device);
            const texture = this.getTexture(device);
            if (!this.cachedSampler) {
                this.cachedSampler = device.createSampler({
                    magFilter: 'nearest',
                    minFilter: 'nearest',
                });
            }
            if (!this.cachedTextureView) {
                this.cachedTextureView = texture.createView();
            }

            this.cachedBindGroup = device.createBindGroup({
                label: `Image Texture (${this.renderIndex})`,
                layout: bindGroupLayout,
                entries: [
                    { binding: 0, resource: this.cachedSampler },
                    { binding: 1, resource: this.cachedTextureView },
                ]
            });
        }

        return this.cachedBindGroup;
    }

    getVertexBuffer(device: GPUDevice): GPUBuffer {
        if (!this.cachedVertexBuffer) {
            this.cachedVertexBuffer = createGPUBuffer(device, this.getVertexData());
        }

        return this.cachedVertexBuffer;
    }

    setViewportDescriptor(x: number = 0, y: number = 0, width: number = 0, height: number = 0, minDepth: number = 0, maxDepth: number = 0): void {
        this.viewportDescriptor = { x, y, width, height, minDepth, maxDepth };
    }

    private ensurePixelBuffer(width: number, height: number): void {
        const bytesPerRow = Math.ceil((width * RGBA_BYTES) / WEBGPU_BYTES_PER_ROW_ALIGNMENT) * WEBGPU_BYTES_PER_ROW_ALIGNMENT;
        const byteLength = bytesPerRow * height;

        if (!this.pixelBuffer || this.pixelBuffer.byteLength !== byteLength || this.pixelBytesPerRow !== bytesPerRow) {
            this.pixelBuffer = new Uint8Array(byteLength);
            this.pixelBytesPerRow = bytesPerRow;
        }
    }
}
