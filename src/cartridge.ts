import { 
    Mapper,
    Mapper000,
    Mapper001,
    Mapper002,
    Mapper003,
    Mapper004,
    Mapper066,
    MIRROR
} from './mapper';
import type { Ref } from './utils';

export interface Header {
    name: string;
    prgRomChunks: Uint8Array[0];
    chrRomChunks: Uint8Array[0];
    mapper1: Uint8Array[0];
    mapper2: Uint8Array[0];
    prgRamSize: Uint8Array[0];
    tvSystem1: Uint8Array[0];
    tvSystem2: Uint8Array[0];
    unused: string;
}

export class Cartridge {
    private imgValid: boolean;
    private hwMirror: MIRROR = MIRROR.HORIZONTAL;
    private mapperId: Uint8Array = new Uint8Array(1);
    private pRGBanks: Uint8Array = new Uint8Array(1);
    private cHRBanks: Uint8Array = new Uint8Array(1);
    private pRGMemory: Uint8Array = <Uint8Array><unknown>undefined;
    private cHRMemory: Uint8Array = <Uint8Array><unknown>undefined;
    private mapper: Mapper = <Mapper><unknown>undefined;

    constructor(private buffer: ArrayBuffer | Uint8Array = new ArrayBuffer(0)) {
        let header = Cartridge.parseHeader(buffer);
        this.imgValid = false;

        let filePos = 16;
        
        if(header.mapper1 & 0x04) {
            console.log('Mapper1');
            filePos = 512;
        }

        this.mapperId[0] = (header.mapper2 & 0xf0) | (header.mapper1 >> 4);
        this.hwMirror = (header.mapper1 & 0x01) ? MIRROR.VERTICAL : MIRROR.HORIZONTAL;

        let fileType = 1;

        if((header.mapper2 & 0x0c) === 0x08) fileType = 2;

        switch(fileType) {
            case 0:
                break;
            case 1:
                this.pRGBanks[0] = header.prgRomChunks;
			    this.pRGMemory = new Uint8Array(buffer.slice(filePos, filePos + this.pRGBanks[0] * 16384));
                //ifs.read((char*)vPRGMemory.data(), vPRGMemory.size());
                filePos += this.pRGMemory.length

			    this.cHRBanks[0] = header.chrRomChunks;
			    
                if (this.cHRBanks[0] === 0) {
			    	// Create CHR RAM
			    	this.cHRMemory = new Uint8Array(8192);
			    } else {
			    	this.cHRMemory = new Uint8Array(buffer.slice(filePos, filePos + this.cHRBanks[0] * 8192));
                    filePos += this.cHRMemory.length;
			    }
                break;
            case 2:
                this.pRGBanks[0] = ((header.prgRamSize & 0x07) << 8) | header.prgRomChunks;
                this.pRGMemory = new Uint8Array(buffer.slice(filePos, filePos + this.pRGBanks[0] * 16384));
                filePos += this.pRGMemory.length;

                this.cHRBanks[0] = ((header.prgRamSize & 0x38) << 8) | header.chrRomChunks;
                this.cHRMemory = new Uint8Array(buffer.slice(filePos, filePos + this.cHRBanks[0] * 8192));
                filePos += this.cHRMemory.length
                break;
        }
        
		switch (this.mapperId[0]) {
		    case   0: this.mapper = new Mapper000(this.pRGBanks[0], this.cHRBanks[0]); break;
		    case   1: this.mapper = new Mapper001(this.pRGBanks[0], this.cHRBanks[0]); break;
		    case   2: this.mapper = new Mapper002(this.pRGBanks[0], this.cHRBanks[0]); break;
		    case   3: this.mapper = new Mapper003(this.pRGBanks[0], this.cHRBanks[0]); break;
		    case   4: this.mapper = new Mapper004(this.pRGBanks[0], this.cHRBanks[0]); break;
		    case  66: this.mapper = new Mapper066(this.pRGBanks[0], this.cHRBanks[0]); break;
		}

        console.log('File Type', fileType, 'Mapper', this.mapper, 'File Position', filePos);

		this.imgValid = true;
    }

    static parseHeader(data: ArrayBuffer | Uint8Array): Header {
        const decoder = new TextDecoder();
        
        const header: Header = <Header><unknown>{};
        const name = decoder.decode(new Uint8Array(data.slice(0, 4)));
        const prgRomChunks = new Uint8Array(data.slice(4, 5));
        const crgRomChunks = new Uint8Array(data.slice(5, 6));
        const mapper1 = new Uint8Array(data.slice(6, 7));
        const mapper2 = new Uint8Array(data.slice(7, 8));
        const prgRamSize = new Uint8Array(data.slice(8, 9));
        const tvSystem1 = new Uint8Array(data.slice(9, 10));
        const tvSystem2 = new Uint8Array(data.slice(10, 11));
        const unused = decoder.decode(new Uint8Array(data.slice(11, 16)));

        header.name = name;
        header.prgRomChunks = prgRomChunks[0];
        header.chrRomChunks = crgRomChunks[0];
        header.mapper1 = mapper1[0];
        header.mapper2 = mapper2[0];
        header.prgRamSize = prgRamSize[0];
        header.tvSystem1 = tvSystem1[0];
        header.tvSystem2 = tvSystem2[0];
        header.unused = unused;
        //console.log(name, header);

        return header;
    }

    imageValid(): boolean {
        return this.imgValid;
    }

    cpuRead(address: Uint16Array[0], data: Ref<{ data: Uint8Array[0] }>): boolean {
        let mappedAddr = 0;
        const ma = { mappedAddress: mappedAddr };

	    if (this.mapper.cpuMapRead(address, ma, data)) {
            mappedAddr = ma.mappedAddress;
	    	//console.log('Cartridge Mapped Address', mappedAddr, ma);
            if (mappedAddr === 0xFFFFFFFF) {
	    		// Mapper has actually set the data value, for example cartridge based RAM
	    		return true;
	    	} else {
	    		// Mapper has produced an offset into cartridge bank memory
	    		data.data = this.pRGMemory[mappedAddr];
                //console.log('Cartridge::cpuRead()', data);
	    	}
	    	return true;
	    }
	    else
	    	return false;
    }

    cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): boolean {
        const ma = { mappedAddress: 0x00000000 };
	    
        if (this.mapper.cpuMapWrite(address, ma, data)) {
	    	if (ma.mappedAddress === 0xFFFFFFFF) {
	    		// Mapper has actually set the data value, for example cartridge based RAM
	    		return true;
	    	} else {
	    		// Mapper has produced an offset into cartridge bank memory
	    		this.pRGMemory[ma.mappedAddress] = data;
	    	}
	    	return true;
	    }
	    else
	    	return false;
    }

    ppuRead(address: Uint16Array[0], data: Ref<{ data: Uint8Array[0] }>): boolean {
        let mappedAddr = 0;
        const ma = { mappedAddress: mappedAddr };

	    if (this.mapper.ppuMapRead(address, ma)) {
            mappedAddr = ma.mappedAddress;
	    	data.data = this.cHRMemory[mappedAddr];
	    	
            return true;
	    }
	    else return false;
    }

    ppuWrite(address: Uint16Array[0], data: Uint8Array[0]): boolean {
        let mappedAddr = 0;
        const ma = { mappedAddress: mappedAddr };

	    if (this.mapper.ppuMapWrite(address, ma)) {
	    	mappedAddr = ma.mappedAddress;
	    	this.cHRMemory[mappedAddr] = data;
	    	
            return true;
	    } else return false;
    }

    reset(): void {
        if (this.mapper !== undefined)
		    this.mapper.reset();
    }

    mirror(): MIRROR {
        const m = this.mapper.mirror();

        if(m === MIRROR.HARDWARE) return this.hwMirror;
        
        return m;
    }

    getMapper(): Mapper {
        return this.mapper;
    }
}