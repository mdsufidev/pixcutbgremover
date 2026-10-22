import { HardwareInfo } from '../types';

let cachedDaemonBaseUrl: string | null = null;

export async function getDaemonBaseUrl(): Promise<string> {
  if (cachedDaemonBaseUrl) return cachedDaemonBaseUrl;
  
  if (window.electronAPI) {
    try {
      const url = await window.electronAPI.getDaemonUrl();
      if (url) {
        cachedDaemonBaseUrl = url;
        return url;
      }
    } catch {
      // fallback
    }
  }
  
  // Default fallback for standalone web dev preview
  cachedDaemonBaseUrl = 'http://127.0.0.1:8765';
  return cachedDaemonBaseUrl;
}

export interface RemoveBgResponse {
  blob: Blob;
  inferenceTimeMs: number;
  width: number;
  height: number;
  device: string;
}

export async function pingDaemon(): Promise<boolean> {
  const baseUrl = await getDaemonBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getHardwareInfo(): Promise<HardwareInfo | null> {
  const baseUrl = await getDaemonBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/hardware-info`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function processBackgroundRemoval(
  imageBlobOrFile: Blob | File,
  filename: string = 'image.png',
  alphaMatting: boolean = false
): Promise<RemoveBgResponse> {
  const baseUrl = await getDaemonBaseUrl();
  const formData = new FormData();
  formData.append('file', imageBlobOrFile, filename);

  const query = new URLSearchParams({
    alpha_matting: alphaMatting ? 'true' : 'false',
    fg_threshold: '240',
    bg_threshold: '10',
    erode_size: '10',
  });

  const response = await fetch(`${baseUrl}/api/remove-bg?${query.toString()}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Engine error: ${response.statusText} (${errText})`);
  }

  const resultBlob = await response.blob();
  const inferenceTimeMs = parseFloat(response.headers.get('X-Inference-Time-Ms') || '0');
  const width = parseInt(response.headers.get('X-Image-Width') || '0', 10);
  const height = parseInt(response.headers.get('X-Image-Height') || '0', 10);
  const device = response.headers.get('X-Device') || 'CPU';

  return {
    blob: resultBlob,
    inferenceTimeMs,
    width,
    height,
    device,
  };
}
