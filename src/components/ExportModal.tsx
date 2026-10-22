import React, { useState } from 'react';
import { X, Download, Check, FileCheck, Palette } from 'lucide-react';
import { ExportSettings } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  defaultFileName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  defaultFileName,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    backgroundType: 'transparent',
    backgroundColor: '#ffffff',
    quality: 0.95,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessPath, setExportSuccessPath] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    const srcCanvas = canvasRef.current;
    if (!srcCanvas) return;

    setIsExporting(true);
    setExportSuccessPath(null);

    try {
      // Create offscreen export canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = srcCanvas.width;
      exportCanvas.height = srcCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Draw background if not transparent (or if JPG)
      if (settings.backgroundType === 'color' || settings.format === 'jpg') {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }

      // Draw transparent cutout onto export canvas
      ctx.drawImage(srcCanvas, 0, 0);

      const mimeType =
        settings.format === 'jpg'
          ? 'image/jpeg'
          : settings.format === 'webp'
          ? 'image/webp'
          : 'image/png';

      const fileExt = settings.format === 'jpg' ? 'jpg' : settings.format;
      const baseName = defaultFileName.replace(/\.[^/.]+$/, '');
      const exportName = `${baseName}_cutout.${fileExt}`;

      // Native Electron save dialog flow
      if (window.electronAPI) {
        const dialogRes = await window.electronAPI.saveFileDialog(exportName);
        if (!dialogRes.canceled && dialogRes.filePath) {
          const blob = await new Promise<Blob | null>((resolve) =>
            exportCanvas.toBlob(resolve, mimeType, settings.quality)
          );
          if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const saveRes = await window.electronAPI.saveFile(dialogRes.filePath, arrayBuffer);
            if (saveRes.success) {
              setExportSuccessPath(dialogRes.filePath);
            }
          }
        }
      } else {
        // Web fallback download
        const dataUrl = exportCanvas.toDataURL(mimeType, settings.quality);
        const link = document.createElement('a');
        link.download = exportName;
        link.href = dataUrl;
        link.click();
        setExportSuccessPath(exportName);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const width = canvasRef.current?.width || 0;
  const height = canvasRef.current?.height || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12141c] border border-[#262a36] rounded-lg max-w-md w-full shadow-2xl p-6 text-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262a36] pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Export Processed Image</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resolution Info */}
        <div className="flex items-center justify-between text-xs font-mono bg-[#181b24] p-2.5 rounded border border-[#262a36] text-zinc-400">
          <span>Canvas Resolution:</span>
          <span className="text-zinc-200 font-semibold">{width} × {height} px</span>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">File Format</label>
          <div className="grid grid-cols-3 gap-2">
            {(['png', 'webp', 'jpg'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => {
                  setSettings({
                    ...settings,
                    format: fmt,
                    backgroundType: fmt === 'jpg' ? 'color' : settings.backgroundType,
                  });
                }}
                className={`py-2 px-3 rounded text-xs uppercase font-mono font-medium border transition-colors duration-150 ${
                  settings.format === fmt
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-[#181b24] border-[#262a36] text-zinc-400 hover:text-white hover:bg-[#222634]'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Background Fill Options */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">Background Surface</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={settings.format === 'jpg'}
              onClick={() => setSettings({ ...settings, backgroundType: 'transparent' })}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs border transition-colors duration-150 ${
                settings.format === 'jpg'
                  ? 'opacity-40 cursor-not-allowed bg-[#181b24] border-[#262a36] text-zinc-600'
                  : settings.backgroundType === 'transparent'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-[#181b24] border-[#262a36] text-zinc-400 hover:text-white'
              }`}
            >
              <span>Transparent Alpha</span>
            </button>

            <button
              onClick={() => setSettings({ ...settings, backgroundType: 'color' })}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs border transition-colors duration-150 ${
                settings.backgroundType === 'color'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-[#181b24] border-[#262a36] text-zinc-400 hover:text-white'
              }`}
            >
              <span>Solid Color Fill</span>
            </button>
          </div>
        </div>

        {/* Color Presets (When Solid Color is active) */}
        {(settings.backgroundType === 'color' || settings.format === 'jpg') && (
          <div className="p-3 bg-[#181b24] rounded border border-[#262a36] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Choose Color:</span>
              <span className="font-mono text-zinc-300">{settings.backgroundColor}</span>
            </div>
            <div className="flex items-center gap-2">
              {['#ffffff', '#000000', '#f3f4f6', '#3b82f6', '#ef4444'].map((c) => (
                <button
                  key={c}
                  onClick={() => setSettings({ ...settings, backgroundColor: c })}
                  className={`w-6 h-6 rounded border transition-transform ${
                    settings.backgroundColor === c
                      ? 'ring-2 ring-blue-500 scale-110 border-white'
                      : 'border-[#262a36]'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="relative overflow-hidden w-6 h-6 rounded border border-[#262a36] flex items-center justify-center bg-[#222634] cursor-pointer">
                <Palette className="w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                  className="opacity-0 absolute inset-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Success Message Banner */}
        {exportSuccessPath && (
          <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <FileCheck className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Saved: {exportSuccessPath}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a36]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#181b24] transition-colors duration-150"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium border border-blue-500 shadow-sm transition-colors duration-150 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Saving File...' : 'Save Directly to Disk'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
