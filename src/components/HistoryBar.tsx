import React from 'react';
import { Undo2, Redo2, Download, RefreshCw, Zap, Home, Wand2, Sparkles } from 'lucide-react';
import { ImageMetadata, ToolMode } from '../types';

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
  activeToolMode?: ToolMode;
  onSwitchMode?: (mode: ToolMode) => void;
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
  activeToolMode = 'bg-remover',
}) => {
  return (
    <div className="h-11 bg-white border-b border-gray-200 px-3.5 flex items-center justify-between select-none z-10 text-gray-800">
      {/* Left: Home Button + Active Tool Badge + Undo/Redo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onResetImage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-150 shadow-2xs"
          title="Return to Home screen"
        >
          <Home className="w-3.5 h-3.5 text-gray-500" />
          <span>Home</span>
        </button>

        {/* Active Tool Indicator Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-50 border-gray-200">
          {activeToolMode === 'bg-remover' ? (
            <>
              <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-gray-700 font-medium">Background Remover</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-gray-700 font-medium">AI Picture Enhancer</span>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border transition-colors duration-150 ${
            canUndo
              ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
              : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
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
              ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-2xs'
              : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>Redo</span>
        </button>

        {totalSteps > 1 && (
          <span className="text-[11px] font-mono text-gray-500 pl-1">
            Step {currentStep} / {totalSteps}
          </span>
        )}
      </div>

      {/* Middle: Active Image Stats */}
      {metadata && (
        <div className="hidden md:flex items-center gap-2.5 text-xs text-gray-500 font-mono">
          <span className="truncate max-w-[220px] text-gray-800 font-sans font-medium">{metadata.name}</span>
          <span className="text-gray-300">•</span>
          <span>{metadata.originalWidth} × {metadata.originalHeight} px</span>
          {metadata.inferenceTimeMs !== undefined && (
            <>
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <Zap className="w-3 h-3 text-emerald-600" />
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors duration-150 shadow-2xs"
          title="Open new image"
        >
          <RefreshCw className="w-3 h-3 text-gray-500" />
          <span>Change Image</span>
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors duration-150 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
