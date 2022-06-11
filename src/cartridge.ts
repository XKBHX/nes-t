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
    private mapperId: Uint8Array[0] = 0;
    private pRGBanks: Uint8Array[0] = 0;
    private cHRBanks: Uint8Array[0] = 0;
    private pRGMemory: Uint8Array = <Uint8Array><unknown>undefined;
    private cHRMemory: Uint8Array = <Uint8Array><unknown>undefined;
    private mapper: Mapper = <Mapper><unknown>undefined;

    constructor(private buffer: ArrayBuffer = new ArrayBuffer(0)) {
        let header = Cartridge.parseHeader(buffer);
        this.imgValid = false;

        let filePos = 16;
        
        if(header.mapper1 & 0x04) {
            console.log('Mapper1');
            filePos = 512;
        }

        this.mapperId = ((header.mapper2 >> 4) >> 4) | (header.mapper1 >> 4);
        this.hwMirror = (header.mapper1 & 0x01) ? MIRROR.VERTICAL : MIRROR.HORIZONTAL;

        let fileType = 1;

        if((header.mapper2 & 0x0c) === 0x08) fileType = 2;

        switch(fileType) {
            case 0:
                break;
            case 1:
                this.pRGBanks = header.prgRomChunks;
			    this.pRGMemory = new Uint8Array(buffer.slice(filePos, filePos + this.pRGBanks * 16384));
                //ifs.read((char*)vPRGMemory.data(), vPRGMemory.size());
                filePos += this.pRGMemory.length

			    this.cHRBanks = header.chrRomChunks;
			    
                if (this.cHRBanks === 0) {
			    	// Create CHR RAM
			    	this.cHRMemory = new Uint8Array(new ArrayBuffer(8192));
			    } else {
			    	// Allocate for ROM
			    	this.cHRMemory = new Uint8Array(new ArrayBuffer(this.cHRBanks * 8192));
			    }
                this.cHRMemory = new Uint8Array(buffer.slice(filePos, filePos + this.cHRMemory.length));
			    //ifs.read((char*)vCHRMemory.data(), vCHRMemory.size());
                filePos += this.cHRMemory.length;
                break;
            case 2:
                this.pRGBanks = ((header.prgRamSize & 0x07) << 8) | header.prgRomChunks;
                this.pRGMemory = new Uint8Array(buffer.slice(filePos, filePos + this.pRGBanks * 16384));
                filePos += this.pRGMemory.length;

                this.cHRBanks = ((header.prgRamSize & 0x38) << 8) | header.chrRomChunks;
                this.cHRMemory = new Uint8Array(buffer.slice(filePos, filePos + this.cHRBanks * 8192));
                filePos += this.cHRMemory.length
                break;
        }
        
		switch (this.mapperId) {
		    case   0: this.mapper = new Mapper000(this.pRGBanks, this.cHRBanks); break;
		    case   1: this.mapper = new Mapper001(this.pRGBanks, this.cHRBanks); break;
		    case   2: this.mapper = new Mapper002(this.pRGBanks, this.cHRBanks); break;
		    case   3: this.mapper = new Mapper003(this.pRGBanks, this.cHRBanks); break;
		    case   4: this.mapper = new Mapper004(this.pRGBanks, this.cHRBanks); break;
		    case  66: this.mapper = new Mapper066(this.pRGBanks, this.cHRBanks); break;
		}

		this.imgValid = true;
    }

    static parseHeader(data: ArrayBuffer): Header {
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
        console.log(name, header);

        return header;
    }

    imageValid(): boolean {
        return this.imgValid;
    }

    cpuRead(address: Uint16Array[0], data: Uint8Array[0]): boolean {
        let mappedAddr = 0;

	    if (this.mapper.cpuMapRead(address, mappedAddr, data)) {
	    	if (mappedAddr === 0xFFFFFFFF) {
	    		// Mapper has actually set the data value, for example cartridge based RAM
	    		return true;
	    	} else {
	    		// Mapper has produced an offset into cartridge bank memory
	    		data = this.pRGMemory[mappedAddr];
                console.log('Cartridge::cpuRead()', data);
	    	}
	    	return true;
	    }
	    else
	    	return false;
    }

    cpuWrite(address: Uint16Array[0], data: Uint8Array[0]): boolean {
        let mappedAddr = 0;
	    
        if (this.mapper.cpuMapWrite(address, mappedAddr, data)) {
	    	if (mappedAddr === 0xFFFFFFFF) {
	    		// Mapper has actually set the data value, for example cartridge based RAM
	    		return true;
	    	} else {
	    		// Mapper has produced an offset into cartridge bank memory
	    		this.pRGMemory[mappedAddr] = data;
	    	}
	    	return true;
	    }
	    else
	    	return false;
    }

    ppuRead(address: Uint16Array[0], data: Uint8Array[0]): boolean {
        const mappedAddr = 0;
	    if (this.mapper.ppuMapWrite(address, mappedAddr)) {
	    	data = this.cHRMemory[mappedAddr];
	    	
            return true;
	    }
	    else return false;
    }

    ppuWrite(address: Uint16Array[0], data: Uint8Array[0]): boolean {
        const mappedAddr = 0;
	    if (this.mapper.ppuMapWrite(address, mappedAddr)) {
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