export default /* wgsl */`

@group(0)
@binding(0)
var Sampler: sampler;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) fragUV : vec2<f32>,
    @location(1) fragPosition: vec4<f32>
};

@stage(vertex)
fn vs_main(@location(0) position : vec4<f32>, @location(1) uv : vec2<f32>) -> VertexOutput {
    var output : VertexOutput;
    output.Position = position;
    output.fragUV = uv;
    output.fragPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
    return output;
}


@group(0)
@binding(1)
var Texture: texture_2d<f32>;

@stage(fragment)
fn fs_main(@location(0) fragUV: vec2<f32>, @location(1) fragPosition: vec4<f32>) -> @location(0) vec4<f32> {
    return textureSample(Texture, Sampler, fragUV);
}
`;