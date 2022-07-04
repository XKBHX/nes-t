import { WebGPURenderer } from './graphics/render';
import { renderer } from './graphics/platform';
import { cubeColor, cubeData } from './cube.data';
import shader from './triangle.shader';
import square from './square.shader';
import cube from './cube.shader';
import { mat4, vec3 } from 'gl-matrix';
import { createEmptyGPUBuffer, createGPUBuffer, createProjectionView, initGPU, createTransform, createAnimation } from './gpu';
//import { Cartridge } from './cartridge';
import { NESGameEngine } from './nes';
import { Key } from './graphics';
import flower from './rom/flower-watercolor-red.png';
import no from './rom/red-no-smoke.webp';
import rom from './rom/nestest.nes';

//console.log('NES Emultaor')
//console.log(navigator.gpu)

let imageData: ImageBitmap;
let romData: Uint8Array;
let adapter: GPUAdapter;
let device: GPUDevice;
let context: GPUCanvasContext;
let gamePad: Gamepad;
let nesEngine: NESGameEngine;

const SOUND_SAMPLE_FREQUENCY = 44100;

const canvas: HTMLCanvasElement = document.querySelector('canvas')!
const input: HTMLInputElement = <HTMLInputElement>document.getElementById('file')!
const imageInput: HTMLInputElement = <HTMLInputElement>document.getElementById('imagefile')!
const createCamera = require('3d-view-controls')

window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    console.log(e)
    gamePad = e.gamepad
})

window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
    console.log(e)
})

window.addEventListener('keydown', e => {
    //console.log('KeyDown', e.key, e.key === 'a' ? Key.A: '')

    if (!nesEngine) return;

    nesEngine.setKeyboardState(e.key, { bHeld: true, bPressed: true, bReleased: false })

})

window.addEventListener('keyup', e => {
    if (!nesEngine) return;

    nesEngine.setKeyboardState(e.key, { bHeld: false, bPressed: false, bReleased: true })
})

/* input.addEventListener('change', async (e) => {
    const file = input.files!.item(0);
    romData = <Uint8Array>(await input.files![0].arrayBuffer());

    await init().catch(console.error)
}) */

/* imageInput.addEventListener('change', async (e) => {
    const file = imageInput.files![0];
    const encodedData = <Uint8ClampedArray>(await file.arrayBuffer());
    const ending = imageInput.files![0].name.split('.')[1];
    const init = { type: `image/${ending}`, data: encodedData };
    const img = document.createElement('img');
    const imgUrl = URL.createObjectURL(file);
    const image = new Image();

    img.src = imgUrl;
    image.src = flower;
    await img.decode();

    console.log('Image -- ', image);

    imageData = await createImageBitmap(image);

    const cnstrctr: any = (<any>window).ImageDecoder;
    const decoder = new cnstrctr(init);
    const decodedData = await decoder.decode({ frameIndex: 0 });
    console.log('Image Data', decodedData, imageData);

    if('ImageDecoder' in window) {
        console.log(window);
        console.log('ImageDecoder');
        
        const imageFrame = decodedData.image
        const offCanvas: HTMLCanvasElement = new (<any>window).OffscreenCanvas(imageFrame.codedWidth, imageFrame.codedHeight);
        const cxt: CanvasRenderingContext2D = offCanvas.getContext('2d', { alpha: true })!;

        cxt.drawImage(imageFrame, 0, 0);
        //imageData = cxt.getImageData(0, 0, imageFrame.codedWidth, imageFrame.codedHeight);

        const url = 'https://www.publicdomainpictures.net/pictures/290000/velka/flower-watercolor-red.png';
        //const res = await fetch(url);
        //const img = await res.blob();

        
    }
}) */

const createTriangle = (adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) => {
    const module = device.createShaderModule({ code: shader })
    const vertex: GPUVertexState = { module, entryPoint: 'vs_main' }
    const fragment: GPUFragmentState = { module, entryPoint: 'fs_main', targets: [{ format }] }
    const primitive: GPUPrimitiveState = { topology: 'triangle-list' }
    const layout: GPUPipelineLayout = <GPUPipelineLayout>{}
    const pipelineDescriptor: GPURenderPipelineDescriptor = { vertex, fragment, primitive, layout }
    const commandEncoder = device. createCommandEncoder()
    const view = context.getCurrentTexture().createView()
    const colorAttachment: GPURenderPassColorAttachment = { view, clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, loadOp: 'clear', storeOp: 'store' }
    const passDescriptor: GPURenderPassDescriptor = { colorAttachments: [ colorAttachment ]}
    //const renderPass = commandEncoder.beginRenderPass(passDescriptor)
    //const pipeline = device.createRenderPipeline(pipelineDescriptor)

    //renderPass.setPipeline(pipeline)
    //renderPass.draw(3, 1, 0, 0)
    //renderPass.end()
    //device.queue.submit([ commandEncoder.finish() ])
};

const createSquare = (adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) => {
    const vertexData = new Float32Array([
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
        -0.5,  0.5,
         0.5, -0.5,
         0.5,  0.5,
    ])

    const colorData = new Float32Array([
        1, 0, 0,
        0, 1, 0,
        1, 1, 0,
        1, 1, 0,
        0, 1, 0,
        0, 0, 1,
    ])

    const vertexBufferAttributes: GPUVertexAttribute[] = [
        { shaderLocation: 0, format: 'float32x2', offset: 0 },
        { shaderLocation: 1, format: 'float32x3', offset: 0 },
    ]
    const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: 8, attributes: [ vertexBufferAttributes[0] ] },
        { arrayStride: 12, attributes: [ vertexBufferAttributes[1] ] },
    ]
    
    const vertexBuffer = createGPUBuffer(device, vertexData)
    const colorBuffer = createGPUBuffer(device, colorData)
    const module = device.createShaderModule({ code: square })
    const vertex: GPUVertexState = { module, entryPoint: 'vs_main', buffers: vertexBuffers }
    const fragment: GPUFragmentState = { module, entryPoint: 'fs_main', targets: [{ format }] }
    const primitive: GPUPrimitiveState = { topology: 'triangle-list' }
    const layout: GPUPipelineLayout = <GPUPipelineLayout>{}
    const pipelineDescriptor: GPURenderPipelineDescriptor = { vertex, fragment, primitive, layout }
    const commandEncoder = device. createCommandEncoder()
    const view = context.getCurrentTexture().createView()
    const colorAttachment: GPURenderPassColorAttachment = { view, clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, loadOp: 'clear', storeOp: 'store' }
    const passDescriptor: GPURenderPassDescriptor = { colorAttachments: [ colorAttachment ]}
    const renderPass = commandEncoder.beginRenderPass(passDescriptor)
    const pipeline = device.createRenderPipeline(pipelineDescriptor)

    renderPass.setPipeline(pipeline)
    renderPass.setVertexBuffer(0, vertexBuffer)
    renderPass.setVertexBuffer(1, colorBuffer)
    renderPass.draw(6)
    renderPass.end()
    device.queue.submit([ commandEncoder.finish() ])

};

const createCube = (adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext, format: GPUTextureFormat) => {
    const vertexBufferAttributes: GPUVertexAttribute[] = [
        { shaderLocation: 0, format: 'float32x3', offset: 0 },
        { shaderLocation: 1, format: 'float32x3', offset: 0 },
    ]
    const vertexBuffers: GPUVertexBufferLayout[] = [
        { arrayStride: 12, attributes: [ vertexBufferAttributes[0] ] },
        { arrayStride: 12, attributes: [ vertexBufferAttributes[1] ] },
    ]
    
    const numberOfVertices = cubeData.length / 3;
    const vertexBuffer = createGPUBuffer(device, cubeData)
    const colorBuffer = createGPUBuffer(device, cubeColor)
    const module = device.createShaderModule({ code: cube })
    const vertex: GPUVertexState = { module, entryPoint: 'vs_main', buffers: vertexBuffers }
    const fragment: GPUFragmentState = { module, entryPoint: 'fs_main', targets: [{ format }] }
    const primitive: GPUPrimitiveState = { topology: 'triangle-list' }
    const layout: GPUPipelineLayout = <GPUPipelineLayout>{}
    const depthStencil: GPUDepthStencilState = { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' }
    const pipelineDescriptor: GPURenderPipelineDescriptor = { vertex, fragment, primitive, layout, depthStencil }
    const pipeline = device.createRenderPipeline(pipelineDescriptor)

    const canvas = <HTMLCanvasElement>context.canvas
    const modelMatrix = mat4.create()
    const mvpMatrix = mat4.create()
    const vp = createProjectionView(canvas.width / canvas.height)
    const vMatrix = mat4.create()
    const vpMatrix = vp.viewProjectionMatrix
    const uniformBufferUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST

    let rotation = vec3.fromValues(0, 0, 0)
    let camera = createCamera(canvas, vp.cameraOptions)
    
    const size = 64
    const uniformBuffer = createEmptyGPUBuffer(device, size, uniformBufferUsage)
    const resource: GPUBindingResource = { buffer: uniformBuffer, offset: 0, size }
    const entry: GPUBindGroupEntry = { binding: 0, resource }
    const uniformBindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [ entry ] })
    
    let view = context.getCurrentTexture().createView()
    
    const textureDescriptor: GPUTextureDescriptor = {
        size: [ canvas.width * window.devicePixelRatio, canvas.height * window.devicePixelRatio, 1 ],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    }

    const depthTexture = device.createTexture(textureDescriptor)
    const colorAttachments: GPURenderPassColorAttachment[] = [{ view, clearValue: { r: 0.2, g: 0.247, b: 0.314, a: 1.0 }, loadOp: 'clear', storeOp: 'store' }]

    const depthStencilAttachment: GPURenderPassDepthStencilAttachment = {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
    }
    
    const passDescriptor: GPURenderPassDescriptor = { colorAttachments, depthStencilAttachment }
    
    function draw() {
        let attachments = <GPURenderPassColorAttachment[]>passDescriptor.colorAttachments
        
        createTransform(modelMatrix, vec3.fromValues(0, 0, 0), rotation)
        mat4.multiply(mvpMatrix, vpMatrix, modelMatrix)
        device.queue.writeBuffer(uniformBuffer, 0, <ArrayBuffer>mvpMatrix)
        view = context.getCurrentTexture().createView()
        attachments[0].view = view
        
        //const commandEncoder = device. createCommandEncoder()
        //const renderPass = commandEncoder.beginRenderPass(passDescriptor)
        //
        //renderPass.setPipeline(pipeline)
        //renderPass.setVertexBuffer(0, vertexBuffer)
        //renderPass.setVertexBuffer(1, colorBuffer)
        //renderPass.setBindGroup(0, uniformBindGroup)
        //renderPass.draw(numberOfVertices)
        //renderPass.end()
        //device.queue.submit([ commandEncoder.finish() ])
    }

    createAnimation(draw, rotation, true)
};

const init = async () => {
    const image = new Image()
    image.src = flower
    await image.decode()

    romData = new Uint8Array(await (await fetch(rom)).arrayBuffer())
    imageData = await createImageBitmap(image)
    
    if (!adapter) adapter = <GPUAdapter>(await navigator.gpu.requestAdapter())
    if (!adapter) throw new Error('No GPU adpters are available')
    
    if (!device) device = await adapter.requestDevice()
    if (!context) context = canvas.getContext('webgpu')!
    
    const format = initGPU(adapter, device, context)
    const webGPURenderer = <WebGPURenderer>renderer
    
    webGPURenderer.setup(adapter, device, context, format)
    
    //createTriangle(adapter, device, context, format);
    //createSquare(adapter, device, context, format);
    //createCube(adapter, device, context, format)

    

    nesEngine = new NESGameEngine(romData, imageData);

    nesEngine.construct(780, 480, 2, 2)
    nesEngine.start()
    
    //console.log(canvas)
    //console.log(nesEngine)
    //console.log(adapter)
    //console.log(device)
    //console.log(context)
    //console.log(renderer)
    console.log('Screean Size', nesEngine.screenWidth(), nesEngine.screenHeight())
};

init().catch(console.error)

