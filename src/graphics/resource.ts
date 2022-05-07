interface ResourceFile {
    size: Uint32Array[0];
    offset: Uint32Array[0];
}

export class ResourcePack {
    private mapFiles: Record<string, ResourceFile> = {};
    private baseFile: any;

    constructor() {}

    private scramble(data: string[], key: string): string[] { return []; }

    private makePosix(path: string): string { return ''; }

    addFile(file: string): boolean { return false; }

    loadPack(file: string, key: string): boolean { return false; }

    savePack(file: string, key: string): boolean { return false; }

    getFileBuffer(file: string): ResourceBuffer { return <ResourceBuffer><unknown>undefined; }

    loaded(): boolean { return false; }
}

export class ResourceBuffer {
    fileHandler: any;
    memory: ArrayBuffer;

    constructor(public fileReader: FileReader, public offset: Uint32Array[0], public size: Uint32Array[0]) {
        this.memory = new ArrayBuffer(size);
        //fileReader.readAsArrayBuffer
    }
}
