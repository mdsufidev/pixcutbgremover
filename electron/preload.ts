import { contextBridge, ipcRenderer } from 'electron';

export interface BackendDownloadProgress {
  percent: number;
  downloadedMB: number;
  totalMB: number;
  speedMBs: number;
}

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  openFileDialog: () => Promise<{
    canceled: boolean;
    filePath?: string;
    fileData?: ArrayBuffer;
    fileName?: string;
    mimeType?: string;
  }>;
  saveFileDialog: (defaultName: string) => Promise<{ canceled: boolean; filePath?: string }>;
  saveFile: (filePath: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
  getDaemonUrl: () => Promise<string>;
  checkBackendInstalled: () => Promise<{ installed: boolean; path?: string }>;
  downloadBackend: (customUrl?: string) => Promise<{ success: boolean; error?: string }>;
  onBackendDownloadProgress: (callback: (progress: BackendDownloadProgress) => void) => () => void;
  restartBackend: () => Promise<boolean>;
  isElectron: boolean;
}

const api: ElectronAPI = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openFileDialog: () => ipcRenderer.invoke('dialog-open-file'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog-save-file', defaultName),
  saveFile: (filePath: string, buffer: ArrayBuffer) => ipcRenderer.invoke('file-save', filePath, buffer),
  getDaemonUrl: () => ipcRenderer.invoke('get-daemon-url'),
  checkBackendInstalled: () => ipcRenderer.invoke('check-backend-installed'),
  downloadBackend: (customUrl?: string) => ipcRenderer.invoke('download-backend', customUrl),
  onBackendDownloadProgress: (callback: (progress: BackendDownloadProgress) => void) => {
    const handler = (_event: any, progress: BackendDownloadProgress) => callback(progress);
    ipcRenderer.on('backend-download-progress', handler);
    return () => {
      ipcRenderer.removeListener('backend-download-progress', handler);
    };
  },
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
