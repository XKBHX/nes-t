export class Ppu {
    private tblName: Uint8Array[];
    private tblPattern: Uint8Array[];
    private tblPalette: Uint8Array;
    private palScreen: Pixel[];

    private sprScreen                 =   new Sprite(256, 240);
    private sprNameTable: Sprite[]    = [ new Sprite(256, 240), new Sprite(256, 240) ];
    private sprPatternTable: Sprite[] = [ new Sprite(128, 128), new Sprite(128, 128) ];

    private cart: Cartridge;

    private status: PPUStatus;
    private mask: PPUMask;
    private control: PPUCtrl;
    private vRamAddress: LoopyRegister;
    private tRamAddress: LoopyRegister;
    private fineX: Uint8Array[0] = 0x00;
    private address_latch: Uint8Array[0] = 0x00;
    private ppu_data_buffer: Uint8Array[0] = 0x00;
    private scanline: Uint16Array[0] = 0;
    private cycle: Uint16Array[0] = 0;
    private oddFrame: boolean = false;
    private bg_next_tile_id: Uint8Array[0]     = 0x00;
    private bg_next_tile_attrib: Uint8Array[0] = 0x00;
    private bg_next_tile_lsb: Uint8Array[0]    = 0x00;
    private bg_next_tile_msb: Uint8Array[0]    = 0x00;
    private bg_shifter_pattern_lo: Uint16Array[0] = 0x0000;
    private bg_shifter_pattern_hi: Uint16Array[0] = 0x0000;
    private bg_shifter_attrib_lo: Uint16Array[0]  = 0x0000;
    private bg_shifter_attrib_hi: Uint16Array[0]  = 0x0000;
    private OAM: ObjectAttributeEntry;
    private oam_addr: Uint8Array[0]    = 0x00;
    private spriteScanline: ObjectAttributeEntry[];
    private spriteCount: Uint8Array[0];
    private spriteShifterPatternLo: Uint8Array;
    private spriteShifterPatternHi: Uint8Array;
    private spriteZeroHitPossible: boolean = false;
    private spriteZeroBeingRendered: boolean = false;

    public frameComplete: boolean = false;
    public oAM: Uint8Array[0] = OAM;
    public nmi: boolean = false;
    public scanlineTrigger: boolean = false;
    
    constructor() {}

    getScreen(): Sprite {}
    getNameTable(i: Uint8Array[0]): Sprite {}
    getPatternTable(i: Uint8Array[0], palette: Uint8Array[0]): Sprite {}
    getColorFromPaletteRam(palette: Uint8Array[0], pixel: Uint8Array[0]): Pixel {}
    cpuRead(address: Uint16Array[0], readOnly: boolean = false): Uint8Array[0] {}
    cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {}
    ppuRead(address: Uint16Array[0], readOnly: boolean = false): Uint8Array[0] {}
    ppuWrite(address: Uint16Array[0], data: Uint8Array[0]): void {}
    connectCartridge(cartridge: Cartridge): void {}
    clock(): void {}
    reset(): void {}
}

interface PPUStatus {
    unused: Uint8Array[0];
    sprite_overflow: Uint8Array[0];
    sprite_zero_hit: Uint8Array[0];
    vertical_blank: Uint8Array[0];
    reg: Uint8Array[0];
}

interface PPUMask {
    grayscale: Uint8Array[0];
    render_background_left: Uint8Array[0];
    render_sprites_left: Uint8Array[0];
    render_background: Uint8Array[0];
    render_sprites: Uint8Array[0];
    enhance_red: Uint8Array[0];
    enhance_green: Uint8Array[0];
    enhance_blue: Uint8Array[0];
    reg: Uint8Array[0];
}

interface PPUCtrl {
    nametable_x: Uint8Array[0];
    nametable_y: Uint8Array[0];
    increment_mode: Uint8Array[0];
    pattern_sprite: Uint8Array[0];
    pattern_background: Uint8Array[0];
    sprite_size: Uint8Array[0];
    slave_mode: Uint8Array[0];
    enable_nmi: Uint8Array[0];
    reg: Uint8Array[0];
}

interface LoopyRegister {
    coarse_x: Uint16Array[0];
    coarse_y: Uint16Array[0];
    nametable_x: Uint16Array[0];
    nametable_y: Uint16Array[0];
    fine_y: Uint16Array[0];
    unused: Uint16Array[0];
    reg: Uint16Array[0];
}

interface ObjectAttributeEntry {
    y: Uint8Array[0];
    id: Uint8Array[0];
    attribute: Uint8Array[0];
    x: Uint8Array[0];
}