/**
 * src/services/apiClient.ts
 * =========================
 * Centralized HTTP Client for PixCut AI Daemon.
 * Manages base URL resolution, unified JSON fetching, and binary image streaming with X-* headers.
 */

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
      // fallback to default loopback
    }
  }

  // Standalone dev preview or direct loopback
  cachedDaemonBaseUrl = 'http://127.0.0.1:8765';
  return cachedDaemonBaseUrl;
}

/**
 * Type-safe JSON Fetcher with unified error handling
 */
export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = await getDaemonBaseUrl();
  const res = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`API Error (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  if (json.success === false) {
    throw new Error(json.error || json.detail || 'API request failed');
  }

  return (json.data !== undefined ? json.data : json) as T;
}

/**
 * Standardized binary image result with diagnostic headers
 */
export interface ImageStreamResult {
  blob: Blob;
  inferenceTimeMs: number;
  width: number;
  height: number;
  device: string;
  model: string;
  scale?: number;
  engine?: string;
}

/**
 * Uploads an image (FormData) and parses binary output along with diagnostic X-* headers.
 */
export async function postImageStream(
  endpoint: string,
  imageFileOrBlob: Blob | File,
  filename: string,
  queryParams: Record<string, string | number | boolean> = {}
): Promise<ImageStreamResult> {
  const baseUrl = await getDaemonBaseUrl();
  const formData = new FormData();
  formData.append('file', imageFileOrBlob, filename);

  const queryEntries = Object.entries(queryParams)
    .filter(([_, val]) => val !== undefined && val !== null)
    .map(([key, val]) => [key, String(val)]);
  const queryString = queryEntries.length > 0 ? `?${new URLSearchParams(queryEntries).toString()}` : '';

  const response = await fetch(`${baseUrl}${endpoint}${queryString}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.error || errorDetail;
    } catch {
      const errText = await response.text().catch(() => '');
      if (errText) errorDetail = errText;
    }
    throw new Error(`AI Engine error (${response.status}): ${errorDetail}`);
  }

  const resultBlob = await response.blob();
  const inferenceTimeMs = parseFloat(response.headers.get('X-Inference-Time-Ms') || '0');
  const width = parseInt(response.headers.get('X-Image-Width') || '0', 10);
  const height = parseInt(response.headers.get('X-Image-Height') || '0', 10);
  const device = response.headers.get('X-Device') || 'CPU';
  const model = response.headers.get('X-Model') || '';
  const scale = parseInt(response.headers.get('X-Scale') || '1', 10);
  const engine = response.headers.get('X-Engine') || 'PixCut AI Engine';

  return {
    blob: resultBlob,
    inferenceTimeMs,
    width,
    height,
    device,
    model,
    scale,
    engine,
  };
}
