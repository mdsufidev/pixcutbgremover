import React from 'react';
import {
  Hand,
  Wand2,
  Eraser,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Layers,
  Split,
} from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  tolerance: number;
  onToleranceChange: (val: number) => void;
  contiguous: boolean;
  onContiguousChange: (val: boolean) => void;
  brushSize: number;
  onBrushSizeChange: (val: number) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoom100: () => void;
  previewBackground: 'checkerboard' | 'white' | 'dark' | 'custom';
  onPreviewBackgroundChange: (bg: 'checkerboard' | 'white' | 'dark' | 'custom') => void;
  customBgColor: string;
  onCustomBgColorChange: (color: string) => void;
  showOriginal: boolean;
  onToggleShowOriginal: () => void;
  isSplitView: boolean;
  onToggleSplitView: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  tolerance,
  onToleranceChange,
  contiguous,
  onContiguousChange,
  brushSize,
  onBrushSizeChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoom100,
  previewBackground,
  onPreviewBackgroundChange,
  customBgColor,
  onCustomBgColorChange,
  showOriginal,
  onToggleShowOriginal,
  isSplitView,
  onToggleSplitView,
}) => {
  return (
    <aside className="w-64 bg-[#12141c] border-r border-[#262a36] flex flex-col justify-between p-3 select-none z-20">
      <div className="space-y-4">
        {/* Tool Selector Section */}
        <div>
          <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2 block">
            Tools
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onSelectTool('magic-erase')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-150 ${
                currentTool === 'magic-erase'
                  ? 'bg-blue-600/20 border border-blue-500 text-blue-300 font-medium'
                  : 'bg-[#181b24] border border-[#262a36] text-zinc-300 hover:bg-[#222634] hover:text-white'
              }`}
              title="Click any color area to instantly erase matching pixels"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Magic Erase</span>
            </button>

            <button
              onClick={() => onSelectTool('brush-erase')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-150 ${
                currentTool === 'brush-erase'
                  ? 'bg-blue-600/20 border border-blue-500 text-blue-300 font-medium'
                  : 'bg-[#181b24] border border-[#262a36] text-zinc-300 hover:bg-[#222634] hover:text-white'
              }`}
              title="Manual precision eraser brush"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Brush Erase</span>
            </button>

            <button
              onClick={() => onSelectTool('restore-brush')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-150 ${
                currentTool === 'restore-brush'
                  ? 'bg-blue-600/20 border border-blue-500 text-blue-300 font-medium'
                  : 'bg-[#181b24] border border-[#262a36] text-zinc-300 hover:bg-[#222634] hover:text-white'
              }`}
              title="Paint back original pixels from the source photo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Brush</span>
            </button>

            <button
              onClick={() => onSelectTool('pan')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded text-xs transition-colors duration-150 ${
                currentTool === 'pan'
                  ? 'bg-blue-600/20 border border-blue-500 text-blue-300 font-medium'
                  : 'bg-[#181b24] border border-[#262a36] text-zinc-300 hover:bg-[#222634] hover:text-white'
              }`}
              title="Pan workspace (or hold Spacebar)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan View</span>
            </button>
          </div>
        </div>

        {/* Dynamic Context Tool Settings */}
        {currentTool === 'magic-erase' && (
          <div className="p-2.5 rounded bg-[#181b24] border border-[#262a36] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-medium">Color Tolerance</span>
              <span className="text-[11px] font-mono text-blue-400">{tolerance}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={tolerance}
              onChange={(e) => onToleranceChange(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#262a36] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contiguous}
                  onChange={(e) => onContiguousChange(e.target.checked)}
                  className="rounded border-[#262a36] bg-[#090a0f] text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>Contiguous Only</span>
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {contiguous ? 'Connected' : 'All Colors'}
              </span>
            </div>
          </div>
        )}

        {(currentTool === 'brush-erase' || currentTool === 'restore-brush') && (
          <div className="p-2.5 rounded bg-[#181b24] border border-[#262a36] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-medium">Brush Diameter</span>
              <span className="text-[11px] font-mono text-blue-400">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="4"
              max="200"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#262a36] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex items-center justify-center pt-1">
              <div
                className="rounded-full border border-blue-400/60 bg-blue-500/10 transition-all duration-150"
                style={{ width: `${Math.min(brushSize, 50)}px`, height: `${Math.min(brushSize, 50)}px` }}
              />
            </div>
          </div>
        )}

        {/* Workspace Preview Background */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
            Preview Background
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => onPreviewBackgroundChange('checkerboard')}
              className={`h-7 rounded border flex items-center justify-center transition-colors duration-150 ${
                previewBackground === 'checkerboard'
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-[#262a36] hover:border-zinc-500'
              } bg-checkerboard`}
              title="Checkerboard Transparent"
            />
            <button
              onClick={() => onPreviewBackgroundChange('white')}
              className={`h-7 rounded border flex items-center justify-center transition-colors duration-150 bg-white ${
                previewBackground === 'white'
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-[#262a36] hover:border-zinc-500'
              }`}
              title="Solid White"
            />
            <button
              onClick={() => onPreviewBackgroundChange('dark')}
              className={`h-7 rounded border flex items-center justify-center transition-colors duration-150 bg-[#12141c] ${
                previewBackground === 'dark'
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-[#262a36] hover:border-zinc-500'
              }`}
              title="Deep Neutral Dark"
            />
            <div
              className={`h-7 rounded border flex items-center justify-center relative overflow-hidden transition-colors duration-150 ${
                previewBackground === 'custom'
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-[#262a36] hover:border-zinc-500'
              }`}
              style={{ backgroundColor: customBgColor }}
              title="Custom Hex Color"
            >
              <input
                type="color"
                value={customBgColor}
                onChange={(e) => {
                  onCustomBgColorChange(e.target.value);
                  onPreviewBackgroundChange('custom');
                }}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <Palette className="w-3 h-3 text-zinc-400 pointer-events-none drop-shadow" />
            </div>
          </div>
        </div>

        {/* Comparison Views */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
            Comparison
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onToggleSplitView}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs border transition-colors duration-150 ${
                isSplitView
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-medium'
                  : 'bg-[#181b24] border-[#262a36] text-zinc-300 hover:bg-[#222634]'
              }`}
              title="Interactive Before/After slider curtain"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>

            <button
              onClick={onToggleShowOriginal}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs border transition-colors duration-150 ${
                showOriginal && !isSplitView
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium'
                  : 'bg-[#181b24] border-[#262a36] text-zinc-300 hover:bg-[#222634]'
              }`}
              title="Full original toggle"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Original</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Zoom & Viewport Navigation */}
      <div className="pt-3 border-t border-[#262a36] space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onZoomOut}
              className="p-1 rounded bg-[#181b24] border border-[#262a36] hover:bg-[#222634] text-zinc-300 transition-colors duration-150"
              title="Zoom Out (Ctrl -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 rounded bg-[#181b24] border border-[#262a36] hover:bg-[#222634] text-zinc-300 transition-colors duration-150"
              title="Zoom In (Ctrl +)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoom100}
              className="px-1.5 py-1 rounded bg-[#181b24] border border-[#262a36] hover:bg-[#222634] text-[10px] font-mono text-zinc-300 transition-colors duration-150"
              title="100% Native Pixels"
            >
              1:1
            </button>
            <button
              onClick={onZoomFit}
              className="p-1 rounded bg-[#181b24] border border-[#262a36] hover:bg-[#222634] text-zinc-300 transition-colors duration-150"
              title="Fit to Window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
