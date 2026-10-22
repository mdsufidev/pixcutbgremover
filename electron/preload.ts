import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  openFileDialog: () => Promise<{ canceled: boolean; filePath?: string; fileData?: ArrayBuffer; fileName?: string; mimeType?: string }>;
  saveFileDialog: (defaultName: string) => Promise<{ canceled: boolean; filePath?: string }>;
  saveFile: (filePath: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
  getDaemonUrl: () => Promise<string>;
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
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
