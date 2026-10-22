import React, { useState, useRef, DragEvent } from 'react';
import { Upload, Image as ImageIcon, FolderOpen, Zap, Shield, Sparkles } from 'lucide-react';

interface DropZoneProps {
  onImageSelected: (fileOrBlob: File | Blob, name: string) => void;
  isProcessing: boolean;
  daemonHealthy: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onImageSelected,
  isProcessing,
  daemonHealthy,
}) => {
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
        onImageSelected(file, file.name);
      }
    }
  };

  const handleNativePicker = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFileDialog();
      if (!result.canceled && result.fileData && result.fileName) {
        const blob = new Blob([result.fileData], { type: result.mimeType || 'image/png' });
        onImageSelected(blob, result.fileName);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onImageSelected(file, file.name);
    }
  };

  const loadSampleImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Solid neutral studio background
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, 0, 900, 700);

    // Subject 1: Camera body shape
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(280, 260, 340, 240, 20);
    ctx.fill();

    // Subject 2: Lens circle
    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    ctx.arc(450, 380, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#52525b';
    ctx.beginPath();
    ctx.arc(450, 380, 50, 0, Math.PI * 2);
    ctx.fill();

    // Viewfinder
    ctx.fillStyle = '#18181b';
    ctx.fillRect(400, 220, 100, 40);

    canvas.toBlob((blob) => {
      if (blob) {
        onImageSelected(blob, 'sample_camera.png');
      }
    }, 'image/png');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0f1012]">
      {/* Brand Logo Banner */}
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/logo.png"
          alt="PixCutBg Desktop"
          className="h-11 object-contain select-none pointer-events-none"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleNativePicker}
        className={`w-full max-w-xl p-10 rounded-lg border text-center cursor-pointer transition-colors duration-150 flex flex-col items-center justify-center ${
          isDragOver
            ? 'border-zinc-400 bg-[#18181b]'
            : 'border-[#27272a] bg-[#141518] hover:border-zinc-500 hover:bg-[#18181b]'
        }`}
      >
        {/* Minimal 2D icon */}
        <div className="w-12 h-12 rounded-md bg-[#1f2024] border border-[#27272a] flex items-center justify-center text-zinc-300 mb-5">
          <Upload className="w-5 h-5 text-zinc-300" />
        </div>

        <h2 className="text-base font-semibold text-zinc-100 tracking-tight mb-1">
          Drop an image here, or browse
        </h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
          Supports high-resolution PNG, JPG, JPEG, and WebP. Background removal is processed 100% locally on your computer.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNativePicker();
            }}
            className="px-4 py-2 rounded-md text-xs font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors duration-150 flex items-center gap-2"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Select Local Image</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadSampleImage();
            }}
            className="px-3.5 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-[#27272a] hover:bg-[#202126] transition-colors duration-150"
          >
            Try Sample Image
          </button>
        </div>
      </div>

      {/* Grounded minimalist specs list */}
      <div className="mt-8 grid grid-cols-3 gap-6 text-left max-w-xl w-full">
        <div className="p-3.5 rounded-md border border-[#27272a] bg-[#141518]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200 mb-1">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>100% Offline</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-normal">
            No image data ever leaves your device. Complete local privacy.
          </p>
        </div>

        <div className="p-3.5 rounded-md border border-[#27272a] bg-[#141518]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200 mb-1">
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Fast Local Inference</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-normal">
            Direct ONNX execution using CPU threads or NVIDIA GPU acceleration.
          </p>
        </div>

        <div className="p-3.5 rounded-md border border-[#27272a] bg-[#141518]">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-200 mb-1">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Precision Post-Edit</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-normal">
            Advanced crop, Magic Color Erase, and non-destructive undo/redo history.
          </p>
        </div>
      </div>
    </div>
  );
};
