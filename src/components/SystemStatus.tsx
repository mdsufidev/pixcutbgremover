import React from 'react';
import { Cpu, Zap, WifiOff, Settings } from 'lucide-react';
import { HardwareInfo } from '../types';

interface SystemStatusProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
  isProcessing: boolean;
  onOpenSettings?: () => void;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  hardwareInfo,
  daemonHealthy,
  isProcessing,
  onOpenSettings,
}) => {
  const isGpu = Boolean(
    hardwareInfo?.accelerator?.toLowerCase().includes('cuda') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('gpu') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('directml') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('dml')
  );

  return (
    <footer className="h-6 w-full bg-[#0f1012] border-t border-[#27272a] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 select-none z-30">
      {/* Left: Device & Daemon state */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              daemonHealthy ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <span className="text-zinc-300">
            {daemonHealthy ? 'Daemon Active' : 'Connecting'}
          </span>
        </div>

        {hardwareInfo && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Click to change hardware execution device (GPU/CPU)"
            className="hidden sm:flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            {isGpu ? <Zap className="w-2.5 h-2.5 text-emerald-400" /> : <Cpu className="w-2.5 h-2.5 text-zinc-400" />}
            <span className={isGpu ? 'text-emerald-400 font-medium' : ''}>
              {hardwareInfo.accelerator}
            </span>
            <span className="text-zinc-700">/</span>
            <span>{hardwareInfo.cpu_cores} Cores</span>
            <span className="text-zinc-700">/</span>
            <span>{hardwareInfo.ram_available_gb} GB Free</span>
          </button>
        )}

        {isProcessing && (
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
            <span>Processing inference...</span>
          </div>
        )}
      </div>

      {/* Right: Offline badge & Shortcuts & Settings */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-zinc-500 text-[10px]">
          <span>Ctrl+Z Undo</span>
          <span>•</span>
          <span>Space Pan</span>
          <span>•</span>
          <span>Enter Apply Crop</span>
        </div>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-1 text-zinc-400 hover:text-zinc-200 text-[10px] cursor-pointer"
            title="Open Settings"
          >
            <Settings className="w-2.5 h-2.5" />
            <span>Settings</span>
          </button>
        )}

        <div className="flex items-center gap-1 text-zinc-400">
          <WifiOff className="w-2.5 h-2.5 text-zinc-400" />
          <span className="text-[10px]">Offline</span>
        </div>
      </div>
    </footer>
  );
};
