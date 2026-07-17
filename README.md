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
| `npm run serve` | Start webpack-dev-server at `http://localhost:8082` |
| `npm run build` | Production bundle to `dist/` |
| `npm run build:dev` | Development build |
| `npm run watch` | Rebuild on file changes |

## Usage

1. Run `npm run serve` and open the app in a WebGPU-capable browser.
2. Load a `.nes` ROM with **Choose ROM**, or use the ROM imported in `src/index.ts`.
3. Play with keyboard, on-screen buttons, or a connected gamepad.

### Controls

| Action | Keyboard |
| --- | --- |
| D-Pad | Arrow keys |
| A | `X` |
| B | `Z` |
| Select | `A` |
| Start | `S` |
| Pause / resume | `Space` |
| Reset | `R` |
| Cycle palette | `P` |

On-screen L/U/R/D, Select, Start, A, and B buttons mirror the same inputs. When emulation is paused, **step** advances one CPU instruction.

## Project layout

```
src/
  cpu.ts          # 6502 CPU
  ppu.ts          # Picture Processing Unit
  apu.ts          # Audio Processing Unit
  bus.ts          # System bus
  cartridge.ts    # iNES ROM loading
  nes.ts          # Emulator game loop & UI
  mapper/         # Cartridge mappers (000, 001, 002, 003, 004, 066)
  graphics/       # WebGPU renderer, sprites, input helpers
  index.ts        # App entry point
```

## Tech stack

- TypeScript
- Webpack 5 + webpack-dev-server
- WebGPU (`@webgpu/types`)
- gl-matrix

## Notes

This is a work-in-progress emulator. Accuracy and game compatibility vary by mapper and title. Bundled ROMs under `src/rom/` are for local development; distribute only ROMs you have rights to use.
