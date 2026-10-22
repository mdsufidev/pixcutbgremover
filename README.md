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

## 🚀 Quick Download & Install (Zero Setup Needed)

Anyone can download and run PixCut Desktop directly on Windows without deploying or setting up servers:

| Package Type | File Name | Size | Instructions |
| :--- | :--- | :--- | :--- |
| **⭐ Windows 1-Click Installer (.exe)** | [**`PixCut Desktop Setup 1.0.0.exe`**](release/PixCut%20Desktop%20Setup%201.0.0.exe) | ~291 MB | **Recommended**: Download and double-click to install. It installs all dependencies cleanly and creates a Desktop shortcut. |
| **📦 Windows Portable Archive (.zip)** | [**`PixCut-Desktop-Portable-x64.zip`**](release/PixCut-Desktop-Portable-x64.zip) | ~331 MB | Download, **Right-click → Extract All**, then run `PixCut Desktop.exe`. No installation required. |
| **⚡ Standalone AI Daemon (.exe)** | [**`pixcut-ai-daemon.exe`**](resources/backend-dist/pixcut-ai-daemon.exe) | ~213 MB | Single-file embedded Python FastAPI + rembg + ONNX Runtime executable with auto-fallback to CPU/CUDA. |

> [!IMPORTANT]
> **Important Note regarding `ffmpeg.dll` or `python314.dll` missing errors**:
> If you run `PixCut Desktop.exe` directly from inside a `.zip` preview or download only a single `.exe` file without extracting its sibling DLLs, Windows will show a `missing ffmpeg.dll` error.
> **Solution**: Always use the **1-Click Setup Installer (`PixCut Desktop Setup 1.0.0.exe`)** which automatically extracts everything to your PC, or **Extract All** from the Portable `.zip` before launching.

---

## ✨ Key Features

- **100% Offline & Zero Friction**: No accounts, sign-ups, API keys, or internet connection required. All neural inference runs directly on your local CPU or GPU.
- **Hardware-Aware Neural Engine**: Inspects local hardware capabilities. Automatically activates **NVIDIA CUDA** (`CUDAExecutionProvider`) when available and gracefully falls back to multi-threaded **CPU** (`CPUExecutionProvider`) with zero crashes.
- **Interactive Before / After Split Slider**: Real-time draggable split comparison curtain to inspect edge cutouts against the original high-resolution photo.
- **"Magic Erase / Color Click" BFS Flood-Fill**: Instant contiguous and global color removal with adjustable color Euclidean distance tolerance ($0\text{--}100\%$).
- **Precision Brush Erase & Restore**: Manual eraser brush with customizable diameter ($4\text{--}200\text{px}$) and a dedicated **Restore Brush** to paint back original pixels from the source photo.
- **Non-Destructive History Stack**: Step forward and backward seamlessly using `Ctrl+Z` / `Ctrl+Y` with deep-cloned canvas state management (`ctx.getImageData`).
- **Smooth Mouse-Anchored Pan & Zoom**: Butter-smooth zoom up to $800\%$ anchored directly to cursor coordinates with `1:1` native pixel and `Fit to Window` presets.
- **Direct Local File System Export**: Export cutouts directly to your PC storage as high-resolution transparent PNG, WebP, or solid color fill (Pure White, Deep Charcoal, or Custom Hex).

---

## 🏗️ Architecture Overview

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
├── release/
│   ├── PixCut Desktop Setup 1.0.0.exe  # Standalone Windows Installer (NSIS)
│   └── PixCut-Desktop-Portable-x64.zip # Standalone Portable Zip Package
│
├── PixCut-Direct-Run.bat    # 1-Click launcher for local development / testing
└── PixCut-Build-Standalone-EXE.bat # 1-Click compiler for Windows .exe package
```

---

## 💻 Developer Guide & Building from Source

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
# Terminal 1: Start local Python AI Daemon
npm run py:run

# Terminal 2: Start Vite & Electron desktop window
npm run dev:vite
npm start
```

Or simply double-click [`PixCut-Direct-Run.bat`](PixCut-Direct-Run.bat) on Windows to start both simultaneously.

### Step 3: Build Standalone Windows Packages
```bash
# Build the single-file Python daemon
npm run py:build

# Package the Windows NSIS Installer (.exe)
npm run pack:win
```

Or simply double-click [`PixCut-Build-Standalone-EXE.bat`](PixCut-Build-Standalone-EXE.bat).

The built installer will be output directly into `release/PixCut Desktop Setup 1.0.0.exe`.

---

## 📜 License
MIT License. Free for personal and commercial desktop use.
