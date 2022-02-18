import { RCode } from '.';
import { ImageLoader } from './image.loader';
import { Pixel } from './pixel';
import { ResourcePack } from './resource';

export enum Mode { NORMAL, PERIODIC, CLAMP }
export enum Flip { NONE = 0, HORIZ = 1, VERT = 2 }

export class Sprite {
    static loader: ImageLoader;
    
    public width: number = 0;
    public height: number = 0;
    public colData: Pixel[];
    public modeSample: Mode = Mode.NORMAL;

    constructor(private imageFile: string, private pack: ResourcePack = undefined) {}

    static createSpriteFromDimensions(width: number, height: number): Sprite { return new Sprite(''); }

    static cloneSprite(sprite: Sprite): Sprite { return new Sprite(sprite.imageFile); }

    loadFromFile(imageFile: string, pack: ResourcePack = undefined):RCode { return RCode.FAIL; }

    setSampleMode(mode: Mode = Mode.NORMAL): void {}

    getPixel(x: number, y: number): Pixel { return Pixel.defaultPixel(); }

    setPixel(x: number, y: number, p: Pixel): boolean { return false; }

    //getPixel(const olc::vi2d& a) const;
    //bool  SetPixel(const olc::vi2d& a, Pixel p);
    sample(x: number, y: number): Pixel { return Pixel.defaultPixel(); }
    sampleBL(u: number, v: number): Pixel { return Pixel.defaultPixel(); }
    getData(): Pixel { return Pixel.defaultPixel()); }
    duplicate(): Sprite { return Sprite.cloneSprite(this); }
    //duplicate(const olc::vi2d& vPos, const olc::vi2d& vSize);
}