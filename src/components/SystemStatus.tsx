import React from 'react';
import { Cpu, Zap, WifiOff, Settings, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { HardwareInfo, ImageMetadata } from '../types';

interface SystemStatusProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
  isProcessing: boolean;
  onOpenSettings?: () => void;
  metadata?: ImageMetadata | null;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onZoom100?: () => void;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  hardwareInfo,
  daemonHealthy,
  isProcessing,
  onOpenSettings,
  metadata = null,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoom100,
}) => {
  const isSwitching = hardwareInfo?.status === 'switching' || Boolean(hardwareInfo?.is_switching);
  const isGpu = Boolean(
    hardwareInfo?.accelerator?.toLowerCase().includes('cuda') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('gpu') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('directml') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('dml') ||
    hardwareInfo?.active_hardware_mode === 'gpu' ||
    (isSwitching && hardwareInfo?.device_preference === 'gpu')
  );

  return (
    <footer className="h-6 w-full bg-white border-t border-gray-200 px-3 flex items-center justify-between text-[11px] font-mono text-gray-500 select-none z-30">
      {/* Left: Device & Daemon state */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              daemonHealthy ? (isSwitching ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500') : 'bg-amber-500'
            }`}
          />
          <span className="text-gray-700 font-sans">
            {daemonHealthy ? (isSwitching ? 'Switching Hardware' : 'Daemon Active') : 'Connecting'}
          </span>
        </div>

        {hardwareInfo && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Click to configure hardware execution device (GPU/CPU)"
            className="hidden sm:flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            {isGpu ? <Zap className="w-2.5 h-2.5 text-emerald-600" /> : <Cpu className="w-2.5 h-2.5 text-gray-500" />}
            <span className={isGpu ? 'text-emerald-700 font-medium' : ''}>
              {isSwitching ? `Switching to ${hardwareInfo.device_preference?.toUpperCase()}...` : hardwareInfo.accelerator}
            </span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 font-sans">{hardwareInfo.model_loaded || 'u2net'}</span>
            <span className="text-gray-300">/</span>
            <span>{hardwareInfo.cpu_cores} Cores</span>
            <span className="text-gray-300">/</span>
            <span>{hardwareInfo.ram_available_gb} GB Free</span>
          </button>
        )}

        {isProcessing && (
          <div className="flex items-center gap-1.5 text-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Processing inference...</span>
          </div>
        )}
      </div>

      {/* Middle: Document Resolution Indicator (Photoshop Status Info) */}
      {metadata && (
        <div className="hidden lg:flex items-center gap-2 text-gray-600 text-[11px]">
          <span>Doc: {metadata.originalWidth} × {metadata.originalHeight} px</span>
          <span className="text-gray-300">•</span>
          <span>RGBA 8-bit</span>
        </div>
      )}

      {/* Right: Zoom controls, Shortcuts & Offline Indicator */}
      <div className="flex items-center gap-3">
        {/* Quick Zoom Bar (when in editor) */}
        {zoom !== undefined && onZoomIn && onZoomOut && onZoomFit && onZoom100 && (
          <div className="hidden sm:flex items-center gap-0.5 border-r border-gray-200 pr-2.5 mr-0.5">
            <button
              onClick={onZoomOut}
              className="w-5 h-5 rounded hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={onZoom100}
              className="px-1.5 h-5 rounded hover:bg-gray-100 font-semibold text-gray-700 hover:text-gray-900 transition-colors text-[10px]"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="w-5 h-5 rounded hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={onZoomFit}
              className="px-1.5 h-5 rounded hover:bg-gray-100 flex items-center gap-0.5 text-gray-600 hover:text-gray-900 transition-colors text-[10px]"
              title="Fit to Canvas"
            >
              <Maximize2 className="w-2.5 h-2.5" />
              <span>Fit</span>
            </button>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 text-gray-400 text-[10px]">
          <span>Ctrl+Z Undo</span>
          <span>•</span>
          <span>Space Pan</span>
        </div>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-1 text-gray-500 hover:text-gray-900 text-[10px] cursor-pointer"
            title="Open Hardware Settings"
          >
            <Settings className="w-2.5 h-2.5" />
            <span>Settings</span>
          </button>
        )}

        <div className="flex items-center gap-1 text-gray-400">
          <WifiOff className="w-2.5 h-2.5 text-gray-400" />
          <span className="text-[10px]">Offline</span>
        </div>
      </div>
    </footer>
  );
};
