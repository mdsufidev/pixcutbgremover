export type ToolMode = 'bg-remover' | 'enhancer';

export type ToolType = 'pan' | 'magic-erase' | 'brush-erase' | 'restore-brush' | 'crop' | 'enhance';

export type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '2:3';

export type DevicePreference = 'auto' | 'gpu' | 'cpu';

export type AIModelId = 'u2net' | 'u2netp' | 'silueta' | 'isnet-general-use';

export interface EnhancerModelInfo {
  id: string;
  name: string;
  tag: string;
  description: string;
  scales: number[];
  default_scale: number;
}

export interface EnhancerStatus {
  available: boolean;
  engine: string;
  binary_path?: string;
  models_dir?: string;
  supported_models: EnhancerModelInfo[];
}

export interface EnhanceResponse {
  blob: Blob;
  inferenceTimeMs: number;
  width: number;
  height: number;
  scale: number;
  model: string;
  engine: string;
}

export interface AIModelInfo {
  id: AIModelId;
  name: string;
  tag: string;
  description: string;
  size_mb: number;
  recommended_device: 'gpu' | 'cpu' | 'both';
  is_downloaded: boolean;
  is_active: boolean;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HardwareInfo {
  accelerator: string;
  device_preference?: DevicePreference;
  target_preference?: DevicePreference;
  active_hardware_mode?: 'gpu' | 'cpu';
  model_loaded?: string;
  detected_gpu?: string | null;
  os: string;
  arch: string;
  cpu_cores: number;
  ram_total_gb: number;
  ram_available_gb: number;
  status: string;
  is_ready?: boolean;
  is_warming?: boolean;
  is_switching?: boolean;
  last_error?: string | null;
}

export interface EngineSettings {
  device_preference: DevicePreference;
  model_preference: AIModelId;
  active_model: string;
  active_provider: string;
  detected_gpu: string | null;
  available_providers: string[];
  available_models: AIModelInfo[];
  config_path?: string;
  hardware: HardwareInfo;
}

export interface ImageMetadata {
  name: string;
  originalWidth: number;
  originalHeight: number;
  originalSizeFormatted: string;
  inferenceTimeMs?: number;
  device?: string;
  model?: string;
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
      checkBackendInstalled: () => Promise<{ installed: boolean; path?: string }>;
      downloadBackend: (customUrl?: string) => Promise<{ success: boolean; error?: string }>;
      onBackendDownloadProgress: (
        callback: (progress: {
          percent: number;
          downloadedMB: number;
          totalMB: number;
          speedMBs: number;
        }) => void
      ) => () => void;
      restartBackend: () => Promise<boolean>;
      isElectron: boolean;
    };
  }
}
