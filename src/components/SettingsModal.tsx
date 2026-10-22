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
  AlertTriangle
} from 'lucide-react';
import { DevicePreference, EngineSettings, HardwareInfo } from '../types';
import { getEngineSettings, saveDevicePreference } from '../services/api';

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
  const [selectedPref, setSelectedPref] = useState<DevicePreference>('auto');
  const [settings, setSettings] = useState<EngineSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch settings when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    // Initial preference from localStorage or currentHardware
    const cachedPref = (localStorage.getItem('pixcut_device_pref') as DevicePreference) || 
      currentHardware?.device_preference || 'auto';
    setSelectedPref(cachedPref);

    getEngineSettings()
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setSettings(data);
          setSelectedPref(data.device_preference);
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

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const updated = await saveDevicePreference(selectedPref);
      setSettings(updated);
      if (updated.hardware) {
        onHardwareUpdated(updated.hardware);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply device preference');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-[#141517] border border-[#27272a] rounded-lg shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#27272a] flex items-center justify-between bg-[#0f1012] select-none">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Settings & AI Hardware</h2>
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
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Currently Active:</span>
              <div className="flex items-center gap-1.5 font-medium">
                {isCurrentGpu ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">
                      {settings?.active_provider || currentHardware?.accelerator || 'GPU Accelerated'}
                    </span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-zinc-200">
                      {settings?.active_provider || currentHardware?.accelerator || 'CPU (Multi-Threaded)'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] bg-[#27272a] text-zinc-300">
              {isLoading ? 'Checking...' : 'Ready'}
            </span>
          </div>

          {/* Device Preference Selector */}
          <div>
            <div className="mb-2">
              <label className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Execution Device Preference
              </label>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Saved permanently to your system. PixCutBg will remember and use this every time it starts.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 mt-3">
              {/* Option 1: GPU */}
              <button
                type="button"
                onClick={() => setSelectedPref('gpu')}
                className={`p-3.5 rounded-md border text-left flex items-start justify-between transition-all duration-150 ${
                  selectedPref === 'gpu'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded ${
                      selectedPref === 'gpu' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-zinc-400'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100">GPU Acceleration</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Fastest
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      DirectML / CUDA hardware acceleration ({detectedGpu}).
                      Blazing fast background cuts (100–300ms).
                    </p>
                  </div>
                </div>
                <div className="ml-2 mt-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedPref === 'gpu'
                        ? 'border-emerald-500 bg-emerald-500 text-black'
                        : 'border-zinc-600 bg-transparent'
                    }`}
                  >
                    {selectedPref === 'gpu' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </button>

              {/* Option 2: CPU */}
              <button
                type="button"
                onClick={() => setSelectedPref('cpu')}
                className={`p-3.5 rounded-md border text-left flex items-start justify-between transition-all duration-150 ${
                  selectedPref === 'cpu'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded ${
                      selectedPref === 'cpu' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-zinc-400'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100">CPU Multi-Threaded</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Compatible
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Pure multi-core CPU processing. Saves GPU memory and power; ideal for battery saver.
                    </p>
                  </div>
                </div>
                <div className="ml-2 mt-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedPref === 'cpu'
                        ? 'border-emerald-500 bg-emerald-500 text-black'
                        : 'border-zinc-600 bg-transparent'
                    }`}
                  >
                    {selectedPref === 'cpu' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </button>

              {/* Option 3: Auto */}
              <button
                type="button"
                onClick={() => setSelectedPref('auto')}
                className={`p-3.5 rounded-md border text-left flex items-start justify-between transition-all duration-150 ${
                  selectedPref === 'auto'
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-zinc-100'
                    : 'border-[#27272a] bg-[#18191c] hover:border-zinc-600 text-zinc-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded ${
                      selectedPref === 'auto' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-zinc-400'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-100">Auto-Detect</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Default
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Automatically queries available hardware. Prioritizes GPU if compatible, else uses CPU.
                    </p>
                  </div>
                </div>
                <div className="ml-2 mt-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedPref === 'auto'
                        ? 'border-emerald-500 bg-emerald-500 text-black'
                        : 'border-zinc-600 bg-transparent'
                    }`}
                  >
                    {selectedPref === 'auto' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* System Hardware Diagnostics Info */}
          <div className="p-3.5 bg-[#0f1012] border border-[#27272a] rounded-md space-y-2 text-[11px] font-mono">
            <div className="text-zinc-400 font-sans font-semibold text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              <span>Detected Hardware Specifications</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-zinc-400 pt-1">
              <div>
                <span className="text-zinc-500">GPU: </span>
                <span className="text-zinc-200">{detectedGpu}</span>
              </div>
              <div>
                <span className="text-zinc-500">CPU Cores: </span>
                <span className="text-zinc-200">{currentHardware?.cpu_cores || 'N/A'} Cores</span>
              </div>
              <div>
                <span className="text-zinc-500">Memory: </span>
                <span className="text-zinc-200">
                  {currentHardware?.ram_available_gb || 'N/A'} GB Free / {currentHardware?.ram_total_gb || 'N/A'} GB Total
                </span>
              </div>
              <div>
                <span className="text-zinc-500">OS: </span>
                <span className="text-zinc-200">{currentHardware?.os || 'Windows'}</span>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {saveSuccess && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-md flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Permanent setting saved! PixCutBg has bound to <strong>{settings?.active_provider}</strong>.
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
          <span className="text-[11px] text-zinc-500 font-mono hidden sm:block">
            Auto-saved to AppData config
          </span>
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
                  <span>Applying & Pre-warming...</span>
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
