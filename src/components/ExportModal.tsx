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
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = srcCanvas.width;
      exportCanvas.height = srcCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      if (settings.backgroundType === 'color' || settings.format === 'jpg') {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }

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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#16171a] border border-[#27272a] rounded-lg max-w-md w-full p-6 text-zinc-100 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Export Cutout Image</h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Dimensions: {width} × {height} px
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#202126] transition-colors duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">File Format</label>
          <div className="grid grid-cols-3 gap-2">
            {(['png', 'jpg', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    format: fmt,
                    backgroundType: fmt === 'jpg' ? 'color' : settings.backgroundType,
                  })
                }
                className={`py-2 px-3 rounded-md text-xs font-mono uppercase transition-colors duration-150 ${
                  settings.format === fmt
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'bg-[#1e1f24] border border-[#27272a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                .{fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Background Fill (Only for PNG and WebP) */}
        {settings.format !== 'jpg' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Background</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, backgroundType: 'transparent' })}
                className={`py-2 px-3 rounded-md text-xs transition-colors duration-150 ${
                  settings.backgroundType === 'transparent'
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'bg-[#1e1f24] border border-[#27272a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Transparent Alpha
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, backgroundType: 'color' })}
                className={`py-2 px-3 rounded-md text-xs transition-colors duration-150 ${
                  settings.backgroundType === 'color'
                    ? 'bg-zinc-100 text-zinc-900 font-medium'
                    : 'bg-[#1e1f24] border border-[#27272a] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Solid Color
              </button>
            </div>
          </div>
        )}

        {/* Solid Background Color Preset */}
        {(settings.backgroundType === 'color' || settings.format === 'jpg') && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300">Color Palette</label>
            <div className="flex items-center gap-2">
              {[
                { label: 'White', color: '#ffffff' },
                { label: 'Black', color: '#000000' },
                { label: 'Slate', color: '#334155' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setSettings({ ...settings, backgroundColor: c.color })}
                  className={`flex-1 py-1.5 rounded-md text-xs border flex items-center justify-center gap-1.5 ${
                    settings.backgroundColor === c.color ? 'border-zinc-200' : 'border-[#27272a]'
                  }`}
                  style={{ backgroundColor: c.color }}
                >
                  <span
                    className={`text-[11px] font-mono ${
                      c.color === '#ffffff' ? 'text-zinc-900' : 'text-zinc-100'
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              ))}

              <div className="relative">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                  className="w-8 h-8 opacity-0 absolute inset-0 cursor-pointer"
                />
                <div
                  className="w-8 h-8 rounded-md border border-[#27272a] flex items-center justify-center"
                  style={{ backgroundColor: settings.backgroundColor }}
                >
                  <Palette className="w-3.5 h-3.5 text-white invert mix-blend-difference" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {exportSuccessPath && (
          <div className="p-2.5 rounded-md bg-[#18181b] border border-[#27272a] text-xs text-zinc-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate">Saved: {exportSuccessPath}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#27272a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs text-zinc-400 hover:text-white border border-[#27272a] hover:bg-[#202126] transition-colors duration-150"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 rounded-md text-xs bg-zinc-100 text-zinc-900 hover:bg-white font-medium flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
