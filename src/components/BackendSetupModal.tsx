import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface BackendSetupModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const BackendSetupModal: React.FC<BackendSetupModalProps> = ({
  isOpen,
  onSuccess,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    downloadedMB: number;
    totalMB: number;
    speedMBs: number;
  }>({
    percent: 0,
    downloadedMB: 0,
    totalMB: 308,
    speedMBs: 0,
  });
  const [isStartingEngine, setIsStartingEngine] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoStartCount, setAutoStartCount] = useState<number>(3);

  // Auto-start download countdown on open
  useEffect(() => {
    if (!isOpen || isDownloading || isStartingEngine) return;

    if (autoStartCount > 0) {
      const timer = setTimeout(() => {
        setAutoStartCount((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoStartCount === 0) {
      handleStartDownload();
    }
  }, [isOpen, autoStartCount, isDownloading, isStartingEngine]);

  // Subscribe to progress events from Electron
  useEffect(() => {
    if (!window.electronAPI?.onBackendDownloadProgress) return;

    const unsubscribe = window.electronAPI.onBackendDownloadProgress((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (!window.electronAPI?.downloadBackend) {
      setErrorMessage('Electron API not found. Please run within desktop application.');
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);

    try {
      const res = await window.electronAPI.downloadBackend();
      if (res.success) {
        setIsDownloading(false);
        setIsStartingEngine(true);

        // Wait a brief moment for local daemon health check to register
        setTimeout(() => {
          setIsStartingEngine(false);
          onSuccess();
        }, 1500);
      } else {
        setIsDownloading(false);
        setErrorMessage(res.error || 'Failed to download AI backend from GitHub.');
      }
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMessage(err.message || 'Network error while downloading backend.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        className="w-full max-w-lg bg-[#141517] border border-[#27272a] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 px-5 border-b border-[#27272a] flex items-center justify-between bg-[#0f1012]">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Setup AI Background Engine</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            One-Time Setup
          </span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Explanation */}
          <div className="space-y-2">
            <h3 className="text-base font-medium text-zinc-100 tracking-tight">
              Download Local AI Daemon
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              To keep your desktop app installer ultra-compact (~60 MB), the AI background remover engine (FastAPI + ONNX Runtime) is downloaded directly from GitHub on first launch.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-[#18191c] border border-[#27272a] rounded flex items-center gap-2 text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Private & Local</span>
            </div>
            <div className="p-2.5 bg-[#18191c] border border-[#27272a] rounded flex items-center gap-2 text-zinc-300">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>DirectML GPU Acceleration</span>
            </div>
          </div>

          {/* Progress / Status Display */}
          {isDownloading ? (
            <div className="space-y-3 p-4 bg-[#0f1012] border border-[#27272a] rounded-md">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <DownloadCloud className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
                  <span>Downloading pixcut-ai-daemon.exe...</span>
                </span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {downloadProgress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-[#27272a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(1, downloadProgress.percent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>
                  {downloadProgress.downloadedMB} MB / {downloadProgress.totalMB || 308} MB
                </span>
                {downloadProgress.speedMBs > 0 && (
                  <span className="text-zinc-400">{downloadProgress.speedMBs} MB/s</span>
                )}
              </div>
            </div>
          ) : isStartingEngine ? (
            <div className="p-4 bg-[#0f1012] border border-[#27272a] rounded-md flex items-center justify-center gap-3 text-xs text-zinc-300">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Starting background AI engine & verifying health...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleStartDownload}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {autoStartCount > 0
                    ? `Download AI Backend (Auto-starting in ${autoStartCount}s)...`
                    : 'Download & Setup AI Backend (~308 MB)'}
                </span>
              </button>
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-md text-xs text-red-300 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-semibold">Setup Encountered an Issue:</span>
              </div>
              <p className="text-[11px] font-mono pl-6 text-red-200">{errorMessage}</p>
              <div className="pt-1 pl-6">
                <button
                  onClick={handleStartDownload}
                  className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-100 rounded text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Download</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-[#27272a] bg-[#0f1012] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Source: GitHub Releases v1.0.0</span>
          <span>Saved to %APPDATA%\PixCutBg</span>
        </div>
      </div>
    </div>
  );
};
