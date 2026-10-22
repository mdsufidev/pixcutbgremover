import React from 'react';
import {
  Hand,
  Wand2,
  Eraser,
  RotateCcw,
  Crop,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Split,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { ToolType, AspectRatioPreset } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  tolerance: number;
  onToleranceChange: (val: number) => void;
  contiguous: boolean;
  onContiguousChange: (val: boolean) => void;
  brushSize: number;
  onBrushSizeChange: (val: number) => void;
  cropAspectRatio: AspectRatioPreset;
  onCropAspectRatioChange: (ratio: AspectRatioPreset) => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  onRotateClockwise: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
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
  cropAspectRatio,
  onCropAspectRatioChange,
  onApplyCrop,
  onCancelCrop,
  onRotateClockwise,
  onFlipHorizontal,
  onFlipVertical,
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
  const aspectRatios: { id: AspectRatioPreset; label: string }[] = [
    { id: 'free', label: 'Free' },
    { id: '1:1', label: '1:1 Square' },
    { id: '16:9', label: '16:9' },
    { id: '4:3', label: '4:3' },
    { id: '3:2', label: '3:2' },
    { id: '9:16', label: '9:16 Reel' },
  ];

  return (
    <aside className="w-64 bg-[#141518] border-r border-[#27272a] flex flex-col justify-between p-3 select-none z-20">
      <div className="space-y-5 overflow-y-auto pr-1">
        {/* Tools Section */}
        <div>
          <label className="text-[11px] font-medium text-zinc-400 mb-2 block tracking-tight">
            Editing Tools
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onSelectTool('magic-erase')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors duration-150 ${
                currentTool === 'magic-erase'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126] hover:text-white'
              }`}
              title="Click any color to erase connected pixels"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Magic Erase</span>
            </button>

            <button
              onClick={() => onSelectTool('brush-erase')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors duration-150 ${
                currentTool === 'brush-erase'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126] hover:text-white'
              }`}
              title="Manual eraser brush"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Brush Erase</span>
            </button>

            <button
              onClick={() => onSelectTool('restore-brush')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors duration-150 ${
                currentTool === 'restore-brush'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126] hover:text-white'
              }`}
              title="Restore erased pixels from original image"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>

            <button
              onClick={() => onSelectTool('crop')}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-colors duration-150 ${
                currentTool === 'crop'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126] hover:text-white'
              }`}
              title="Advanced crop & resize box"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>

            <button
              onClick={() => onSelectTool('pan')}
              className={`col-span-2 flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                currentTool === 'pan'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126] hover:text-white'
              }`}
              title="Pan canvas (or hold Spacebar anytime)"
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Pan Viewport (Space + Drag)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Context Tool Options */}
        {currentTool === 'crop' && (
          <div className="p-3 rounded-md bg-[#18181b] border border-[#27272a] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">Crop Options</span>
              <span className="text-[10px] font-mono text-zinc-400">Esc to cancel</span>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 mb-1.5 block">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-1.5">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => onCropAspectRatioChange(ratio.id)}
                    className={`px-2 py-1.5 rounded text-xs font-mono transition-colors duration-150 ${
                      cropAspectRatio === ratio.id
                        ? 'bg-zinc-200 text-zinc-900 font-medium'
                        : 'bg-[#202126] text-zinc-400 hover:text-zinc-200 border border-[#27272a]'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Rotate & Flip Actions */}
            <div>
              <label className="text-[11px] text-zinc-400 mb-1.5 block">Transform</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={onRotateClockwise}
                  className="px-2 py-1.5 rounded text-xs bg-[#202126] text-zinc-300 hover:text-white border border-[#27272a] flex items-center justify-center gap-1 transition-colors duration-150"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>90°</span>
                </button>
                <button
                  onClick={onFlipHorizontal}
                  className="px-2 py-1.5 rounded text-xs bg-[#202126] text-zinc-300 hover:text-white border border-[#27272a] flex items-center justify-center gap-1 transition-colors duration-150"
                  title="Flip horizontally"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>Flip H</span>
                </button>
                <button
                  onClick={onFlipVertical}
                  className="px-2 py-1.5 rounded text-xs bg-[#202126] text-zinc-300 hover:text-white border border-[#27272a] flex items-center justify-center gap-1 transition-colors duration-150"
                  title="Flip vertically"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>Flip V</span>
                </button>
              </div>
            </div>

            {/* Apply & Cancel Buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]">
              <button
                onClick={onApplyCrop}
                className="flex-1 py-1.5 px-3 rounded-md text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white flex items-center justify-center gap-1.5 transition-colors duration-150"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Crop</span>
              </button>
              <button
                onClick={onCancelCrop}
                className="py-1.5 px-3 rounded-md text-xs font-medium bg-[#202126] text-zinc-300 hover:text-white border border-[#27272a] flex items-center justify-center gap-1 transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {currentTool === 'magic-erase' && (
          <div className="p-3 rounded-md bg-[#18181b] border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">Color Tolerance</span>
              <span className="font-mono text-zinc-400">{tolerance}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={tolerance}
              onChange={(e) => onToleranceChange(Number(e.target.value))}
              className="w-full h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-zinc-200"
            />
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={contiguous}
                onChange={(e) => onContiguousChange(e.target.checked)}
                className="rounded border-[#27272a] bg-[#202126] text-zinc-200 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Contiguous pixels only</span>
            </label>
          </div>
        )}

        {(currentTool === 'brush-erase' || currentTool === 'restore-brush') && (
          <div className="p-3 rounded-md bg-[#18181b] border border-[#27272a] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200">Brush Diameter</span>
              <span className="font-mono text-zinc-400">{brushSize}px</span>
            </div>
            <input
              type="range"
              min={4}
              max={160}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full h-1 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-zinc-200"
            />
          </div>
        )}

        {/* View & Comparison Section */}
        <div>
          <label className="text-[11px] font-medium text-zinc-400 mb-2 block tracking-tight">
            Comparison & Preview
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onToggleSplitView}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                isSplitView
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126]'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>

            <button
              onClick={onToggleShowOriginal}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                showOriginal
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-[#18181b] border border-[#27272a] text-zinc-300 hover:bg-[#202126]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Hold Original</span>
            </button>
          </div>
        </div>

        {/* Canvas Background Preview Modes */}
        <div>
          <label className="text-[11px] font-medium text-zinc-400 mb-2 block tracking-tight">
            Background Tone
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => onPreviewBackgroundChange('checkerboard')}
              className={`h-7 rounded border text-[11px] flex items-center justify-center font-mono ${
                previewBackground === 'checkerboard'
                  ? 'border-zinc-300 bg-zinc-800 text-zinc-100 font-medium'
                  : 'border-[#27272a] bg-[#18181b] text-zinc-400 hover:text-zinc-200'
              }`}
              title="Transparent checkerboard"
            >
              Grid
            </button>
            <button
              onClick={() => onPreviewBackgroundChange('white')}
              className={`h-7 rounded border text-[11px] flex items-center justify-center font-mono ${
                previewBackground === 'white'
                  ? 'border-zinc-300 bg-white text-zinc-900 font-medium'
                  : 'border-[#27272a] bg-zinc-200 text-zinc-900'
              }`}
              title="Pure white"
            >
              White
            </button>
            <button
              onClick={() => onPreviewBackgroundChange('dark')}
              className={`h-7 rounded border text-[11px] flex items-center justify-center font-mono ${
                previewBackground === 'dark'
                  ? 'border-zinc-300 bg-black text-zinc-100 font-medium'
                  : 'border-[#27272a] bg-[#111215] text-zinc-400'
              }`}
              title="Dark studio"
            >
              Dark
            </button>
            <div className="relative">
              <input
                type="color"
                value={customBgColor}
                onChange={(e) => {
                  onCustomBgColorChange(e.target.value);
                  onPreviewBackgroundChange('custom');
                }}
                className="w-full h-7 rounded border border-[#27272a] bg-transparent cursor-pointer opacity-0 absolute inset-0 z-10"
              />
              <div
                className={`w-full h-7 rounded border flex items-center justify-center text-[11px] font-mono ${
                  previewBackground === 'custom' ? 'border-zinc-300' : 'border-[#27272a]'
                }`}
                style={{ backgroundColor: customBgColor }}
              >
                <Palette className="w-3.5 h-3.5 text-white invert mix-blend-difference" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Viewport Zoom Controls */}
      <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="w-7 h-7 rounded flex items-center justify-center bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-zinc-100 hover:bg-[#202126] transition-colors duration-150"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoom100}
            className="px-2 h-7 rounded bg-[#18181b] border border-[#27272a] text-zinc-300 font-mono text-[11px] hover:text-zinc-100 hover:bg-[#202126] transition-colors duration-150"
            title="Actual Size 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="w-7 h-7 rounded flex items-center justify-center bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-zinc-100 hover:bg-[#202126] transition-colors duration-150"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onZoomFit}
          className="h-7 px-2.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-400 text-xs hover:text-zinc-100 hover:bg-[#202126] flex items-center gap-1 transition-colors duration-150"
          title="Fit into viewport"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit</span>
        </button>
      </div>
    </aside>
  );
};
