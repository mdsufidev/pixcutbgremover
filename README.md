# PixCut Desktop — Native AI Background Remover

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-0078D6?style=flat-square&logo=windows" alt="Platform" />
  <img src="https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript%20%2B%20Vite-61DAFB?style=flat-square&logo=react" alt="Frontend" />
  <img src="https://img.shields.io/badge/Desktop%20Shell-Electron%2033-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/AI%20Engine-FastAPI%20%2B%20rembg%20%2B%20ONNX-009688?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Hardware-Auto%20CUDA%20%2F%20CPU%20Fallback-76B900?style=flat-square&logo=nvidia" alt="NVIDIA CUDA" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Offline-10b981?style=flat-square" alt="Offline" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

A production-grade, standalone desktop workstation application for high-performance AI background removal inspired by PixCut. Built with a clean **Swiss / Linear / Notion** native desktop aesthetic, zero cloud dependency, and local loopback neural processing.

---

## Key Features

- **100% Offline & Zero Friction**: No sign-ups, API keys, or internet connection required. All neural inference runs directly on your local CPU or GPU.
- **Hardware-Aware Neural Engine**: Inspects local hardware capabilities. Automatically activates **NVIDIA CUDA** (`CUDAExecutionProvider`) when available and gracefully falls back to multi-threaded **CPU** (`CPUExecutionProvider`) with zero crashes.
- **Interactive Before / After Split Slider**: Real-time draggable split comparison curtain to inspect edge cutouts against the original high-resolution photo.
- **"Magic Erase / Color Click" BFS Flood-Fill**: Instant contiguous and global color removal with adjustable color Euclidean distance tolerance ($0\text{--}100\%$).
- **Precision Brush Erase & Restore**: Manual eraser brush with customizable diameter ($4\text{--}200\text{px}$) and a dedicated **Restore Brush** to paint back original pixels from the source photo.
- **Non-Destructive History Stack**: Step forward and backward seamlessly using `Ctrl+Z` / `Ctrl+Y` with deep-cloned canvas state management (`ctx.getImageData`).
- **Smooth Mouse-Anchored Pan & Zoom**: Butter-smooth zoom up to $800\%$ anchored directly to cursor coordinates with `1:1` native pixel and `Fit to Window` presets.
- **Direct Local File System Export**: Export cutouts directly to your PC storage as high-resolution transparent PNG, WebP, or solid color fill (Pure White, Deep Charcoal, or Custom Hex).

---

## Architecture Overview

```
pixcut-bgremover/
│
├── electron/
│   ├── main.ts              # Native frameless window chrome, lifecycle & IPC
│   ├── preload.ts           # Secure contextBridge API for native file dialogs
│   └── daemon.ts            # Supervisor for the local Python AI daemon
│
├── src/
│   ├── components/
│   │   ├── TitleBar.tsx     # Custom Swiss desktop window chrome & accelerator badge
│   │   ├── DropZone.tsx     # High-resolution native drag-and-drop file dropzone
│   │   ├── CanvasWorkspace.tsx # Interactive HTML5 Canvas (Pan/Zoom, Magic Erase, Split View)
│   │   ├── Toolbar.tsx      # Tool controls (Tolerance, Brush Size, Preview Backgrounds)
│   │   ├── HistoryBar.tsx   # Undo / Redo controls, step count, export trigger
│   │   ├── ExportModal.tsx  # Direct export dialog (Transparent PNG, JPG, WebP)
│   │   └── SystemStatus.tsx # Hardware diagnostics (CUDA/CPU, RAM, Cores, Latency)
│   ├── hooks/
│   │   ├── useMagicErase.ts # Fast BFS scanline flood-fill color-matching algorithm
│   │   └── useCanvasHistory.ts # Local state snapshot stack
│   └── services/
│       └── api.ts           # Loopback HTTP communication (http://127.0.0.1:8765)
│
├── backend/
│   ├── main.py              # Loopback FastAPI daemon endpoints (/api/remove-bg, /health)
│   ├── engine.py            # rembg + ONNX Runtime engine with CUDA / CPU auto-detection
│   ├── requirements.txt     # Python dependencies
│   └── build_daemon.spec    # PyInstaller spec for standalone .exe / Linux binary
│
├── resources/
│   └── backend-dist/        # Pre-compiled standalone Python AI Daemon (pixcut-ai-daemon.exe)
│
├── release/
│   └── win-unpacked/        # Standalone Windows Desktop Application (PixCut Desktop.exe)
│
├── PixCut-Direct-Run.bat    # 1-Click launcher for local development / testing
└── PixCut-Build-Standalone-EXE.bat # 1-Click compiler for Windows .exe package
```

---

## Included Standalone Executables

This repository includes pre-built standalone binaries ready to run directly on Windows:

| Executable | Location | Purpose |
| :--- | :--- | :--- |
| **PixCut Desktop.exe** | [`release/win-unpacked/PixCut Desktop.exe`](release/win-unpacked/PixCut%20Desktop.exe) | Complete native standalone desktop app (Electron shell + React workspace) |
| **pixcut-ai-daemon.exe** | [`resources/backend-dist/pixcut-ai-daemon/pixcut-ai-daemon.exe`](resources/backend-dist/pixcut-ai-daemon/pixcut-ai-daemon.exe) | Embedded AI Neural Engine daemon powered by PyInstaller & rembg |

---

## Direct PC Run (No Cloud Deployment Needed)

### Method 1: Double-Click the Executable
Open the folder and launch:
```
release\win-unpacked\PixCut Desktop.exe
```
The application will launch the local loopback AI daemon automatically and open the clean desktop window.

### Method 2: Double-Click the 1-Click Launcher
Double-click:
```
PixCut-Direct-Run.bat
```

---

## Developer Guide & Building from Source

### Prerequisites
- Node.js (v18 or higher)
- Python 3.10+ with `pip`

### Step 1: Install Dependencies
```bash
# Install frontend & Electron packages
npm install

# Install Python backend packages
pip install -r backend/requirements.txt
```

### Step 2: Run in Development Mode
```bash
# Terminal 1: Start the AI Daemon
npm run py:run

# Terminal 2: Start Vite & Electron Shell
npm run dev
npm start
```

### Step 3: Compile Standalone Executables
```bash
# 1. Compile the Python AI daemon into a standalone executable:
npm run py:build

# 2. Package the Electron Windows desktop application:
npm run pack:win
```
The standalone binary will be generated in `release/win-unpacked/PixCut Desktop.exe`.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` / `Cmd + Z` | Undo last canvas operation |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo canvas operation |
| `Space + Left Drag` | Pan workspace freely |
| `Mouse Wheel` | Smooth zoom in / out (anchored to cursor) |
| `Middle Click + Drag` | Pan workspace |

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
