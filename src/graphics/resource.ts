export interface ResourceBuffer {
    fileHandler: any;
    offset: Uint32Array[0];
    size: Uint32Array[0];
    vMemory: string[]
}

interface ResourceFile {
    size: Uint32Array[0];
    offset: Uint32Array[0];
}

export class ResourcePack {
    private mapFiles: Record<string, ResourceFile>;
    private baseFile: any;

    constructor() {}

    private scramble(data: string[], key: string): string[] { return []; }

    private makePosix(path: string): string { return ''; }

    addFile(file: string): boolean { return false; }

    loadPack(file: string, key: string): boolean { return false; }

    savePack(file: string, key: string): boolean { return false; }

    getFileBuffer(file: string): ResourceBuffer { return undefined; }

    loaded(): boolean { return false; }
}