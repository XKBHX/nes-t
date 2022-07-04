import { RCode } from '.';
import { ImageLoader, StandardImageLoader } from './image.loader';
import { Pixel } from './pixel';
import { VI2D } from './render';
import { ResourcePack } from './resource';

export enum SpriteMode { NORMAL, PERIODIC, CLAMP }
export enum Flip { NONE = 0, HORIZ = 1, VERT = 2 }

export class Sprite {
    static loader: ImageLoader = new StandardImageLoader();
    
    public width: number = 0;
    public height: number = 0;
    public colData: Pixel[] = [];
    public modeSample: SpriteMode = SpriteMode.NORMAL;

    constructor() {}

    static createSpriteFromBlob(blob: ArrayBuffer): Sprite {
        console.log('Sprite.createSpriteFromBlob()');
        return new Sprite();
    }
    
    static createSpriteFromFile(imageFile: ImageBitmap, pack: ResourcePack = <ResourcePack><unknown>undefined): Sprite {
        console.log('Sprite.createSpriteFromFile()');
        const s = new Sprite();
        s.loadFromFile(imageFile, pack);

        return s;
    }
    
    static createSpriteFromDimensions(width: number, height: number): Sprite {
        const s = new Sprite();
        s.width = width;
        s.height = height;

        for (let x = 0; x < width * height; x++) {
            s.colData.push(Pixel.defaultPixel());
        }

        return s;
    }

    static cloneSprite(sprite: Sprite): Sprite {
        const s = Sprite.createSpriteFromDimensions(sprite.width, sprite.height);
        s.colData = sprite.colData;
        s.modeSample = sprite.modeSample;

        return s;
    }

    loadFromFile(imageFile: ImageBitmap, pack: ResourcePack = <ResourcePack><unknown>undefined):RCode {
        return Sprite.loader.loadImageResource(this, imageFile, pack);
    }

    setSampleMode(mode: SpriteMode = SpriteMode.NORMAL): void { this.modeSample = mode; }

    getPixel(x: number, y: number): Pixel {
        if (this.modeSample === SpriteMode.NORMAL) {
			if (x >= 0 && x < this.width && y >= 0 && y < this.height)
				return this.colData[y * this.width + x];
			else
				return new Pixel(0, 0, 0, 0);
		} else {
			if (this.modeSample === SpriteMode.PERIODIC)
				return this.colData[Math.abs(y % this.height) * this.width + Math.abs(x % this.width)];
			else
				return this.colData[Math.max(0, Math.min(y, this.height - 1)) * this.width + Math.max(0, Math.min(x, this.width - 1))];
		}
    }

    setPixel(x: number, y: number, p: Pixel): boolean {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.colData[y * this.width + x] = p;
            return true;
        }

        return false;
    }

    getPixelByPos(pos: VI2D): Pixel { return this.getPixel(pos.x, pos.y); }
    setPixelByPos(pos: VI2D, p:Pixel): boolean { return this.setPixel(pos.x, pos.y, p); }
    
    sample(x: number, y: number): Pixel {
        const sx = Math.min(x * this.width, this.width - 1);
		const sy = Math.min(y * this.height, this.height - 1);
		return this.getPixel(sx, sy);
    }
    
    sampleBL(u: number, v: number): Pixel {
        u = u * this.width - 0.5;
		v = v * this.height - 0.5;
		const x = Math.floor(u);
		const y = Math.floor(v);
		const u_ratio = u - x;
		const v_ratio = v - y;
		const u_opposite = 1 - u_ratio;
		const v_opposite = 1 - v_ratio;

		const p1 = this.getPixel(Math.max(x, 0), Math.max(y, 0));
		const p2 = this.getPixel(Math.min(x + 1, this.width - 1), Math.max(y, 0));
		const p3 = this.getPixel(Math.max(x, 0), Math.min(y + 1, this.height - 1));
		const p4 = this.getPixel(Math.min(x + 1, this.width - 1), Math.min(y + 1, this.height - 1));

		return new Pixel(
			(p1.red * u_opposite + p2.red * u_ratio) * v_opposite + (p3.red * u_opposite + p4.red * u_ratio) * v_ratio,
			(p1.green * u_opposite + p2.green * u_ratio) * v_opposite + (p3.green * u_opposite + p4.green * u_ratio) * v_ratio,
			(p1.blue * u_opposite + p2.blue * u_ratio) * v_opposite + (p3.blue * u_opposite + p4.blue * u_ratio) * v_ratio);
    }

    getData(): Pixel[] { return this.colData; }
    
    duplicate(): Sprite {
        const s = new Sprite();
        s.width = this.width;
        s.height = this.height;
        s.colData = this.colData.map(p => p.duplicate());
        s.modeSample = this.modeSample;

        return s;
    }
    
    duplicateByPosAndSize(pos: VI2D, size: VI2D): Sprite {
        const s = new Sprite();
        s.width = size.x;
        s.height = size.y;

        for (let y = 0; y < size.y; y++)
            for (let x =0; x < size.x; x++)
                s.setPixel(x, y, this.getPixel(pos.x + x, pos.y + y));

        return s;
    }
}
