import React, { useState, useRef, DragEvent } from 'react';
import { UploadCloud, Image as ImageIcon, Zap, ShieldCheck, Sparkles, FolderOpen } from 'lucide-react';

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

  // Generate a test sample image for instant testing
  const loadSampleImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background (solid gradient-like flat tone)
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 800, 600);

    // Draw foreground subject: a colorful geometric portrait object
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(400, 300, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(400, 240, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.fillRect(320, 340, 160, 80);

    canvas.toBlob((blob) => {
      if (blob) {
        onImageSelected(blob, 'sample_portrait.png');
      }
    }, 'image/png');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090a0f]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Main Drop Surface */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleNativePicker}
        className={`w-full max-w-2xl border ${
          isDragOver
            ? 'border-blue-500 bg-[#12141c]'
            : 'border-[#262a36] bg-[#12141c] hover:border-[#383e52]'
        } rounded-lg p-12 text-center cursor-pointer transition-all duration-150 flex flex-col items-center group relative`}
      >
        {/* Upload Icon */}
        <div className="w-14 h-14 rounded-lg bg-[#181b24] border border-[#262a36] flex items-center justify-center text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/40 transition-colors duration-150 mb-4">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-base font-medium text-zinc-100 mb-1">
          Drop your image here, or{' '}
          <span className="text-blue-400 underline underline-offset-4 decoration-blue-500/40 group-hover:decoration-blue-400">
            browse local file
          </span>
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
          High-resolution PNG, JPG, WebP, or TIFF. Fully processed locally on your hardware with zero cloud latency.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg pt-6 border-t border-[#1e222e]">
          <div className="flex flex-col items-center text-center p-2 rounded bg-[#181b24] border border-[#262a36]">
            <Zap className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-[11px] font-medium text-zinc-200">Local Hardware</span>
            <span className="text-[10px] text-zinc-500">Auto GPU / CPU</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded bg-[#181b24] border border-[#262a36]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[11px] font-medium text-zinc-200">100% Offline</span>
            <span className="text-[10px] text-zinc-500">Zero data leaves PC</span>
          </div>
          <div className="flex flex-col items-center text-center p-2 rounded bg-[#181b24] border border-[#262a36]">
            <ImageIcon className="w-4 h-4 text-blue-400 mb-1" />
            <span className="text-[11px] font-medium text-zinc-200">Full Resolution</span>
            <span className="text-[10px] text-zinc-500">Lossless PNG output</span>
          </div>
        </div>

        {/* Quick Sample Button */}
        <div className="mt-6 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={loadSampleImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181b24] hover:bg-[#222634] border border-[#262a36] hover:border-[#383e52] text-xs text-zinc-300 transition-colors duration-150"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Load Quick Demo Image</span>
          </button>
          <button
            onClick={handleNativePicker}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#181b24] hover:bg-[#222634] border border-[#262a36] hover:border-[#383e52] text-xs text-zinc-300 transition-colors duration-150"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Open Local File</span>
          </button>
        </div>
      </div>

      {/* Daemon Health Pill */}
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <span
          className={`w-2 h-2 rounded-full ${
            daemonHealthy ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
          }`}
        />
        <span>
          {daemonHealthy
            ? 'Local Engine Daemon Connected (127.0.0.1:8765)'
            : 'Waiting for AI Engine Daemon on loopback...'}
        </span>
      </div>
    </div>
  );
};
