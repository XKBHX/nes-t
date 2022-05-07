import { Pixel } from './pixel';
import { renderer } from './platform';
import { VF2D } from './render';
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
    //public sprite: Sprite;
    public uvScale: VF2D = new VF2D(1.0, 1.0);

    constructor(public sprite: Sprite, filter: boolean = false, clamp: boolean = true) {
		this.id = -1;

		if(!sprite) return;

		this.id = renderer.createTexture(sprite.width, sprite.height, filter, clamp);
		this.update();
	}

    static createFromExistingResource(existingTextureResource: Uint32Array[0], sprite: Sprite): Decal {
        if(!sprite) return <Decal><unknown>undefined;

		const decal = new Decal(sprite);
		decal.id = existingTextureResource;

		return decal;
    }

    update(): void {
		if(!this.sprite) return;

		this.uvScale = new VF2D(1.0/this.sprite.width, 1.0/this.sprite.height);
		renderer.applyTexture(this.id);
		renderer.updateTexture(this.id, this.sprite);
	}
    updateSprite(): void {
		if (!this.sprite) return;
		
		renderer.applyTexture(this.id);
		renderer.readTexture(this.id, this.sprite);
	}
}