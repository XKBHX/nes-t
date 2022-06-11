import { Pixel, RCode } from './index';
import { ResourcePack } from './resource';
import { Sprite } from './sprite';

export interface ImageLoader {
    loadImageResource(sprite: Sprite, imageFile: ImageData, pack: ResourcePack): RCode;
    saveImageResource(sprite: Sprite, imageFile: ArrayBuffer): RCode;
}

export class StandardImageLoader implements ImageLoader {
    loadImageResource(sprite: Sprite, imageFile: ImageData, pack: ResourcePack): RCode {
        sprite.width = imageFile.width;
        sprite.height = imageFile.height;
        sprite.colData = [];

        for (let x = 0; x < imageFile.data.length; x += 4) {
            sprite.colData.push(new Pixel(imageFile.data[x], imageFile.data[x + 1], imageFile.data[x + 2], imageFile.data[x + 3]));
        }

        return RCode.OK;
    }
    saveImageResource(sprite: Sprite, imageFile: ArrayBuffer): RCode {
        throw new Error('Method not implemented.');
    }
}