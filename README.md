# nes-t

A Nintendo Entertainment System (NES) emulator written in TypeScript, running in the browser with WebGPU rendering.

## Features

- **6502 CPU** with disassembler and debug UI (registers, flags, PC, cycle count)
- **PPU** for frame rendering and palette inspection
- **APU** audio support (sample rate 44.1 kHz)
- **iNES cartridge loading** (file picker or bundled ROM)
- **Mapper support**: 0, 1, 2, 3, 4, and 66
- **Input**: keyboard, on-screen buttons, and Gamepad API
- **WebGPU** display via a custom graphics engine
- Step / pause / reset for debugging

## Requirements

- Node.js and npm
- A browser with [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) enabled

## Setup

```bash
npm install
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run serve` | Start webpack-dev-server at `https://localhost:8082` |
| `npm run cert:generate` | Write a self-signed cert covering localhost and the configured public IPs |
| `npm run build` | Production bundle to `dist/` |
| `npm run build:dev` | Development build |
| `npm run watch` | Rebuild on file changes |
| `npm run validate:mmc3` | Headless MMC3 / NMI checks |
| `npm run validate:controller` | Headless controller mapping and $4016 strobe checks |
| `npm run validate:nestest` | Headless nestest.nes official opcode log and $02/$03 checks |

## Usage

1. Run `npm run cert:generate` once (if `certs/*.pem` are missing), then `npm run serve` and open the app in a WebGPU-capable browser. The first visit to a self-signed host will show a browser warning; continue past it for local development.
2. Remote access (same cert SANs): `https://73.204.187.74:8082` or `https://[2601:587:100:9770:5c6d:48fc:8d21:66fe]:8082`.
3. Load a `.nes` ROM with **Choose ROM**, or use the ROM imported in `src/index.ts`.
4. Play with keyboard, on-screen buttons, or a connected gamepad.

### Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| D-Pad | Arrow keys | D-pad, left stick, or Xbox hat |
| A | `X` | A (south) or RB |
| B | `Z` | B / X (east / west) or LB |
| Select | `A` | Back / View |
| Start | `S` | Start / Menu |
| Pause / resume | `Space` | |
| Reset | `R` | |
| Cycle palette | `P` | |

On-screen L/U/R/D, Select, Start, A, and B buttons hold the same inputs while pressed. The first usable gamepad is player 1 (combined with the keyboard); a second gamepad is player 2. Pads with a W3C `standard` mapping are preferred if more than one device is enumerated. Browsers only expose a pad after you press a button on it.

Xbox Series X|S pads work when the browser remaps them to the standard layout. Many Chrome/macOS builds do not: after the Series firmware update the pad often reports as raw HID (`mapping` is empty, product `045e:0b13`). In that layout View/Menu are buttons 6/7 (not 8/9) and the D-pad is a hat on axes 6/7, so a standard-only mapper misses Start, Select, and the D-pad. This project remaps that HID layout automatically. Face buttons and the left stick already used the same indices and were not the failure.

On macOS, Chrome may also fail to expose an Xbox pad over USB (it uses a separate Xbox USB path that does not handle every Series product ID). Use Bluetooth, or try Safari. The Xbox Wireless Adapter is Windows-only.

When emulation is paused, **step** advances one CPU instruction.

## Project layout

```
src/
  cpu.ts          # 6502 CPU
  ppu.ts          # Picture Processing Unit
  apu.ts          # Audio Processing Unit
  bus.ts          # System bus
  cartridge.ts    # iNES ROM loading
  nes.ts          # Emulator game loop & UI
  controller.ts   # NES button bits, standard Gamepad API mapping, Xbox HID fallback
  mapper/         # Cartridge mappers (000, 001, 002, 003, 004, 066)
  graphics/       # WebGPU renderer, sprites, input helpers
  index.ts        # App entry point
```

## Tech stack

- TypeScript
- Webpack 5 + webpack-dev-server
- WebGPU (`@webgpu/types`)
- gl-matrix

## Performance notes

Firefox WebGPU is stricter about reclaiming GPU objects than Chromium. The frame path used to create a new `ImageBitmap`, render pipeline, bind group, sampler, and mapped vertex buffer every frame and never destroy them, so memory and frame time grew until the tab stalled.

The display path now:

- Targets **60 FPS** (one NES frame per 1/60 s, with a short catch-up cap)
- Uploads the native 256×240 PPU framebuffer and scales 2× on the GPU with nearest-neighbor sampling
- Reuses one screen texture, pipeline, bind group, and vertex buffer
- Uploads pixels with `writeTexture` (256-byte row alignment) instead of `createImageBitmap`
- Skips unused per-pixel GPU buffer and pipeline allocations in the layer renderer
- Skips unused APU Fourier sample synthesis (audio output is not mixed yet)

CPU flags, registers, and FPS stay on the HTML debug table. The old software overlay (pattern tables, nametable, `drawCpu`) is not redrawn every frame because that blit could not sustain 60 Hz.

## Notes

This is a work-in-progress emulator. Accuracy and game compatibility vary by mapper and title. Bundled ROMs under `src/rom/` are for local development; distribute only ROMs you have rights to use.
