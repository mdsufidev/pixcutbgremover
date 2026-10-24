/**
 * src/services/api.ts
 * ====================
 * High-Level Application Service Layer for PixCut AI Engine.
 * Built on top of the centralized apiClient (fetchJson & postImageStream).
 */

import {
  HardwareInfo,
  DevicePreference,
  AIModelId,
  AIModelInfo,
  EngineSettings,
  EnhancerStatus,
  EnhanceResponse
} from '../types';
import { getDaemonBaseUrl, fetchJson, postImageStream, ImageStreamResult } from './apiClient';

export { getDaemonBaseUrl };

export interface RemoveBgResponse {
  blob: Blob;
  inferenceTimeMs: number;
  width: number;
  height: number;
  device: string;
  model: string;
}

/**
 * Health check ping to daemon.
 */
export async function pingDaemon(): Promise<boolean> {
  try {
    const baseUrl = await getDaemonBaseUrl();
    const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Retrieves detected hardware acceleration and system resource specs.
 */
export async function getHardwareInfo(): Promise<HardwareInfo | null> {
  try {
    return await fetchJson<HardwareInfo>('/api/hardware-info');
  } catch {
    return null;
  }
}

/**
 * Lists available background removal models.
 */
export async function getAvailableModels(): Promise<AIModelInfo[]> {
  try {
    return await fetchJson<AIModelInfo[]>('/api/models');
  } catch {
    return [];
  }
}

/**
 * Triggers background model weight download.
 */
export async function downloadModel(modelId: AIModelId): Promise<boolean> {
  try {
    await fetchJson('/api/models/download', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches persistent settings and synchronizes localStorage caches.
 */
export async function getEngineSettings(): Promise<EngineSettings | null> {
  try {
    const settings = await fetchJson<EngineSettings>('/api/settings');
    if (settings) {
      if (settings.device_preference) {
        localStorage.setItem('pixcut_device_pref', settings.device_preference);
      }
      if (settings.model_preference) {
        localStorage.setItem('pixcut_model_pref', settings.model_preference);
      }
    }
    return settings;
  } catch {
    return null;
  }
}

/**
 * Saves permanent device & model preference in daemon config.json.
 */
export async function saveConfiguration(
  device: DevicePreference,
  model: AIModelId
): Promise<EngineSettings> {
  localStorage.setItem('pixcut_device_pref', device);
  localStorage.setItem('pixcut_model_pref', model);

  return await fetchJson<EngineSettings>('/api/settings', {
    method: 'POST',
    body: JSON.stringify({
      device_preference: device,
      model_preference: model,
    }),
  });
}

/**
 * Convenience wrapper for device preference update.
 */
export async function saveDevicePreference(preference: DevicePreference): Promise<EngineSettings> {
  const model = (localStorage.getItem('pixcut_model_pref') as AIModelId) || 'u2net';
  return saveConfiguration(preference, model);
}

/**
 * Processes high-performance local AI background removal.
 */
export async function processBackgroundRemoval(
  imageBlobOrFile: Blob | File,
  filename: string = 'image.png',
  alphaMatting: boolean = false
): Promise<RemoveBgResponse> {
  const result: ImageStreamResult = await postImageStream(
    '/api/remove-bg',
    imageBlobOrFile,
    filename,
    {
      alpha_matting: alphaMatting,
      fg_threshold: 240,
      bg_threshold: 10,
      erode_size: 10,
    }
  );

  return {
    blob: result.blob,
    inferenceTimeMs: result.inferenceTimeMs,
    width: result.width,
    height: result.height,
    device: result.device,
    model: result.model || 'u2net',
  };
}

/**
 * Checks Real-ESRGAN / Vulkan enhancer availability and status.
 */
export async function getEnhancerStatus(): Promise<EnhancerStatus | null> {
  try {
    return await fetchJson<EnhancerStatus>('/api/enhancer/status');
  } catch {
    return null;
  }
}

/**
 * Processes Real-ESRGAN + CodeFormer hybrid image enhancement.
 */
export async function processImageEnhance(
  imageBlobOrFile: Blob | File,
  filename: string = 'image.png',
  scale: number = 1,
  model: string = 'realesr-animevideov3',
  tile: number = 0
): Promise<EnhanceResponse> {
  const safeScale = [1, 2, 3, 4].includes(scale) ? scale : 1;

  const result: ImageStreamResult = await postImageStream(
    '/api/enhance',
    imageBlobOrFile,
    filename,
    {
      scale: safeScale,
      model: model || 'realesr-animevideov3',
      tile: tile,
    }
  );

  return {
    blob: result.blob,
    inferenceTimeMs: result.inferenceTimeMs,
    width: result.width,
    height: result.height,
    scale: result.scale || safeScale,
    model: result.model || model,
    engine: result.engine || 'Real-ESRGAN (NCNN/Vulkan)',
  };
}
