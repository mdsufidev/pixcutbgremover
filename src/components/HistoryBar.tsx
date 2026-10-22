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
    <div className="h-12 bg-[#0d0f17] border-b border-[#262a36] px-4 flex items-center justify-between select-none z-10">
      {/* Left: History & Undo/Redo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors duration-150 ${
            canUndo
              ? 'bg-[#181b24] border-[#262a36] text-zinc-200 hover:bg-[#222634] hover:text-white'
              : 'bg-[#12141c] border-transparent text-zinc-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors duration-150 ${
            canRedo
              ? 'bg-[#181b24] border-[#262a36] text-zinc-200 hover:bg-[#222634] hover:text-white'
              : 'bg-[#12141c] border-transparent text-zinc-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        {totalSteps > 1 && (
          <span className="text-[11px] font-mono text-zinc-500 pl-2">
            History: {currentStep} / {totalSteps}
          </span>
        )}
      </div>

      {/* Middle: Active Image Stats */}
      {metadata && (
        <div className="hidden md:flex items-center gap-3 text-xs text-zinc-400 font-mono">
          <span className="truncate max-w-[200px] text-zinc-300 font-sans">{metadata.name}</span>
          <span className="text-zinc-600">•</span>
          <span>{metadata.originalWidth} × {metadata.originalHeight} px</span>
          {metadata.inferenceTimeMs !== undefined && (
            <>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <Zap className="w-3 h-3" />
                {metadata.inferenceTimeMs}ms
              </span>
            </>
          )}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetImage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 bg-[#181b24] border border-[#262a36] hover:bg-[#222634] transition-colors duration-150"
          title="Open another image"
        >
          <RefreshCw className="w-3 h-3" />
          <span>New</span>
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium border border-blue-500 shadow-sm transition-colors duration-150"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Output</span>
        </button>
      </div>
    </div>
  );
};
