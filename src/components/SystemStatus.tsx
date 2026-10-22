import React from 'react';
import { Cpu, Zap, WifiOff, HardDrive, CheckCircle2 } from 'lucide-react';
import { HardwareInfo } from '../types';

interface SystemStatusProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
  isProcessing: boolean;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  hardwareInfo,
  daemonHealthy,
  isProcessing,
}) => {
  const isCuda = hardwareInfo?.accelerator?.toLowerCase().includes('cuda');

  return (
    <footer className="h-7 w-full bg-[#0d0f17] border-t border-[#262a36] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 select-none z-30">
      {/* Left: Device & Daemon state */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              daemonHealthy ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span className="text-zinc-300">
            {daemonHealthy ? 'Daemon Active' : 'Daemon Connecting'}
          </span>
        </div>

        {hardwareInfo && (
          <div className="hidden sm:flex items-center gap-1 text-zinc-400">
            {isCuda ? <Zap className="w-3 h-3 text-emerald-400" /> : <Cpu className="w-3 h-3 text-zinc-400" />}
            <span className={isCuda ? 'text-emerald-400 font-semibold' : ''}>
              {hardwareInfo.accelerator}
            </span>
            <span className="text-zinc-600">|</span>
            <span>{hardwareInfo.cpu_cores} Cores</span>
            <span className="text-zinc-600">|</span>
            <span>{hardwareInfo.ram_available_gb}GB Free</span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-1.5 text-blue-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            <span>AI Inference executing...</span>
          </div>
        )}
      </div>

      {/* Right: Offline badge & Shortcuts */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 text-zinc-500">
          <span>Ctrl+Z: Undo</span>
          <span>•</span>
          <span>Space+Drag: Pan</span>
          <span>•</span>
          <span>Scroll: Zoom</span>
        </div>

        <div className="flex items-center gap-1 text-zinc-400">
          <WifiOff className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px]">100% Offline</span>
        </div>
      </div>
    </footer>
  );
};
