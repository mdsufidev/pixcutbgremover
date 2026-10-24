import React, { useEffect, useState } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Cpu,
  Zap,
  Settings,
  Home,
  Wand2,
  Sparkles,
  Undo2,
  Redo2,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { HardwareInfo, ToolMode, ImageMetadata } from '../types';
import logoImg from '../assets/logo.png';

interface TitleBarProps {
  hardwareInfo: HardwareInfo | null;
  daemonHealthy: boolean;
  onOpenSettings?: () => void;
  activeToolMode?: ToolMode | null;
  onSelectMode?: (mode: ToolMode | null) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  metadata?: ImageMetadata | null;
  onExport?: () => void;
  onResetImage?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  hardwareInfo,
  daemonHealthy,
  onOpenSettings,
  activeToolMode = null,
  onSelectMode,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  metadata = null,
  onExport,
  onResetImage,
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
    <header className="h-10 w-full bg-white border-b border-gray-200 flex items-center justify-between px-3 select-none app-drag-region z-50 text-gray-800">
      {/* Left: Branding & Navigation / Active Tool Badge */}
      <div className="flex items-center gap-2.5 app-no-drag">
        {/* App Logo & Title */}
        <div className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="FileWala TOOL"
            className="h-5 w-5 rounded object-contain select-none pointer-events-none"
          />
          <span className="text-xs font-semibold text-gray-900 tracking-tight">FileWala TOOL</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 font-mono bg-gray-50">
            v1.0.0
          </span>
        </div>

        {/* When in Active Workspace: Show Home and Current Mode */}
        {metadata && onResetImage && (
          <>
            <div className="h-4 w-px bg-gray-200 mx-0.5" />
            <button
              type="button"
              onClick={onResetImage}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs"
              title="Return to Home Dashboard"
            >
              <Home className="w-3.5 h-3.5 text-gray-500" />
              <span>Home</span>
            </button>

            {/* Active Workspace Tool Title */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border bg-gray-50 border-gray-200">
              {activeToolMode === 'bg-remover' ? (
                <>
                  <Wand2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-gray-800 font-medium">Background Remover</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span className="text-gray-800 font-medium">AI Picture Enhancer</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Middle: Contextual Actions or Mode Switcher */}
      <div className="flex items-center gap-2 app-no-drag">
        {metadata ? (
          /* Editor Mode: Undo/Redo + Document Info + Change Image */
          <div className="flex items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                  canUndo
                    ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
              </button>

              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
                  canRedo
                    ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 shadow-2xs'
                    : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3 h-3" />
                <span>Redo</span>
              </button>
            </div>

            {/* Document Info Badge */}
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-mono px-2 py-0.5 rounded bg-gray-50 border border-gray-200">
              <span className="truncate max-w-[150px] text-gray-800 font-sans font-medium">{metadata.name}</span>
              <span className="text-gray-300">•</span>
              <span>{metadata.originalWidth} × {metadata.originalHeight} px</span>
              {metadata.inferenceTimeMs !== undefined && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <Zap className="w-2.5 h-2.5 text-emerald-600" />
                    <span>{metadata.inferenceTimeMs}ms</span>
                  </span>
                </>
              )}
            </div>

            {/* Change Image Button */}
            {onResetImage && (
              <button
                type="button"
                onClick={onResetImage}
                className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-2xs"
                title="Open new image"
              >
                <RefreshCw className="w-3 h-3 text-gray-500" />
                <span>Change Image</span>
              </button>
            )}
          </div>
        ) : (
          /* Home Screen: Mode Segmented Switcher */
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 border border-gray-200/80">
            <button
              type="button"
              onClick={() => onSelectMode && onSelectMode(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 ${
                activeToolMode === null
                  ? 'bg-white text-gray-900 font-medium shadow-xs border border-gray-200/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/40'
              }`}
              title="Return to Home Dashboard"
            >
              <Home className="w-3 h-3 text-gray-500" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode && onSelectMode('bg-remover')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 ${
                activeToolMode === 'bg-remover'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-gray-200/50'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-white/40'
              }`}
              title="AI Background Remover"
            >
              <Wand2 className="w-3 h-3 text-emerald-600" />
              <span>BG Remover</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode && onSelectMode('enhancer')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 ${
                activeToolMode === 'enhancer'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs border border-gray-200/50'
                  : 'text-gray-600 hover:text-emerald-700 hover:bg-white/40'
              }`}
              title="AI Picture Enhancer"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>AI Enhancer</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Export Button + Hardware Status + Settings + Window Controls */}
      <div className="flex items-center gap-2 app-no-drag">
        {/* Prominent Green Export Button (When Image is Loaded) */}
        {metadata && onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold transition-all duration-150 shadow-xs cursor-pointer"
            title="Export processed cutout or enhanced image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        )}

        {/* Engine status indicator (clickable to open Settings) */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Click to configure GPU/CPU hardware acceleration"
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-[11px] transition-colors cursor-pointer"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              daemonHealthy ? (isSwitching ? 'bg-amber-500 animate-pulse' : (isGpu ? 'bg-emerald-500' : 'bg-gray-400')) : 'bg-amber-500'
            }`}
          />
          <div className="flex items-center gap-1 text-gray-600 font-mono text-[10px]">
            {isSwitching ? (
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-600" />
                <span>Switching to {hardwareInfo?.device_preference?.toUpperCase() || 'device'}...</span>
              </span>
            ) : (
              <>
                {isGpu ? <Zap className="w-2.5 h-2.5 text-emerald-600" /> : <Cpu className="w-2.5 h-2.5 text-gray-500" />}
                <span className={isGpu ? 'text-emerald-700 font-medium' : ''}>
                  {hardwareInfo
                    ? `${hardwareInfo.accelerator} • ${hardwareInfo.model_loaded || 'u2net'}`
                    : daemonHealthy
                    ? 'Ready'
                    : 'Connecting daemon...'}
                </span>
              </>
            )}
          </div>
        </button>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-150"
            title="Settings (Select GPU / CPU & System Specs)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Window Controls (Electron Window Chrome) */}
        {window.electronAPI ? (
          <div className="flex items-center ml-1">
            <button
              onClick={handleMinimize}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-150"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-150"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-red-500 transition-colors duration-150"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
            Preview
          </div>
        )}
      </div>
    </header>
  );
};
