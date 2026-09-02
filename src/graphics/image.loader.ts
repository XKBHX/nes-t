import { Pixel, RCode } from './index';
import { BLUE, MAGENTA, RED } from './pixel';
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

        const c = new OffscreenCanvas(imageFile.width, imageFile.height);
        const cxt = c.getContext('2d');
        if (!cxt) throw new Error('2d context unavailable');

        cxt.drawImage(imageFile, 0, 0, imageFile.width, imageFile.height);
        const { data } = cxt.getImageData(0, 0, imageFile.width, imageFile.height);
        

        const pixelCount = imageFile.width * imageFile.height;

        for (let x = 0; x < pixelCount; x++) {
            const i = x * 4;
            const red = data[i + 0];
            const green = data[i + 1];
            const blue = data[i + 2];
            const alpha = data[i + 3];
            sprite.colData.push(new Pixel(red, green, blue, alpha));
        }

        const coloredCount = data.filter(v => v > 0).length;

        return RCode.OK;
    }
    saveImageResource(sprite: Sprite, imageFile: ArrayBuffer): RCode {
        throw new Error('Method not implemented.');
    }
}