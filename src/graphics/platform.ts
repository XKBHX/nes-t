import { RCode } from '.';
import { GameEngine } from './engine';
import { Renderer, VI2D, WebGPURenderer } from './render';

export class Platform {
    applicationStartUp(): RCode { return RCode.FAIL; }
    applicationCleanUp(): RCode { return RCode.FAIL; }
    threadStartUp(): RCode { return RCode.FAIL; }
    threadCleanUp(): RCode { return RCode.FAIL; }
    createGraphics(fullScreen: boolean, enableVSYNC: boolean, viewPos: VI2D, viewSize: VI2D): RCode { return RCode.FAIL; }
    createWindowPane(windowPos: VI2D, windowSize: VI2D, fullScreen: boolean): RCode { return RCode.FAIL; }
    setWindowTitle(s: string): RCode { return RCode.FAIL; }
    startSystemEventLoop(): RCode { return RCode.FAIL; }
    handleSystemEvent(): RCode { return RCode.FAIL; }

    static gameEngine: GameEngine;
}

export const renderer: Renderer = new WebGPURenderer();
export const platform: Platform = new Platform();
export const mapKeys: Record<number, Uint8Array[0]> = <Record<number, Uint8Array[0]>><unknown>undefined;