import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Cpu, Zap, Settings } from 'lucide-react';
import { HardwareInfo } from '../types';
import logoImg from '../assets/logo.png';

interface TitleBarProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
  onOpenSettings?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  hardwareInfo,
  daemonHealthy,
  onOpenSettings,
}) => {
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

  const isGpu = Boolean(
    hardwareInfo?.accelerator?.toLowerCase().includes('cuda') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('gpu') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('directml') ||
    hardwareInfo?.accelerator?.toLowerCase().includes('dml')
  );

  return (
    <header className="h-9 w-full bg-[#0f1012] border-b border-[#27272a] flex items-center justify-between px-3 select-none app-drag-region z-50">
      {/* Left: Branding & Status */}
      <div className="flex items-center gap-3 app-no-drag">
        <div className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="PixCutBg Desktop"
            className="h-5 w-auto object-contain select-none pointer-events-none"
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#27272a] text-zinc-500 font-mono">
            v1.0.0
          </span>
        </div>

        {/* Engine status indicator (clickable to open Settings) */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Click to configure GPU/CPU hardware acceleration"
          className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] hover:border-zinc-500 hover:bg-[#202124] text-[11px] transition-colors cursor-pointer"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              daemonHealthy ? (isGpu ? 'bg-emerald-500' : 'bg-zinc-300') : 'bg-amber-500'
            }`}
          />
          <div className="flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
            {isGpu ? <Zap className="w-2.5 h-2.5 text-emerald-400" /> : <Cpu className="w-2.5 h-2.5 text-zinc-400" />}
            <span className={isGpu ? 'text-emerald-400 font-medium' : ''}>
              {hardwareInfo
                ? `${hardwareInfo.accelerator} • ${hardwareInfo.model_loaded || 'u2net'}`
                : daemonHealthy
                ? 'Ready'
                : 'Connecting daemon...'}
            </span>
          </div>
        </button>
      </div>

      {/* Middle: Subtle subtitle */}
      <div className="text-[11px] text-zinc-500 font-mono hidden md:block">
        Local Neural Background Remover
      </div>

      {/* Right: Settings & Window Controls */}
      <div className="flex items-center gap-1 app-no-drag">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#27272a] rounded transition-colors duration-150 mr-1"
            title="Settings (Select GPU / CPU & System Specs)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

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
