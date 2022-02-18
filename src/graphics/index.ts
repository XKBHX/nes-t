export const MOUSE_BUTTONS: Uint8Array[0] = 5;
export const DEFAULT_ALPHA: Uint8Array[0] = 0xFF;
export const DEFAULT_PIXEL: Uint32Array[0] = (DEFAULT_ALPHA << 24);
export const TAB_SIZE_IN_SPACES: Uint8Array[0] = 4;

export enum RCode { FAIL = 0, OK = 1, NO_FILE = -1 }

export enum Key {
    NONE,
    A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
    K0, K1, K2, K3, K4, K5, K6, K7, K8, K9,
    F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12,
    UP, DOWN, LEFT, RIGHT,
    SPACE, TAB, SHIFT, CTRL, INS, DEL, HOME, END, PGUP, PGDN,
    BACK, ESCAPE, RETURN, ENTER, PAUSE, SCROLL,
    NP0, NP1, NP2, NP3, NP4, NP5, NP6, NP7, NP8, NP9,
    NP_MUL, NP_DIV, NP_ADD, NP_SUB, NP_DECIMAL, PERIOD,
    EQUALS, COMMA, MINUS,
    OEM_1, OEM_2, OEM_3, OEM_4, OEM_5, OEM_6, OEM_7, OEM_8,
    CAPS_LOCK, ENUM_END
}

export class HWButton {
    constructor(public pressed: boolean, public released: boolean, public held: boolean) {}
}