import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Cpu, Zap, Sparkles } from 'lucide-react';
import { HardwareInfo } from '../types';

interface TitleBarProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
  onOpenSettings?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ hardwareInfo, daemonHealthy }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized);
      const check = setInterval(() => {
        window.electronAPI?.isMaximized().then(setIsMaximized);
      }, 500);
      return () => clearInterval(check);
    }
  }, []);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => {
    window.electronAPI?.maximize();
    setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.electronAPI?.close();

  const isCuda = hardwareInfo?.accelerator?.toLowerCase().includes('cuda');

  return (
    <header className="h-10 w-full bg-[#090a0f] border-b border-[#262a36] flex items-center justify-between px-3 select-none app-drag-region z-50">
      {/* Left: App Branding & Status */}
      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-zinc-100 font-sans">
            PixCut Desktop
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#262a36] text-zinc-400 font-mono">
            v1.0.0
          </span>
        </div>

        {/* Local Engine Accelerator Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#12141c] border border-[#262a36] text-[11px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              daemonHealthy ? (isCuda ? 'bg-emerald-400' : 'bg-blue-400') : 'bg-amber-400'
            }`}
          />
          <div className="flex items-center gap-1 text-zinc-300 font-mono text-[10px]">
            {isCuda ? <Zap className="w-3 h-3 text-emerald-400" /> : <Cpu className="w-3 h-3 text-zinc-400" />}
            <span>{hardwareInfo ? hardwareInfo.accelerator : daemonHealthy ? 'Local AI Daemon' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {/* Middle: Subtle Status or Info */}
      <div className="text-[11px] text-zinc-500 font-mono hidden md:block">
        Local Zero-Latency Background Engine
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center app-no-drag">
        {window.electronAPI ? (
          <div className="flex items-center">
            <button
              onClick={handleMinimize}
              className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#181b24] transition-colors duration-150"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#181b24] transition-colors duration-150"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 transition-colors duration-150"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 px-2 py-0.5 rounded bg-[#12141c] border border-[#262a36]">
            Web Preview Mode
          </div>
        )}
      </div>
    </header>
  );
};
