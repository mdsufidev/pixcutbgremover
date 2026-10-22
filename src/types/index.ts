export type ToolType = 'pan' | 'magic-erase' | 'brush-erase' | 'restore-brush' | 'crop';

export type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '2:3';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HardwareInfo {
  accelerator: string;
  os: string;
  arch: string;
  cpu_cores: number;
  ram_total_gb: number;
  ram_available_gb: number;
  model_loaded: string;
  status: string;
}

export interface ImageMetadata {
  name: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeFormatted: string;
  inferenceTimeMs?: number;
  device?: string;
  originalUrl: string;
  processedUrl?: string;
}

export interface ExportSettings {
  format: 'png' | 'jpg' | 'webp';
  backgroundType: 'transparent' | 'color';
  backgroundColor: string;
  quality: number; // 0.1 to 1.0
}

declare global {
  interface Window {
    electronAPI?: {
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
      saveFileDialog: (defaultName: string) => Promise<{
        canceled: boolean;
        filePath?: string;
      }>;
      saveFile: (filePath: string, buffer: ArrayBuffer) => Promise<{
        success: boolean;
        error?: string;
      }>;
      getDaemonUrl: () => Promise<string>;
      isElectron: boolean;
    };
  }
}
