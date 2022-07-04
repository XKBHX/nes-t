import { mat4, vec3 } from 'gl-matrix';

export const initGPU = (adapter: GPUAdapter, device: GPUDevice, context: GPUCanvasContext) => {
    const canvas = <HTMLCanvasElement>context.canvas;
    const pixelRatio = window.devicePixelRatio || 1;
    const aspectRation = canvas.clientWidth / canvas.clientHeight;
    const size: GPUExtent3D = [ canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio ]
    const format = context.getPreferredFormat(adapter);
    const compositingAlphaMode: GPUCanvasCompositingAlphaMode = 'premultiplied';

    console.log({ pixelRatio, aspectRation });
    console.log({ w: canvas.clientWidth, h: canvas.clientHeight });
    context.configure({ device, format, size, compositingAlphaMode });

    return format;
};

export const createGPUBuffer = (device: GPUDevice, data: Float32Array, usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST): GPUBuffer => {
    const size = data.byteLength;
    const bufferDescriptor: GPUBufferDescriptor = { size, usage, mappedAtCreation: true };
    const buffer = device.createBuffer(bufferDescriptor);

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();

    return buffer;
};

export const createEmptyGPUBuffer = (device: GPUDevice, size: number, usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) => {
    const bufferDescriptor: GPUBufferDescriptor = { size, usage };
    const buffer = device.createBuffer(bufferDescriptor);

    return buffer;
};

export const createProjectionView = (aspectRatio = 1.0, cameraPosition: vec3 = vec3.fromValues(2, 2, 4), lookDirection: vec3 = vec3.fromValues(0, 0, 0), upDirection: vec3 = vec3.fromValues(0, 1, 0)) => {
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();
    const viewProjectionMatrix = mat4.create();

    mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
    mat4.perspective(projectionMatrix, 2 * Math.PI / 5, aspectRatio, 0.1, 100.0);
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    const cameraOptions = {
        eye: cameraPosition,
        center: lookDirection,
        zoomMax: 100,
        zoomSpeed: 2,
    };

    return { viewMatrix, projectionMatrix, viewProjectionMatrix, cameraOptions };
};

export const createTransform = (modelMatrix: mat4, translation: vec3 = vec3.fromValues(0, 0, 0), rotation: vec3 = vec3.fromValues(0, 0, 0), scaling: vec3 = vec3.fromValues(1, 1, 1)) => {
    const rotateXMatrix = mat4.create();
    const rotateYMatrix = mat4.create();
    const rotateZMatrix = mat4.create();
    const translateMatrix = mat4.create();
    const scaleMatrix = mat4.create();

    mat4.fromXRotation(rotateXMatrix, rotation[0]);
    mat4.fromYRotation(rotateYMatrix, rotation[1]);
    mat4.fromZRotation(rotateZMatrix, rotation[2]);
    mat4.fromTranslation(translateMatrix, translation);
    mat4.fromScaling(scaleMatrix, scaling);
    mat4.multiply(modelMatrix, rotateXMatrix, scaleMatrix);
    mat4.multiply(modelMatrix, rotateYMatrix, modelMatrix);
    mat4.multiply(modelMatrix, rotateZMatrix, modelMatrix);
    mat4.multiply(modelMatrix, translateMatrix, modelMatrix);
};

export const createAnimation = (draw: any, rotation: vec3 = vec3.fromValues(0, 0, 0), isAnimated: boolean = true) => {
    console.log('Create Animation');
    const step = () => {
        if(isAnimated) {
            rotation[0] += 0.01;
            rotation[1] += 0.01;
            rotation[2] += 0.01;
        } else {
            rotation = [ 0, 0, 0 ];
        }

        draw();
        requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
};
