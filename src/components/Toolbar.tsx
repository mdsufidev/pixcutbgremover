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
  Split,
  Eye,
  Check,
  X,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { ToolType, AspectRatioPreset, ToolMode } from '../types';

interface ToolbarProps {
  activeToolMode: ToolMode;
  onSwitchToolMode?: (mode: ToolMode) => void;
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
  enhancerScale?: number;
  onEnhancerScaleChange?: (scale: number) => void;
  enhancerModel?: string;
  onEnhancerModelChange?: (model: string) => void;
  onApplyEnhance?: () => void;
  isEnhancing?: boolean;
  enhancerAvailable?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeToolMode,
  onSwitchToolMode,
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
  enhancerScale = 1,
  onEnhancerScaleChange,
  enhancerModel = 'realesr-animevideov3',
  onEnhancerModelChange,
  onApplyEnhance,
  isEnhancing = false,
  enhancerAvailable = true,
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
    <aside className="w-72 bg-white border-r border-gray-300 flex flex-col justify-between p-3 select-none z-20 text-gray-900 shadow-xs">
      <div className="space-y-4 overflow-y-auto pr-1">
        {/* ========================================================= */}
        {/* MODE A: BACKGROUND REMOVER TOOLBAR */}
        {/* ========================================================= */}
        {activeToolMode === 'bg-remover' ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Cutout Tools
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-gray-100 text-gray-600 border border-gray-300">
                  AI Seg
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onSelectTool('magic-erase')}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                    currentTool === 'magic-erase'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                      : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
                  }`}
                  title="Click any color to erase connected pixels"
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Magic Wand</span>
                </button>

                <button
                  onClick={() => onSelectTool('brush-erase')}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                    currentTool === 'brush-erase'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                      : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
                  }`}
                  title="Manual eraser brush"
                >
                  <Eraser className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Brush</span>
                </button>

                <button
                  onClick={() => onSelectTool('restore-brush')}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                    currentTool === 'restore-brush'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                      : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
                  }`}
                  title="Restore erased pixels from original image"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => onSelectTool('crop')}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                    currentTool === 'crop'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                      : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
                  }`}
                  title="Crop & resize canvas"
                >
                  <Crop className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Crop</span>
                </button>

                <button
                  onClick={() => onSelectTool('pan')}
                  className={`col-span-2 flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                    currentTool === 'pan'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                      : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
                  }`}
                  title="Pan canvas (or hold Spacebar anytime)"
                >
                  <Hand className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pan Viewport (Space + Drag)</span>
                </button>
              </div>
            </div>

            {/* Context Tool Options: Crop */}
            {currentTool === 'crop' && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Crop Options</span>
                  <span className="text-[10px] font-mono text-gray-500">Esc to cancel</span>
                </div>

                <div>
                  <label className="text-[11px] text-gray-700 mb-1.5 block font-semibold">Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => onCropAspectRatioChange(ratio.id)}
                        className={`px-2 py-1.5 rounded text-xs font-mono transition-all duration-150 border ${
                          cropAspectRatio === ratio.id
                            ? 'bg-emerald-600 text-white font-semibold border-emerald-600 shadow-2xs'
                            : 'bg-white text-gray-700 hover:text-gray-900 border-gray-300 hover:border-gray-400 shadow-2xs'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Rotate & Flip Actions */}
                <div>
                  <label className="text-[11px] text-gray-700 mb-1.5 block font-semibold">Transform</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={onRotateClockwise}
                      className="px-2 py-1.5 rounded text-xs bg-white text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1 transition-all duration-150 shadow-2xs"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-gray-600" />
                      <span>90°</span>
                    </button>
                    <button
                      onClick={onFlipHorizontal}
                      className="px-2 py-1.5 rounded text-xs bg-white text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1 transition-all duration-150 shadow-2xs"
                      title="Flip canvas horizontally"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-gray-600" />
                      <span>Flip H</span>
                    </button>
                    <button
                      onClick={onFlipVertical}
                      className="px-2 py-1.5 rounded text-xs bg-white text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1 transition-all duration-150 shadow-2xs"
                      title="Flip canvas vertically"
                    >
                      <FlipVertical className="w-3.5 h-3.5 text-gray-600" />
                      <span>Flip V</span>
                    </button>
                  </div>
                </div>

                {/* Apply / Cancel Crop */}
                <div className="flex gap-2 pt-2 border-t border-gray-300">
                  <button
                    onClick={onCancelCrop}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-colors shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5 inline mr-1" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={onApplyCrop}
                    className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5 inline mr-1" />
                    <span>Apply</span>
                  </button>
                </div>
              </div>
            )}

            {/* Context Tool Options: Magic Wand */}
            {currentTool === 'magic-erase' && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-300 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">Color Tolerance</span>
                  <span className="font-mono text-emerald-700 font-bold">{tolerance}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={tolerance}
                  onChange={(e) => onToleranceChange(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-gray-300 rounded-lg"
                />

                <div className="pt-1.5 flex items-center justify-between border-t border-gray-200">
                  <label className="text-xs text-gray-700 font-medium">Contiguous Only</label>
                  <input
                    type="checkbox"
                    checked={contiguous}
                    onChange={(e) => onContiguousChange(e.target.checked)}
                    className="accent-emerald-600 rounded cursor-pointer w-4 h-4"
                  />
                </div>
              </div>
            )}

            {/* Context Tool Options: Brush & Restore */}
            {(currentTool === 'brush-erase' || currentTool === 'restore-brush') && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-300 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-800">Brush Size</span>
                  <span className="font-mono text-emerald-700 font-bold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="150"
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-gray-300 rounded-lg"
                />
              </div>
            )}

            {/* Canvas Preview Background Option */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-300 space-y-2">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                Preview Backdrop
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => onPreviewBackgroundChange('checkerboard')}
                  className={`p-1.5 rounded text-center text-[10px] font-semibold border transition-all ${
                    previewBackground === 'checkerboard'
                      ? 'border-emerald-600 bg-white text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                      : 'border-gray-300 bg-white text-gray-700 hover:text-gray-900 hover:border-gray-400'
                  }`}
                  title="Photoshop transparent checkerboard"
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => onPreviewBackgroundChange('white')}
                  className={`p-1.5 rounded text-center text-[10px] font-semibold border transition-all ${
                    previewBackground === 'white'
                      ? 'border-emerald-600 bg-white text-emerald-800 ring-1 ring-emerald-600 shadow-2xs'
                      : 'border-gray-300 bg-white text-gray-700 hover:text-gray-900 hover:border-gray-400'
                  }`}
                  title="Pure White Backdrop"
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() => onPreviewBackgroundChange('dark')}
                  className={`p-1.5 rounded text-center text-[10px] font-semibold border transition-all ${
                    previewBackground === 'dark'
                      ? 'border-emerald-600 bg-gray-900 text-white shadow-2xs'
                      : 'border-gray-300 bg-white text-gray-700 hover:text-gray-900 hover:border-gray-400'
                  }`}
                  title="Dark Neutral Backdrop"
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
                    className="w-full h-full rounded cursor-pointer opacity-0 absolute inset-0 z-10"
                    title="Pick custom color"
                  />
                  <div
                    className={`w-full h-full rounded border flex items-center justify-center text-[10px] font-semibold ${
                      previewBackground === 'custom' ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: customBgColor }}
                  >
                    Color
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ========================================================= */
          /* MODE B: AI PICTURE ENHANCER TOOLBAR (ADOBE / LIGHTROOM UTILITY STYLE) */
          /* ========================================================= */
          <>
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Enhancer Inspector
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-gray-100 text-gray-600 border border-gray-300">
                  Hybrid Pro
                </span>
              </div>

              {/* Photoshop Style Utility Panel Container */}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-300 space-y-3">
                {/* 1. Enhancement Model Indicator (Compact Property Row - Ultra-Fast Preview V3) */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white border border-gray-200 text-xs shadow-2xs">
                  <span className="text-gray-600 font-medium">Enhancement Model</span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                    Ultra-Fast Preview V3
                  </span>
                </div>

                {/* 2. Output Resolution (Tactile Segmented Control Group) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">
                      Output Resolution
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Scale</span>
                  </div>

                  {/* Segmented Button Group */}
                  <div className="p-1 rounded-lg bg-gray-200 border border-gray-300 flex items-center gap-1 shadow-inner">
                    {[
                      { scale: 1, label: '1x (Orig Size)' },
                      { scale: 2, label: '2x Upscale' },
                      { scale: 4, label: '4x Ultra HD' },
                    ].map(({ scale, label }) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => onEnhancerScaleChange && onEnhancerScaleChange(scale)}
                        className={`flex-1 py-1.5 px-1 rounded-md text-[11px] font-mono font-medium transition-all duration-150 text-center ${
                          enhancerScale === scale
                            ? 'bg-emerald-600 text-white font-bold shadow-xs border border-emerald-700'
                            : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-300/80 shadow-2xs'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Primary CTA Button: Enhance Quality */}
                <div className="pt-2 border-t border-gray-300 space-y-2">
                  <button
                    type="button"
                    onClick={onApplyEnhance}
                    disabled={isEnhancing}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 transition-all duration-150 shadow-sm cursor-pointer"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Enhancing ({enhancerScale === 1 ? '1x HD' : `${enhancerScale}x`})...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>{enhancerScale === 1 ? 'Enhance Quality (1x Scale)' : `Super-Resolve (${enhancerScale}x)`}</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-gray-500 text-center leading-normal">
                    {enhancerScale === 1
                      ? 'Restores facial pupils, skin pores & clothing texture at 100% exact dimensions.'
                      : 'Super-resolves canvas dimensions and synthesizes ultra-crisp high-frequency details.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Secondary Utility Tool: Pan Viewport */}
            <button
              onClick={() => onSelectTool('pan')}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                currentTool === 'pan'
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                  : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
              }`}
              title="Pan canvas (or hold Spacebar anytime)"
            >
              <Hand className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pan Viewport (Space + Drag)</span>
            </button>

            {/* Secondary Tool: Quick Switch to BG Remover */}
            {onSwitchToolMode && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-300 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-[11px] uppercase tracking-tight">Need background removed?</span>
                  <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Extract transparent PNG cutout directly from this enhanced image.
                </p>
                <button
                  type="button"
                  onClick={() => onSwitchToolMode('bg-remover')}
                  className="w-full py-1.5 px-3 rounded-md bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 shadow-2xs"
                >
                  <span>Switch to BG Remover</span>
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* COMMON: VIEW & COMPARISON SECTION */}
        {/* ========================================================= */}
        <div className="pt-1">
          <label className="text-xs font-bold text-gray-800 mb-2 block tracking-wider uppercase">
            Comparison & Preview
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onToggleSplitView}
              className={`flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                isSplitView
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                  : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
              }`}
              title="Before vs After Split Slider"
            >
              <Split className="w-3.5 h-3.5 text-emerald-600" />
              <span>Split Slider</span>
            </button>

            <button
              onClick={onToggleShowOriginal}
              className={`flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 border active:scale-[0.98] ${
                showOriginal
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold shadow-2xs'
                  : 'bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-2xs'
              }`}
              title="Hold to inspect original unedited image"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hold Original</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM ZOOM TOOLBAR (- / 100% / + / FIT) */}
      {/* ========================================================= */}
      <div className="pt-2.5 border-t border-gray-300 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onZoomOut}
            className="w-7 h-7 rounded border border-gray-300 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-2xs"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoom100}
            className="px-2 h-7 rounded border border-gray-300 bg-white text-gray-800 font-mono text-[11px] font-semibold hover:bg-gray-50 flex items-center justify-center transition-colors shadow-2xs"
            title="Actual Size 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="w-7 h-7 rounded border border-gray-300 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-2xs"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onZoomFit}
          className="h-7 px-3 rounded border border-gray-300 bg-white text-gray-700 text-xs font-semibold hover:text-gray-900 hover:bg-gray-100 flex items-center gap-1 transition-colors shadow-2xs"
          title="Fit into viewport"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Fit</span>
        </button>
      </div>
    </aside>
  );
};
