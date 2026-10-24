import React, { useState, useRef, DragEvent } from 'react';
import {
  UploadCloud,
  Wand2,
  Sparkles,
  Clipboard,
} from 'lucide-react';
import { ToolMode } from '../types';

interface DropZoneProps {
  onImageSelected: (fileOrBlob: File | Blob, name: string, mode: ToolMode) => void;
  isProcessing: boolean;
  daemonHealthy: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onImageSelected,
  isProcessing,
  daemonHealthy,
}) => {
  const [selectedMode, setSelectedMode] = useState<ToolMode>('bg-remover');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file, file.name, selectedMode);
      }
    }
  };

  const handleOpenFilePicker = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFileDialog();
      if (!result.canceled && result.fileData && result.fileName) {
        const blob = new Blob([result.fileData], { type: result.mimeType || 'image/png' });
        onImageSelected(blob, result.fileName, selectedMode);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onImageSelected(file, file.name, selectedMode);
    }
  };

  const loadSample = (type: 'product' | 'portrait') => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (type === 'product') {
      // Clean studio product
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, 800, 600);

      // Camera body
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(250, 200, 300, 200, 24);
      ctx.fill();

      // Lens
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(400, 300, 65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(400, 300, 45, 0, Math.PI * 2);
      ctx.fill();

      canvas.toBlob((blob) => {
        if (blob) onImageSelected(blob, 'sample_camera.png', 'bg-remover');
      }, 'image/png');
    } else {
      // Portrait
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, 800, 600);

      // Face
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(400, 260, 90, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(365, 245, 8, 0, Math.PI * 2);
      ctx.arc(435, 245, 8, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(400, 220, 95, Math.PI, 0);
      ctx.fill();

      // Shirt
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.ellipse(400, 480, 180, 120, 0, 0, Math.PI * 2);
      ctx.fill();

      canvas.toBlob((blob) => {
        if (blob) onImageSelected(blob, 'sample_portrait.png', 'enhancer');
      }, 'image/png');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f8f9fa] text-gray-900 select-none overflow-hidden relative">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Main Container */}
      <div className="max-w-2xl w-full flex flex-col items-center z-10 space-y-6">
        
        {/* Clean Utility App Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700 font-medium shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Local Neural Desktop Engine</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500 font-mono text-[11px]">v1.0.0</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Clean Cutouts & Crystal Detail
          </h1>
          <p className="text-sm text-gray-600 max-w-md font-normal leading-relaxed">
            High-precision background removal and CodeFormer facial restoration, processed 100% locally on your workstation.
          </p>
        </div>

        {/* Minimalist Segmented Mode Selector (macOS / Figma Utility Style) */}
        <div className="p-1 rounded-xl bg-gray-200/80 border border-gray-300/60 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => setSelectedMode('bg-remover')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              selectedMode === 'bg-remover'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Remove Background</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMode('enhancer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              selectedMode === 'enhancer'
                ? 'bg-white text-gray-900 shadow-xs border border-gray-200/80'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enhance & Restore (1x - 4x)</span>
          </button>
        </div>

        {/* Unified Clean Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleOpenFilePicker}
          className={`w-full rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative bg-white ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/40 scale-[1.005] shadow-lg shadow-emerald-500/5'
              : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/15 shadow-xs hover:shadow-md'
          }`}
        >
          {/* Action Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 group-hover:scale-105 group-hover:border-emerald-300 group-hover:text-emerald-600 transition-all duration-200 shadow-xs mb-4">
            <UploadCloud className="w-6 h-6 stroke-[1.75]" />
          </div>

          <h3 className="text-base font-medium text-gray-800 group-hover:text-gray-900 transition-colors">
            Drop your image here, or <span className="text-emerald-600 font-semibold underline underline-offset-4">browse files</span>
          </h3>

          <p className="text-xs text-gray-500 mt-1.5 font-normal">
            Supports PNG, JPG, JPEG, and WebP up to 50MB
          </p>

          {/* Frictionless Clipboard Paste & Keyboard Hint */}
          <div className="mt-5 flex items-center gap-2 text-[11px] text-gray-600 font-mono px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
            <Clipboard className="w-3 h-3 text-gray-500" />
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-300 text-gray-800 shadow-2xs font-sans">Ctrl + V</kbd> to paste from clipboard</span>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-2 pt-1 text-xs text-gray-500">
          <span>Need a quick test?</span>
          <button
            type="button"
            onClick={() => loadSample('product')}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200 shadow-2xs transition-colors"
          >
            Product Sample
          </button>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            onClick={() => loadSample('portrait')}
            className="px-2.5 py-1 rounded-md bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-gray-200 shadow-2xs transition-colors"
          >
            Portrait Sample
          </button>
        </div>

      </div>
    </div>
  );
};
