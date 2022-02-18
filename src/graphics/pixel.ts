export class Pixel {
    constructor(
        public red: Uint8Array[0],
        public green: Uint8Array[0],
        public blue: Uint8Array[0],
        public alpha: Uint8Array[0] = 0xFF) {

    }

    static createFrom32BitInt(n: Uint32Array[0]): Pixel {
        return new Pixel(0, 0, 0, 1);
    }
    
    static defaultPixel(): Pixel {
        return Pixel.createFrom32BitInt(0xFF << 24);
    }

    isEqual(p: Pixel): boolean {
        return this.red === p.red && this.green === p.green && this.blue === p.blue && this.alpha === p.alpha;
    }

    scale(factor: number): Pixel {
        return new Pixel(this.red * factor, this.green * factor, this.blue * factor, this.alpha);
    }

    mutateScale(factor: number): Pixel {
        this.red   *= factor;
        this.green *= factor;
        this.blue  *= factor;

        return this;//config-api-dev.platform-config.orderstreamnp.chnonprod.net
    }

    add(p: Pixel): Pixel {
        return new Pixel(this.red + p.red, this.green + p.green, this.blue + p.blue, this.alpha + p.alpha);
    }

    mutateAdd(p: Pixel): Pixel {
        this.red   += p.red;
        this.green += p.green;
        this.blue  += p.blue;
        this.alpha += p.alpha;

        return this;
    }

    subtract(p: Pixel): Pixel {
        return new Pixel(this.red - p.red, this.green - p.green, this.blue - p.blue, this.alpha - p.alpha);
    }

    mutateSubtract(p: Pixel): Pixel {
        this.red   -= p.red;
        this.green -= p.green;
        this.blue  -= p.blue;
        this.alpha -= p.alpha;

        return this;
    }
}

export const GREY = new Pixel(192, 192, 192), DARK_GREY = new Pixel(128, 128, 128), VERY_DARK_GREY = new Pixel(64, 64, 64),
RED = new Pixel(255, 0, 0), DARK_RED = new Pixel(128, 0, 0), VERY_DARK_RED = new Pixel(64, 0, 0),
YELLOW = new Pixel(255, 255, 0), DARK_YELLOW = new Pixel(128, 128, 0), VERY_DARK_YELLOW = new Pixel(64, 64, 0),
GREEN = new Pixel(0, 255, 0), DARK_GREEN = new Pixel(0, 128, 0), VERY_DARK_GREEN = new Pixel(0, 64, 0),
CYAN = new Pixel(0, 255, 255), DARK_CYAN = new Pixel(0, 128, 128), VERY_DARK_CYAN = new Pixel(0, 64, 64),
BLUE = new Pixel(0, 0, 255), DARK_BLUE = new Pixel(0, 0, 128), VERY_DARK_BLUE = new Pixel(0, 0, 64),
MAGENTA = new Pixel(255, 0, 255), DARK_MAGENTA = new Pixel(128, 0, 128), VERY_DARK_MAGENTA = new Pixel(64, 0, 64),
WHITE = new Pixel(255, 255, 255), BLACK = new Pixel(0, 0, 0), BLANK = new Pixel(0, 0, 0, 0);