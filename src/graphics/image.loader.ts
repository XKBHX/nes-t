import { RCode } from './index';
import { ResourcePack } from './resource';
import { Sprite } from './sprite';

export interface ImageLoader {
    loadImageResource(sprite: Sprite, imageFile: string, pack: ResourcePack): RCode;
    saveImageResource(sprite: Sprite, imageFile: string): RCode;
}