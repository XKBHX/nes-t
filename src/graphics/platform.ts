import { RCode } from '.';
import { Key, VKey } from './keyboard';
import { GameEngine } from './engine';
import { Renderer, VI2D, WebGPURenderer } from './render';

export class Platform {
    applicationStartUp(): RCode { return RCode.OK; }
    applicationCleanUp(): RCode { return RCode.OK; }
    threadStartUp(): RCode { return RCode.OK; }
    
	threadCleanUp(): RCode {
		renderer.destroyDevice();
		return RCode.OK; }
    
    createGraphics(fullScreen: boolean, enableVSYNC: boolean, viewPos: VI2D, viewSize: VI2D): RCode {
        if (renderer.createDevice([], true, true) === RCode.OK) {
            renderer.updateViewport(viewPos, viewSize);

            return RCode.OK;
        }

        return RCode.FAIL;
    }
    
    createWindowPane(windowPos: VI2D, windowSize: VI2D, fullScreen: boolean): RCode {
        mapKeys[0x00] = Key.NONE;
		mapKeys[0x41] = Key.A; mapKeys[0x42] = Key.B; mapKeys[0x43] = Key.C; mapKeys[0x44] = Key.D; mapKeys[0x45] = Key.E;
		mapKeys[0x46] = Key.F; mapKeys[0x47] = Key.G; mapKeys[0x48] = Key.H; mapKeys[0x49] = Key.I; mapKeys[0x4A] = Key.J;
		mapKeys[0x4B] = Key.K; mapKeys[0x4C] = Key.L; mapKeys[0x4D] = Key.M; mapKeys[0x4E] = Key.N; mapKeys[0x4F] = Key.O;
		mapKeys[0x50] = Key.P; mapKeys[0x51] = Key.Q; mapKeys[0x52] = Key.R; mapKeys[0x53] = Key.S; mapKeys[0x54] = Key.T;
		mapKeys[0x55] = Key.U; mapKeys[0x56] = Key.V; mapKeys[0x57] = Key.W; mapKeys[0x58] = Key.X; mapKeys[0x59] = Key.Y;
		mapKeys[0x5A] = Key.Z;

		mapKeys[VKey.VK_F1] = Key.F1; mapKeys[VKey.VK_F2] = Key.F2; mapKeys[VKey.VK_F3] = Key.F3; mapKeys[VKey.VK_F4] = Key.F4;
		mapKeys[VKey.VK_F5] = Key.F5; mapKeys[VKey.VK_F6] = Key.F6; mapKeys[VKey.VK_F7] = Key.F7; mapKeys[VKey.VK_F8] = Key.F8;
		mapKeys[VKey.VK_F9] = Key.F9; mapKeys[VKey.VK_F10] = Key.F10; mapKeys[VKey.VK_F11] = Key.F11; mapKeys[VKey.VK_F12] = Key.F12;

		mapKeys[VKey.VK_DOWN] = Key.DOWN; mapKeys[VKey.VK_LEFT] = Key.LEFT; mapKeys[VKey.VK_RIGHT] = Key.RIGHT; mapKeys[VKey.VK_UP] = Key.UP;
		//mapKeys[VK_RETURN] = Key.ENTER;// mapKeys[VK_RETURN] = Key.RETURN;
			
		mapKeys[VKey.VK_BACK] = Key.BACK;      mapKeys[VKey.VK_ESCAPE] = Key.ESCAPE;    mapKeys[VKey.VK_RETURN] = Key.ENTER;    mapKeys[VKey.VK_PAUSE] = Key.PAUSE;
		mapKeys[VKey.VK_SCROLL] = Key.SCROLL;  mapKeys[VKey.VK_TAB] = Key.TAB;          mapKeys[VKey.VK_DELETE] = Key.DEL;      mapKeys[VKey.VK_HOME] = Key.HOME;
		mapKeys[VKey.VK_END] = Key.END;        mapKeys[VKey.VK_PRIOR] = Key.PGUP;       mapKeys[VKey.VK_NEXT] = Key.PGDN;       mapKeys[VKey.VK_INSERT] = Key.INS;
		mapKeys[VKey.VK_SHIFT] = Key.SHIFT;    mapKeys[VKey.VK_CONTROL] = Key.CTRL;     mapKeys[VKey.VK_SPACE] = Key.SPACE;
        
		mapKeys[0x30] = Key.K0; mapKeys[0x31] = Key.K1; mapKeys[0x32] = Key.K2; mapKeys[0x33] = Key.K3; mapKeys[0x34] = Key.K4;
		mapKeys[0x35] = Key.K5; mapKeys[0x36] = Key.K6; mapKeys[0x37] = Key.K7; mapKeys[0x38] = Key.K8; mapKeys[0x39] = Key.K9;

		mapKeys[VKey.VK_NUMPAD0] = Key.NP0; mapKeys[VKey.VK_NUMPAD1] = Key.NP1; mapKeys[VKey.VK_NUMPAD2] = Key.NP2; mapKeys[VKey.VK_NUMPAD3] = Key.NP3; mapKeys[VKey.VK_NUMPAD4] = Key.NP4;
		mapKeys[VKey.VK_NUMPAD5] = Key.NP5; mapKeys[VKey.VK_NUMPAD6] = Key.NP6; mapKeys[VKey.VK_NUMPAD7] = Key.NP7; mapKeys[VKey.VK_NUMPAD8] = Key.NP8; mapKeys[VKey.VK_NUMPAD9] = Key.NP9;
		mapKeys[VKey.VK_MULTIPLY] = Key.NP_MUL; mapKeys[VKey.VK_ADD] = Key.NP_ADD; mapKeys[VKey.VK_DIVIDE] = Key.NP_DIV; mapKeys[VKey.VK_SUBTRACT] = Key.NP_SUB; mapKeys[VKey.VK_DECIMAL] = Key.NP_DECIMAL;

		mapKeys[VKey.VK_OEM_1] = Key.OEM_1;			// On US and UK keyboards this is the ';:' key
		mapKeys[VKey.VK_OEM_2] = Key.OEM_2;			// On US and UK keyboards this is the '/?' key
		mapKeys[VKey.VK_OEM_3] = Key.OEM_3;			// On US keyboard this is the '~' key
		mapKeys[VKey.VK_OEM_4] = Key.OEM_4;			// On US and UK keyboards this is the '[{' key
		mapKeys[VKey.VK_OEM_5] = Key.OEM_5;			// On US keyboard this is '\|' key.
		mapKeys[VKey.VK_OEM_6] = Key.OEM_6;			// On US and UK keyboards this is the ']}' key
		mapKeys[VKey.VK_OEM_7] = Key.OEM_7;			// On US keyboard this is the single/double quote key. On UK, this is the single quote/@ symbol key
		mapKeys[VKey.VK_OEM_8] = Key.OEM_8;			// miscellaneous characters. Varies by keyboard
		mapKeys[VKey.VK_OEM_PLUS] = Key.EQUALS;		// the '+' key on any keyboard
		mapKeys[VKey.VK_OEM_COMMA] = Key.COMMA;		// the comma key on any keyboard
		mapKeys[VKey.VK_OEM_MINUS] = Key.MINUS;		// the minus key on any keyboard
		mapKeys[VKey.VK_OEM_PERIOD] = Key.PERIOD;	// the period key on any keyboard
		mapKeys[VKey.VK_CAPITAL] = Key.CAPS_LOCK;
        
        return RCode.OK;
    }
    
    setWindowTitle(s: string): RCode { return RCode.OK; }
    startSystemEventLoop(): RCode { return RCode.OK; }
    handleSystemEvent(): RCode { return RCode.OK; }

    static gameEngine: GameEngine;
}

export const renderer: Renderer = new WebGPURenderer();
export const platform: Platform = new Platform();
export const mapKeys: Record<number, Uint8Array[0]> = {};

//renderer.devic