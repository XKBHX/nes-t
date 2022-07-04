import {} from 'tslib';
import { VF2D } from './render';
import textureShader from '../texture.shader';
import { createGPUBuffer } from '../gpu';

export interface WebGPURenderable {}

export type GPUViewportDescriptor = {
    x: number; y: number;
    width: number; height: number;
    minDepth: number; maxDepth: number;
}

export class ImageWebGPURenderable implements WebGPURenderable {
    scale: VF2D = new VF2D(1, 1);
    offset: VF2D = new VF2D(1, 1);
    format: GPUTextureFormat = 'rgba8unorm';
    texture: GPUTexture = <GPUTexture><unknown>undefined;
    pipelineFormat: GPUTextureFormat = 'bgra8unorm';
    viewportDescriptor: GPUViewportDescriptor = <GPUViewportDescriptor>{};
    
    constructor(public image: ImageBitmap, public renderIndex: number) {}

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
        const { width, height } = this.image;
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
        const descriptor = this.getPipelineDescriptor(device);

        return device.createRenderPipeline(descriptor);
    }

    getSamplerBindingLayout(): GPUSamplerBindingLayout {
        return { type: 'filtering' };
    }

    getTextureBindingLayout(): GPUTextureBindingLayout {
        return { sampleType: 'float' };
    }

    getBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        const samplerBindingLayout: GPUSamplerBindingLayout = this.getSamplerBindingLayout();
        const textureBindingLayout: GPUTextureBindingLayout = this.getTextureBindingLayout();
        const bindGroupLayout = device.createBindGroupLayout({ entries: [
            { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: samplerBindingLayout },
            { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: textureBindingLayout }
        ] });

        return bindGroupLayout;
    }

    getBingGroup(device: GPUDevice): GPUBindGroup {
        const bindGroupLayout = this.getBindGroupLayout(device);
        const texture = this.getTexture(device);
        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        return device.createBindGroup({
            label: `Image Texture (${this.renderIndex})`,
            layout: bindGroupLayout,
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() },
            ]
        });
    }

    getVertexBuffer(device: GPUDevice): GPUBuffer {
        const vertexData = this.getVertexData();
        
        return createGPUBuffer(device, vertexData);
    }

    setViewportDescriptor(x: number = 0, y: number = 0, width: number = 0, height: number = 0, minDepth: number = 0, maxDepth: number = 0): void {
        this.viewportDescriptor = { x, y, width, height, minDepth, maxDepth };
    }
}