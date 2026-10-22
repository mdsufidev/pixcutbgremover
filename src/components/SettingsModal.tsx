import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Cpu,
  Sparkles,
  Check,
  Loader2,
  HardDrive,
  Info,
  CheckCircle2,
  AlertTriangle,
  CloudDownload,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DevicePreference, AIModelId, AIModelInfo, EngineSettings, HardwareInfo } from '../types';
import { getEngineSettings, saveConfiguration, downloadModel } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHardware: HardwareInfo | null;
  onHardwareUpdated: (newHardware: HardwareInfo) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentHardware,
  onHardwareUpdated,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreference>('auto');
  const [selectedModel, setSelectedModel] = useState<AIModelId>('u2net');
  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch settings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const cachedDevice = (localStorage.getItem('pixcut_device_pref') as DevicePreference) || 
      currentHardware?.device_preference || 'auto';
    const cachedModel = (localStorage.getItem('pixcut_model_pref') as AIModelId) || 'u2net';

    setSelectedDevice(cachedDevice);
    setSelectedModel(cachedModel);

    getEngineSettings()
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setSettings(data);
          setSelectedDevice(data.device_preference);
          setSelectedModel(data.model_preference || 'u2net');
          if (data.available_models) {
            setModels(data.available_models);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentHardware]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Auto-recommend model when switching device
  const handleDeviceChange = (dev: DevicePreference) => {
    setSelectedDevice(dev);
    if (dev === 'cpu' && selectedModel === 'u2net') {
      setSelectedModel('u2netp'); // CPU: Recommend fast 4.5MB u2netp
    } else if (dev === 'gpu' && selectedModel === 'u2netp') {
      setSelectedModel('u2net'); // GPU: Recommend high precision u2net
    }
  };

  const handleDownloadModel = async (modelId: AIModelId, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingModelId(modelId);
    setErrorMessage(null);

    try {
      const ok = await downloadModel(modelId);
      if (ok) {
        setModels((prev) =>
          prev.map((m) => (m.id === modelId ? { ...m, is_downloaded: true } : m))
        );
      } else {
        setErrorMessage(`Failed downloading model ${modelId}. Check internet connection.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error downloading model from internet');
    } finally {
      setDownloadingModelId(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const updated = await saveConfiguration(selectedDevice, selectedModel);
      setSettings(updated);
      if (updated.available_models) {
        setModels(updated.available_models);
      }
      if (updated.hardware) {
        onHardwareUpdated(updated.hardware);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentGpu = Boolean(
    (settings?.active_provider || currentHardware?.accelerator || '').toLowerCase().includes('gpu') ||
    (settings?.active_provider || currentHardware?.accelerator || '').toLowerCase().includes('cuda') ||
    (settings?.active_provider || currentHardware?.accelerator || '').toLowerCase().includes('directml') ||
    (settings?.active_provider || currentHardware?.accelerator || '').toLowerCase().includes('dml')
  );

  const detectedGpu = settings?.detected_gpu || currentHardware?.detected_gpu || 'GPU Detected';
  const activeModelName = settings?.active_model || currentHardware?.model_loaded || selectedModel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#141517] border border-[#27272a] rounded-lg shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between bg-[#0f1012] select-none">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Settings: AI Engine & Models</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#27272a] rounded transition-colors duration-150"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active status banner */}
          <div className="p-3 bg-[#18191c] border border-[#27272a] rounded-md flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-medium">
                {isCurrentGpu ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">
                      {settings?.active_provider || currentHardware?.accelerator || 'GPU'}
                    </span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-zinc-200">
                      {settings?.active_provider || currentHardware?.accelerator || 'CPU'}
                    </span>
                  </>
                )}
              </div>
              <span className="text-zinc-600">•</span>
              <div className="flex items-center gap-1 text-zinc-300 font-sans">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Model: <strong>{activeModelName}</strong></span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] bg-[#27272a] text-zinc-300">
              {isLoading ? 'Loading...' : 'Active'}
            </span>
          </div>

          {/* Note about on-demand internet download */}
          <div className="p-3 bg-[#0f1012] border border-[#27272a] rounded-md flex items-start gap-2.5 text-[11px] text-zinc-400">
            <CloudDownload className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-zinc-200">Lean Installer Architecture:</strong> The initial installer is kept compact without heavy model weights. When you select a model, it downloads directly from the internet and stays cached permanently on your PC for offline use.
            </p>
          </div>

          {/* Section 1: Execution Device */}
          <div>
            <div className="mb-2">
              <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Execution Hardware (GPU / CPU)</span>
              </label>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Choose whether inference runs on your graphics card or multi-core CPU.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2.5">
              {/* Option 1: GPU */}
              <button
                type="button"
                onClick={() => handleDeviceChange('gpu')}
                className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all duration-150 ${
                  selectedDevice === 'gpu'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded ${selectedDevice === 'gpu' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-zinc-400'}`}>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  {selectedDevice === 'gpu' && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                </div>
                <div className="text-xs font-semibold text-zinc-100">GPU Acceleration</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  DirectML / CUDA ({detectedGpu}). Fastest 100–300ms speed.
                </div>
              </button>

              {/* Option 2: CPU */}
              <button
                type="button"
                onClick={() => handleDeviceChange('cpu')}
                className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all duration-150 ${
                  selectedDevice === 'cpu'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded ${selectedDevice === 'cpu' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-zinc-400'}`}>
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  {selectedDevice === 'cpu' && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                </div>
                <div className="text-xs font-semibold text-zinc-100">CPU Multi-Core</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Multi-threaded CPU. Keeps GPU memory free & saves laptop battery.
                </div>
              </button>

              {/* Option 3: Auto */}
              <button
                type="button"
                onClick={() => handleDeviceChange('auto')}
                className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all duration-150 ${
                  selectedDevice === 'auto'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded ${selectedDevice === 'auto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-zinc-400'}`}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  {selectedDevice === 'auto' && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                </div>
                <div className="text-xs font-semibold text-zinc-100">Auto-Detect</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Prioritizes GPU if compatible; falls back to CPU automatically.
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: AI Neural Model Selection */}
          <div>
            <div className="mb-2">
              <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
                <span>2. AI Neural Model Selection</span>
                <span className="text-[11px] font-normal text-zinc-400 normal-case">
                  GPU Model vs CPU Model
                </span>
              </label>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Select which neural model to use. U2NetP is specifically optimized for instant CPU processing, while U2Net provides full precision for GPU.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
              {/* Model 1: U2Net (GPU Recommended) */}
              <div
                onClick={() => setSelectedModel('u2net')}
                className={`p-3 rounded-md border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  selectedModel === 'u2net'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-100">U2Net (Standard)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        GPU Recommended
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        selectedModel === 'u2net'
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-zinc-600'
                      }`}
                    >
                      {selectedModel === 'u2net' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    Full-precision neural network for clean edges, hair, and portraits (~176 MB).
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#27272a] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Size: 176 MB</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Cached / Ready</span>
                  </span>
                </div>
              </div>

              {/* Model 2: U2NetP (CPU Recommended) */}
              <div
                onClick={() => setSelectedModel('u2netp')}
                className={`p-3 rounded-md border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  selectedModel === 'u2netp'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-100">U2NetP (Lightweight)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        CPU Recommended
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        selectedModel === 'u2netp'
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-zinc-600'
                      }`}
                    >
                      {selectedModel === 'u2netp' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    Ultra-compact model (~4.5 MB). 5x faster on CPU, low memory usage, no lag.
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#27272a] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Size: 4.5 MB</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Cached / Ready</span>
                  </span>
                </div>
              </div>

              {/* Model 3: Silueta (Compact) */}
              <div
                onClick={() => setSelectedModel('silueta')}
                className={`p-3 rounded-md border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  selectedModel === 'silueta'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-100">Silueta (Compact)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Balanced
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        selectedModel === 'silueta'
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-zinc-600'
                      }`}
                    >
                      {selectedModel === 'silueta' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    Edge-aware compact model (~43 MB). Balanced speed and detail on both CPU and GPU.
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#27272a] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Size: 43 MB</span>
                  {models.find((m) => m.id === 'silueta')?.is_downloaded ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Cached</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDownloadModel('silueta', e)}
                      disabled={downloadingModelId === 'silueta'}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-500/30"
                    >
                      {downloadingModelId === 'silueta' ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <CloudDownload className="w-2.5 h-2.5" />
                          <span>Download Web</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Model 4: IS-Net (Precision) */}
              <div
                onClick={() => setSelectedModel('isnet-general-use')}
                className={`p-3 rounded-md border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  selectedModel === 'isnet-general-use'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-100">IS-Net (Ultra Precision)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Extreme Detail
                      </span>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        selectedModel === 'isnet-general-use'
                          ? 'border-emerald-500 bg-emerald-500 text-black'
                          : 'border-zinc-600'
                      }`}
                    >
                      {selectedModel === 'isnet-general-use' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
                    Dichotomous Segmentation model for complex silhouettes & product photography (~174 MB).
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#27272a] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Size: 174 MB</span>
                  {models.find((m) => m.id === 'isnet-general-use')?.is_downloaded ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Cached</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDownloadModel('isnet-general-use', e)}
                      disabled={downloadingModelId === 'isnet-general-use'}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-500/30"
                    >
                      {downloadingModelId === 'isnet-general-use' ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <CloudDownload className="w-2.5 h-2.5" />
                          <span>Download Web</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {saveSuccess && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-md flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Permanent setting saved! Engine active on <strong>{settings?.active_provider}</strong> using model <strong>{settings?.active_model}</strong>.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-md flex items-center gap-2 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#27272a] bg-[#0f1012] flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono hidden sm:flex items-center gap-1.5">
            <span>Saved to %APPDATA%\PixCutBg</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-[#18191c] hover:bg-[#27272a] border border-[#27272a] rounded transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-medium text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded flex items-center gap-1.5 transition-colors duration-150 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading & Pre-warming...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Permanent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
