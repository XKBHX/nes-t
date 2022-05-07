import { GameEngine } from './graphics/engine';
import shader from './triangle.shader';

console.log('NES Emultaor')
console.log(navigator.gpu)

const canvas: HTMLCanvasElement = document.querySelector('canvas')!

const init = async () => {
    const adapter = await navigator.gpu.requestAdapter()

    if(!adapter) throw new Error('No GPU adpters are available')
    
    
    const device = await adapter.requestDevice()
    const context = canvas.getContext('webgpu')!
    const format = 'bgra8unorm'
    const config: GPUCanvasConfiguration = { device, format }
    const module = device.createShaderModule({ code: shader })
    const vertex: GPUVertexState = { module, entryPoint: 'vs_main' }
    const fragment: GPUFragmentState = { module, entryPoint: 'fs_main', targets: [{ format }] }
    const primitive: GPUPrimitiveState = { topology: 'triangle-list' }
    const pipelineDescriptor: GPURenderPipelineDescriptor = { vertex, fragment, primitive }
    const commandEncoder = device. createCommandEncoder()

    context.configure(config)

    const view = context.getCurrentTexture().createView()
    const colorAttachment: GPURenderPassColorAttachment = { view, clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, loadOp: 'clear', storeOp: 'store' }
    const passDescriptor: GPURenderPassDescriptor = { colorAttachments: [ colorAttachment ]}
    const renderPass = commandEncoder.beginRenderPass(passDescriptor)
    const pipeline = device.createRenderPipeline(pipelineDescriptor)

    renderPass.setPipeline(pipeline)
    renderPass.draw(3, 1, 0, 0)
    renderPass.end()
    device.queue.submit([ commandEncoder.finish() ])
    
    const engine = new class extends GameEngine {
        onUserCreate(): boolean { return false; }
        onUserUpdate(elapsedTime: number): boolean { return false; }
        onUserDestroy(): boolean { return false; }
        configureSystem(): void {}
    }
    
    console.log(canvas)
    console.log(engine)
    console.log(adapter)
    console.log(device)
    console.log(context)
};

init().catch(console.error)
