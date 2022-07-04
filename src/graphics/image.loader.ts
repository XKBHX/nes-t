import { Pixel, RCode } from './index';
import { MAGENTA } from './pixel';
import { ResourcePack } from './resource';
import { Sprite } from './sprite';

export interface ImageLoader {
    loadImageResource(sprite: Sprite, imageFile: ImageBitmap, pack: ResourcePack): RCode;
    saveImageResource(sprite: Sprite, imageFile: ArrayBuffer): RCode;
}

export class StandardImageLoader implements ImageLoader {
    loadImageResource(sprite: Sprite, imageFile: ImageBitmap, pack: ResourcePack): RCode {
        sprite.width = imageFile.width;
        sprite.height = imageFile.height;
        sprite.colData = [];

        const pixelCount = imageFile.width * imageFile.height;

        for (let x = 0; x < pixelCount; x += 4) {
            sprite.colData.push(MAGENTA);
        }

        return RCode.OK;
    }
    saveImageResource(sprite: Sprite, imageFile: ArrayBuffer): RCode {
        throw new Error('Method not implemented.');
    }
}