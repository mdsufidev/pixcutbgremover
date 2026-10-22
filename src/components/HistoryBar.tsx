import React from 'react';
import { Undo2, Redo2, Download, RefreshCw, Zap } from 'lucide-react';
import { ImageMetadata } from '../types';

interface HistoryBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentStep: number;
  totalSteps: number;
  metadata: ImageMetadata | null;
  onExport: () => void;
  onResetImage: () => void;
}

export const HistoryBar: React.FC<HistoryBarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentStep,
  totalSteps,
  metadata,
  onExport,
  onResetImage,
}) => {
  return (
    <div className="h-11 bg-[#141518] border-b border-[#27272a] px-3.5 flex items-center justify-between select-none z-10">
      {/* Left: History & Undo/Redo */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors duration-150 ${
            canUndo
              ? 'bg-[#18181b] border-[#27272a] text-zinc-200 hover:bg-[#202126] hover:text-white'
              : 'bg-[#141518] border-transparent text-zinc-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors duration-150 ${
            canRedo
              ? 'bg-[#18181b] border-[#27272a] text-zinc-200 hover:bg-[#202126] hover:text-white'
              : 'bg-[#141518] border-transparent text-zinc-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        {totalSteps > 1 && (
          <span className="text-[11px] font-mono text-zinc-500 pl-2">
            Step {currentStep} / {totalSteps}
          </span>
        )}
      </div>

      {/* Middle: Active Image Stats */}
      {metadata && (
        <div className="hidden md:flex items-center gap-2.5 text-xs text-zinc-400 font-mono">
          <span className="truncate max-w-[220px] text-zinc-300 font-sans font-medium">{metadata.name}</span>
          <span className="text-zinc-600">•</span>
          <span>{metadata.originalWidth} × {metadata.originalHeight} px</span>
          {metadata.inferenceTimeMs !== undefined && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <Zap className="w-3 h-3 text-zinc-400" />
                <span>{metadata.inferenceTimeMs}ms</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetImage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 bg-[#18181b] border border-[#27272a] hover:bg-[#202126] transition-colors duration-150"
          title="Open new image"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Change Image</span>
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs bg-zinc-100 hover:bg-white text-zinc-900 font-medium transition-colors duration-150"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
