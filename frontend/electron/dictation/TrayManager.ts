import {Menu, nativeImage, Tray} from "electron";
import path from "node:path";
import {fileURLToPath} from "node:url";

import type {DictationPhase} from "./types";
import {deflateSync} from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TrayManager {
    private tray: Tray | null = null;

    build(onQuit: () => void): void {
        if (this.tray) return;
        this.tray = new Tray(this.buildIcon("idle"));
        this.tray.setToolTip("Mozgoslav dictation");

        const menu = Menu.buildFromTemplate([
            {label: "Mozgoslav dictation", enabled: false},
            {type: "separator"},
            {label: "Quit", click: onQuit},
        ]);
        this.tray.setContextMenu(menu);
    }

    setPhase(phase: DictationPhase): void {
        if (!this.tray) return;
        this.tray.setImage(this.buildIcon(phase));
    }

    destroy(): void {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
    }

    private buildIcon(phase: DictationPhase): Electron.NativeImage {
        for (const candidate of this.iconCandidates(phase)) {
            const image = nativeImage.createFromPath(candidate);
            if (!image.isEmpty()) return image;
        }
        return this.buildFallbackIcon(phase);
    }

    private iconCandidates(phase: DictationPhase): readonly string[] {
        const filename = `tray-${phase}.png`;
        const paths: string[] = [];
        if (typeof process.resourcesPath === "string" && process.resourcesPath.length > 0) {
            paths.push(path.join(process.resourcesPath, filename));
            paths.push(path.join(process.resourcesPath, "build", filename));
        }
        paths.push(path.join(__dirname, "..", "..", "build", filename));
        return paths;
    }

    private buildFallbackIcon(phase: DictationPhase): Electron.NativeImage {
        const colour = this.colourFor(phase);
        const png = this.solidPng16(colour);
        return nativeImage.createFromBuffer(png);
    }

    private colourFor(phase: DictationPhase): [number, number, number] {
        switch (phase) {
            case "recording":
                return [220, 60, 60];
            case "processing":
                return [230, 190, 60];
            case "injecting":
                return [120, 180, 120];
            case "error":
                return [200, 80, 80];
            default:
                return [160, 160, 160];
        }
    }

    private solidPng16(colour: [number, number, number]): Buffer {
        const width = 16;
        const height = 16;
        const pixelData = Buffer.alloc(width * height * 4);
        for (let i = 0; i < width * height; i++) {
            pixelData[i * 4 + 0] = colour[0];
            pixelData[i * 4 + 1] = colour[1];
            pixelData[i * 4 + 2] = colour[2];
            pixelData[i * 4 + 3] = 255;
        }
        return encodeBasicPng(width, height, pixelData);
    }
}

function encodeBasicPng(width: number, height: number, rgba: Buffer): Buffer {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = buildChunk("IHDR", buildIhdrData(width, height));
    const idat = buildChunk("IDAT", buildIdatData(width, height, rgba));
    const iend = buildChunk("IEND", Buffer.alloc(0));
    return Buffer.concat([signature, ihdr, idat, iend]);
}

function buildIhdrData(width: number, height: number): Buffer {
    const data = Buffer.alloc(13);
    data.writeUInt32BE(width, 0);
    data.writeUInt32BE(height, 4);
    data.writeUInt8(8, 8); 
    data.writeUInt8(6, 9); 
    data.writeUInt8(0, 10);
    data.writeUInt8(0, 11);
    data.writeUInt8(0, 12);
    return data;
}

function buildIdatData(width: number, height: number, rgba: Buffer): Buffer {
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0;
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    return deflateSync(raw);
}

function buildChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([length, typeBuf, data, crc]);
}

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = (CRC_TABLE[(c ^ buf[i]) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
