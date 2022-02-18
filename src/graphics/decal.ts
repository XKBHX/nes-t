import { Sprite } from './sprite';

export enum DecalMode {
	NORMAL,
	ADDITIVE,
	MULTIPLICATIVE,
	STENCIL,
	ILLUMINATE,
	WIREFRAME,
	MODEL3D,
}

export enum DecalStructure {
	LINE,
	FAN,
	STRIP,
	LIST
};

export interface DecalInstance {
	decal: Decal;
	pos: VF2D[];
	uv: VF2D[];
	w: number[];
	tint: Pixel[];
	mode: DecalMode; // NORMAL
	structure: DecalStructure; // FAN
	points: Uint32Array[0]; // 0
}

export class Decal {
    public id: number = -1;
    public sprite: Sprite;
    public uvScale: VF2D = [ 1.0, 1.0 ];

    constructor(sprite: Sprite, filter: boolean = false, clamp: boolean = true) {}

    static createFromExistingResource(existingTextureResource: Uint32Array[0], sprite: Sprite): Decal {
        return new Decal(sprite);
    }

    update(): void {}
    updateSprite(): void {}
}