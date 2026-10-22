import { HardwareInfo, DevicePreference, AIModelId, AIModelInfo, EngineSettings } from '../types';

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
  model: string;
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

export async function getAvailableModels(): Promise<AIModelInfo[]> {
  const baseUrl = await getDaemonBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/models`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export async function downloadModel(modelId: AIModelId): Promise<boolean> {
  const baseUrl = await getDaemonBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/models/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getEngineSettings(): Promise<EngineSettings | null> {
  const baseUrl = await getDaemonBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/settings`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) {
      if (json.data.device_preference) {
        localStorage.setItem('pixcut_device_pref', json.data.device_preference);
      }
      if (json.data.model_preference) {
        localStorage.setItem('pixcut_model_pref', json.data.model_preference);
      }
      return json.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveConfiguration(
  device: DevicePreference,
  model: AIModelId
): Promise<EngineSettings> {
  const baseUrl = await getDaemonBaseUrl();
  localStorage.setItem('pixcut_device_pref', device);
  localStorage.setItem('pixcut_model_pref', model);

  const res = await fetch(`${baseUrl}/api/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      device_preference: device,
      model_preference: model,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update configuration: ${errText}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to update configuration');
  }

  return json.data;
}

export async function saveDevicePreference(preference: DevicePreference): Promise<EngineSettings> {
  const model = (localStorage.getItem('pixcut_model_pref') as AIModelId) || 'u2net';
  return saveConfiguration(preference, model);
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
  const model = response.headers.get('X-Model') || 'u2net';

  return {
    blob: resultBlob,
    inferenceTimeMs,
    width,
    height,
    device,
    model,
  };
}
