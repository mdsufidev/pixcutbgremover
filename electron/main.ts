import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { DaemonManager } from './daemon';

let mainWindow: BrowserWindow | null = null;
const daemon = new DaemonManager();

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 680,
    frame: false, // Frameless window for custom clean Swiss chrome
    backgroundColor: '#090a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5173');
    } catch {
      // In case vite dev server isn't running, load dist file
      const distPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(distPath)) {
        await mainWindow.loadFile(distPath);
      }
    }
  } else {
    const prodPath = path.join(__dirname, '../dist/index.html');
    const altPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(prodPath)) {
      await mainWindow.loadFile(prodPath);
    } else if (fs.existsSync(altPath)) {
      await mainWindow.loadFile(altPath);
    } else {
      console.error('Cannot locate index.html');
    }
  }

  // Ensure window is shown immediately
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Safety fallback: if ready-to-show is delayed, show window anyway after 500ms
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

ipcMain.handle('get-daemon-url', () => {
  return daemon.baseUrl;
});

ipcMain.handle('dialog-open-file', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Image to Remove Background',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const fileBuffer = await fs.promises.readFile(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let mimeType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.bmp') mimeType = 'image/bmp';

  return {
    canceled: false,
    filePath,
    fileName,
    mimeType,
    fileData: fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength),
  };
});

ipcMain.handle('dialog-save-file', async (_event, defaultName: string) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Transparent Image',
    defaultPath: defaultName || 'pixcut-export.png',
    filters: [
      { name: 'PNG Image (*.png)', extensions: ['png'] },
      { name: 'JPEG Image (*.jpg)', extensions: ['jpg'] },
      { name: 'WebP Image (*.webp)', extensions: ['webp'] },
    ],
  });

  return {
    canceled: result.canceled,
    filePath: result.filePath,
  };
});

ipcMain.handle('file-save', async (_event, filePath: string, arrayBuffer: ArrayBuffer) => {
  try {
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filePath, buffer);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// App Lifecycle
app.whenReady().then(async () => {
  // 1. Show the desktop window IMMEDIATELY so user gets instant visual feedback
  await createWindow();

  // 2. Start the local loopback AI daemon in the background
  console.log('[PixCut Main] Starting background AI daemon...');
  daemon.start().catch((err) => {
    console.warn('[PixCut Main] Daemon start warning:', err);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await daemon.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await daemon.stop();
});
