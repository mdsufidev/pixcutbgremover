import React, { useState } from 'react';
import { X, Download, Check, FileCheck } from 'lucide-react';
import { ExportSettings } from '../types';
import iconImg from '../assets/icon.png';

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
    <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-md w-full p-6 text-gray-900 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <img src={iconImg} alt="FileWala TOOL" className="w-6 h-6 rounded object-contain" />
            <h2 className="text-base font-semibold text-gray-900">Export Image</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Format Selection */}
        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
            File Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['png', 'jpg', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSettings({ ...settings, format: fmt })}
                className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium uppercase transition-all duration-150 ${
                  settings.format === fmt
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/20'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Background Fill */}
        <div>
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
            Backdrop
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={settings.format === 'jpg'}
              onClick={() => setSettings({ ...settings, backgroundType: 'transparent' })}
              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all duration-150 ${
                settings.backgroundType === 'transparent' && settings.format !== 'jpg'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/20'
                  : settings.format === 'jpg'
                  ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs'
              }`}
            >
              Transparent
            </button>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, backgroundType: 'color' })}
              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
                settings.backgroundType === 'color' || settings.format === 'jpg'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs'
              }`}
            >
              <span>Solid Color</span>
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    backgroundType: 'color',
                    backgroundColor: e.target.value,
                  })
                }
                className="w-4 h-4 rounded border-0 cursor-pointer p-0 bg-transparent"
              />
            </button>
          </div>
        </div>

        {/* Section 3: Quality Slider (for JPG / WebP) */}
        {(settings.format === 'jpg' || settings.format === 'webp') && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">Compression Quality</span>
              <span className="font-mono text-emerald-700 font-semibold">
                {Math.round(settings.quality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={settings.quality}
              onChange={(e) =>
                setSettings({ ...settings, quality: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
            />
          </div>
        )}

        {/* Metadata Summary Box */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs font-mono text-gray-600">
          <span>Dimensions:</span>
          <span className="text-gray-900 font-medium">
            {width} × {height} px
          </span>
        </div>

        {/* Export Success Message */}
        {exportSuccessPath && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Saved: {exportSuccessPath}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Save File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
