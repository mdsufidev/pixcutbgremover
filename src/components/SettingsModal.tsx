import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Cpu,
  Sparkles,
  Check,
  Loader2,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  CloudDownload,
  Layers,
  Server,
  Activity,
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

  // Initialize settings ONLY when modal opens (Prevents background polling from resetting state)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    // Initial local fallback before network response
    const cachedDevice =
      (localStorage.getItem('pixcut_device_pref') as DevicePreference) ||
      currentHardware?.device_preference ||
      'auto';
    const cachedModel = (localStorage.getItem('pixcut_model_pref') as AIModelId) || 'u2net';

    setSelectedDevice(cachedDevice);
    setSelectedModel(cachedModel);

    // Fetch confirmed settings from daemon
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
  }, [isOpen]); // Root cause fix: depend ONLY on isOpen, NOT currentHardware!

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
    setSaveSuccess(false);
    setErrorMessage(null);

    if (dev === 'cpu' && selectedModel === 'u2net') {
      setSelectedModel('u2netp');
    } else if (dev === 'gpu' && selectedModel === 'u2netp') {
      setSelectedModel('u2net');
    }
  };

  const handleDownloadModel = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingModelId(modelId);
    setErrorMessage(null);

    try {
      const success = await downloadModel(modelId as AIModelId);
      if (success) {
        setModels((prev) =>
          prev.map((m) => (m.id === modelId ? { ...m, is_downloaded: true } : m))
        );
        setSelectedModel(modelId as AIModelId);
      } else {
        setErrorMessage(`Failed to download ${modelId}. Check internet connection.`);
      }
    } catch (err: any) {
      setErrorMessage(`Download error: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingModelId(null);
    }
  };

  const handleApplyChanges = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      // 1. Record requested preferences in local storage immediately
      localStorage.setItem('pixcut_device_pref', selectedDevice);
      localStorage.setItem('pixcut_model_pref', selectedModel);

      // 2. Send configuration update to backend daemon (waits up to 3s for session pre-warm)
      const updated = await saveConfiguration(selectedDevice, selectedModel);
      if (updated) {
        setSettings(updated);
        setSaveSuccess(true);

        const newHardwareInfo: HardwareInfo = {
          ...(currentHardware || {
            os: 'Windows',
            arch: 'x64',
            cpu_cores: 4,
            ram_total_gb: 16,
            ram_available_gb: 8,
          }),
          ...(updated.hardware || {}),
          accelerator: updated.active_provider,
          model_loaded: updated.active_model,
          device_preference: updated.device_preference,
          status: updated.hardware?.status || 'ready',
          is_switching: false,
        };

        if (onHardwareUpdated) {
          onHardwareUpdated(newHardwareInfo);
        }

        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setErrorMessage('Failed to apply configuration to AI daemon.');
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || 'Could not communicate with AI daemon'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const activeProvider = settings?.active_provider || currentHardware?.accelerator || 'CPU (Multi-Threaded)';
  const isCurrentGpu = Boolean(
    activeProvider.toLowerCase().includes('cuda') ||
    activeProvider.toLowerCase().includes('gpu') ||
    activeProvider.toLowerCase().includes('directml') ||
    activeProvider.toLowerCase().includes('dml') ||
    currentHardware?.active_hardware_mode === 'gpu'
  );

  const detectedGpu =
    settings?.detected_gpu || currentHardware?.detected_gpu || 'DirectML Compatible GPU';
  const activeModelName =
    settings?.active_model || currentHardware?.model_loaded || selectedModel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-2xs animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-2xl bg-white border border-gray-300 rounded-2xl shadow-xl overflow-hidden flex flex-col text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-12 px-5 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-900">Workstation Engine & Hardware Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active Live Status Bar */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${isCurrentGpu ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                {isCurrentGpu ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">{activeProvider}</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-gray-800 font-semibold">{activeProvider}</span>
                  </>
                )}
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1 text-gray-700 font-sans">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Model: <strong className="text-gray-900">{activeModelName}</strong></span>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded text-[11px] bg-white border border-gray-200 text-gray-700 shadow-2xs font-sans">
              {isLoading ? 'Checking Engine...' : 'Live Active'}
            </span>
          </div>

          {/* Section 1: Execution Hardware Selector */}
          <div>
            <div className="mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                1. Inference Hardware Acceleration
              </label>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Select your preferred processing engine. Changes apply permanently to your local workstation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
              {/* Option 1: GPU Acceleration */}
              <button
                type="button"
                onClick={() => handleDeviceChange('gpu')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                  selectedDevice === 'gpu'
                    ? 'border-emerald-600 bg-emerald-50/60 text-gray-900 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div className={`p-1.5 rounded-lg ${selectedDevice === 'gpu' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    {selectedDevice === 'gpu' ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-gray-900">GPU Acceleration</div>
                  <div className="text-[11px] text-gray-600 mt-1 font-mono font-medium truncate" title={detectedGpu}>
                    {detectedGpu}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                    DirectML / CUDA engine. Fastest 100–300ms inference pass.
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/80 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-emerald-700 font-semibold">High Performance</span>
                  {isCurrentGpu && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono">
                      Active
                    </span>
                  )}
                </div>
              </button>

              {/* Option 2: CPU Multi-Core */}
              <button
                type="button"
                onClick={() => handleDeviceChange('cpu')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                  selectedDevice === 'cpu'
                    ? 'border-emerald-600 bg-emerald-50/60 text-gray-900 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div className={`p-1.5 rounded-lg ${selectedDevice === 'cpu' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <Cpu className="w-4 h-4" />
                    </div>
                    {selectedDevice === 'cpu' ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-gray-900">CPU Multi-Core</div>
                  <div className="text-[11px] text-gray-600 mt-1 font-mono font-medium">
                    {currentHardware?.cpu_cores || 8} CPU Execution Cores
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Multi-threaded processor mode. Frees dedicated GPU memory.
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/80 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-gray-600 font-semibold">Low VRAM Load</span>
                  {!isCurrentGpu && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold font-mono">
                      Active
                    </span>
                  )}
                </div>
              </button>

              {/* Option 3: Auto-Detect */}
              <button
                type="button"
                onClick={() => handleDeviceChange('auto')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                  selectedDevice === 'auto'
                    ? 'border-emerald-600 bg-emerald-50/60 text-gray-900 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div className={`p-1.5 rounded-lg ${selectedDevice === 'auto' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    {selectedDevice === 'auto' ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-gray-900">Auto-Detect</div>
                  <div className="text-[11px] text-gray-600 mt-1 font-mono font-medium">
                    Self-Configuring
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Prioritizes GPU if compatible; falls back to CPU automatically.
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200/80 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-emerald-700 font-semibold">Recommended</span>
                  {settings?.device_preference === 'auto' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono">
                      Active
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: AI Neural Model Selection */}
          <div>
            <div className="mb-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                <span>2. AI Segmentation Neural Model</span>
                <span className="text-[11px] font-normal text-gray-500 normal-case font-mono">
                  Offline Pre-Trained Weights
                </span>
              </label>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Choose the neural network precision. U2NetP runs instantly on CPU, while standard U2Net delivers high edge precision for GPU.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
              {/* Model 1: U2Net */}
              <div
                onClick={() => setSelectedModel('u2net')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  selectedModel === 'u2net'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">U2Net (Standard)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                        GPU Recommended
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedModel === 'u2net'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedModel === 'u2net' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                    Full-precision neural network for clean cutout edges, portrait hair, and transparent products (~176 MB).
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Size: 176 MB</span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Cached / Ready</span>
                  </span>
                </div>
              </div>

              {/* Model 2: U2NetP */}
              <div
                onClick={() => setSelectedModel('u2netp')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                  selectedModel === 'u2netp'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-1 ring-emerald-600/30'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">U2NetP (Lightweight)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-100 text-blue-800 border border-blue-200 font-semibold">
                        CPU Recommended
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedModel === 'u2netp'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedModel === 'u2netp' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                    Ultra-compact neural architecture running in milliseconds on CPU with zero fan noise (~4.5 MB).
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-gray-500">Size: 4.5 MB</span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Cached / Ready</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Workstation Specs Summary Bar */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-gray-500 tracking-wider">
              Workstation Hardware Diagnostics
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-500 block font-sans">Graphics Processor</span>
                <span className="font-semibold text-gray-900 truncate block mt-0.5 text-[11px]" title={detectedGpu}>
                  {detectedGpu}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-500 block font-sans">Processor Cores</span>
                <span className="font-semibold text-gray-900 block mt-0.5 text-[11px]">
                  {currentHardware?.cpu_cores || 8} Threads • {currentHardware?.os || 'Win64'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-500 block font-sans">Physical Memory</span>
                <span className="font-semibold text-gray-900 block mt-0.5 text-[11px]">
                  {currentHardware?.ram_available_gb || 8} GB Free / {currentHardware?.ram_total_gb || 16} GB
                </span>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Hardware preference applied successfully! Neural session is active on <strong>{settings?.active_provider}</strong>.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 font-mono hidden sm:flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span>Hardware configuration persists automatically across launches</span>
          </div>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors duration-150 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyChanges}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl flex items-center gap-1.5 transition-colors duration-150 shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying & Pre-warming...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Apply Hardware Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
