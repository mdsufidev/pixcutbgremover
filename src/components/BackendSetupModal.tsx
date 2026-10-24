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

        const checkInterval = setInterval(async () => {
          if (!window.electronAPI?.checkBackendInstalled) return;
          const status = await window.electronAPI.checkBackendInstalled();
          if (status.installed) {
            clearInterval(checkInterval);
            setIsStartingEngine(false);
            onSuccess();
          }
        }, 1500);

        setTimeout(() => {
          clearInterval(checkInterval);
          setIsStartingEngine(false);
          onSuccess();
        }, 10000);
      } else {
        setIsDownloading(false);
        setErrorMessage(res.error || 'Failed to download backend daemon');
      }
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMessage(err.message || 'Network download error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-md w-full p-6 text-gray-900 space-y-5">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
            <Server className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Download Local AI Daemon
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              To keep your desktop app installer ultra-compact (~60 MB), the AI background remover engine (FastAPI + ONNX Runtime) is downloaded directly from GitHub on first launch.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs w-full pt-1">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-gray-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Private & Local</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-2 text-gray-700">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>DirectML GPU Speed</span>
            </div>
          </div>

          {/* Progress / Status Display */}
          {isDownloading ? (
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-xl w-full text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium flex items-center gap-2">
                  <DownloadCloud className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                  <span>Downloading pixcut-ai-daemon.exe...</span>
                </span>
                <span className="font-mono text-emerald-700 font-semibold">
                  {downloadProgress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(1, downloadProgress.percent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
                <span>
                  {downloadProgress.downloadedMB} MB / {downloadProgress.totalMB || 308} MB
                </span>
                {downloadProgress.speedMBs > 0 && (
                  <span className="text-gray-600">{downloadProgress.speedMBs} MB/s</span>
                )}
              </div>
            </div>
          ) : isStartingEngine ? (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center gap-3 text-xs text-gray-700 w-full">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Starting local AI engine & verifying health...</span>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              <button
                type="button"
                onClick={handleStartDownload}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 text-left w-full">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Setup Failed</p>
                <p className="text-[11px] mt-0.5">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleStartDownload}
                  className="mt-2 text-[11px] font-medium text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Download</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
