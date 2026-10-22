import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Cpu, Zap, Scissors } from 'lucide-react';
import { HardwareInfo } from '../types';

interface TitleBarProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
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
    <header className="h-9 w-full bg-[#0f1012] border-b border-[#27272a] flex items-center justify-between px-3 select-none app-drag-region z-50">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#27272a] flex items-center justify-center text-zinc-200">
            <Scissors className="w-2.5 h-2.5" />
          </div>
          <span className="text-xs font-medium text-zinc-200 tracking-tight">
            PixCut Desktop
          </span>
          <span className="text-[10px] px-1 py-0.2 rounded border border-[#27272a] text-zinc-500 font-mono">
            v1.0.0
          </span>
        </div>

        {/* Engine status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[11px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              daemonHealthy ? (isCuda ? 'bg-emerald-500' : 'bg-zinc-300') : 'bg-amber-500'
            }`}
          />
          <div className="flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
            {isCuda ? <Zap className="w-2.5 h-2.5 text-emerald-400" /> : <Cpu className="w-2.5 h-2.5 text-zinc-400" />}
            <span>
              {hardwareInfo ? hardwareInfo.accelerator : daemonHealthy ? 'Ready' : 'Connecting daemon...'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Subtle subtitle */}
      <div className="text-[11px] text-zinc-500 font-mono hidden md:block">
        Local Neural Background Remover
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center app-no-drag">
        {window.electronAPI ? (
          <div className="flex items-center">
            <button
              onClick={handleMinimize}
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#27272a] transition-colors duration-150"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#27272a] transition-colors duration-150"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={handleClose}
              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-red-600 transition-colors duration-150"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-400 px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a]">
            Preview
          </div>
        )}
      </div>
    </header>
  );
};
