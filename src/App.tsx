import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { DropZone } from './components/DropZone';
import { Toolbar } from './components/Toolbar';
import { HistoryBar } from './components/HistoryBar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { ExportModal } from './components/ExportModal';
import { SystemStatus } from './components/SystemStatus';
import { ToolType, AspectRatioPreset, CropRect, HardwareInfo, ImageMetadata } from './types';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { pingDaemon, getHardwareInfo, processBackgroundRemoval } from './services/api';
import { AlertCircle, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  // Daemon & System state
  const [daemonHealthy, setDaemonHealthy] = useState<boolean>(false);
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Active Image & Cutout Objects
  const [activeMetadata, setActiveMetadata] = useState<ImageMetadata | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [cutoutImage, setCutoutImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tool & Canvas Viewport Controls
  const [currentTool, setCurrentTool] = useState<ToolType>('magic-erase');
  const [tolerance, setTolerance] = useState<number>(25);
  const [contiguous, setContiguous] = useState<boolean>(true);
  const [brushSize, setBrushSize] = useState<number>(32);
  const [zoom, setZoom] = useState<number>(1.0);
  const [previewBg, setPreviewBg] = useState<'checkerboard' | 'white' | 'dark' | 'custom'>('checkerboard');
  const [customBgColor, setCustomBgColor] = useState<string>('#3b82f6');
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Crop Tool State
  const [cropAspectRatio, setCropAspectRatio] = useState<AspectRatioPreset>('free');
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  // Canvas History Stack
  const {
    pushState,
    undo,
    redo,
    reset: resetHistory,
    canUndo,
    canRedo,
    stepCount,
    currentStep,
  } = useCanvasHistory();

  // Fast daemon ping and system diagnostics check
  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      const ok = await pingDaemon();
      if (!isMounted) return;
      setDaemonHealthy(ok);
      if (ok) {
        const info = await getHardwareInfo();
        if (isMounted) setHardwareInfo(info);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        if (canvasRef.current.width !== prev.width || canvasRef.current.height !== prev.height) {
          canvasRef.current.width = prev.width;
          canvasRef.current.height = prev.height;
        }
        ctx.putImageData(prev, 0, 0);
        if (activeMetadata) {
          setActiveMetadata({
            ...activeMetadata,
            originalWidth: prev.width,
            originalHeight: prev.height,
          });
        }
      }
    }
  }, [undo, activeMetadata]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        if (canvasRef.current.width !== next.width || canvasRef.current.height !== next.height) {
          canvasRef.current.width = next.width;
          canvasRef.current.height = next.height;
        }
        ctx.putImageData(next, 0, 0);
        if (activeMetadata) {
          setActiveMetadata({
            ...activeMetadata,
            originalWidth: next.width,
            originalHeight: next.height,
          });
        }
      }
    }
  }, [redo, activeMetadata]);

  // Apply Crop Transformation
  const handleApplyCrop = useCallback(() => {
    if (!canvasRef.current || !cropRect) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const croppedData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

    canvas.width = cropRect.width;
    canvas.height = cropRect.height;
    ctx.putImageData(croppedData, 0, 0);

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pushState(snapshot);

    if (activeMetadata) {
      setActiveMetadata({
        ...activeMetadata,
        originalWidth: cropRect.width,
        originalHeight: cropRect.height,
      });
    }

    setCropRect(null);
    setCurrentTool('magic-erase');
  }, [cropRect, activeMetadata, pushState]);

  const handleCancelCrop = useCallback(() => {
    setCropRect(null);
    setCurrentTool('magic-erase');
  }, []);

  // Quick 90 deg Clockwise Rotation
  const handleRotateClockwise = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tempCtx = temp.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    const oldW = canvas.width;
    const oldH = canvas.height;
    canvas.width = oldH;
    canvas.height = oldW;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(temp, 0, 0);
    ctx.restore();

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pushState(snapshot);

    if (activeMetadata) {
      setActiveMetadata({
        ...activeMetadata,
        originalWidth: canvas.width,
        originalHeight: canvas.height,
      });
    }
    setCropRect(null);
  }, [activeMetadata, pushState]);

  // Flip Horizontal
  const handleFlipHorizontal = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tempCtx = temp.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(temp, 0, 0);
    ctx.restore();

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pushState(snapshot);
    setCropRect(null);
  }, [pushState]);

  // Flip Vertical
  const handleFlipVertical = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tempCtx = temp.getContext('2d');
    if (!tempCtx) return;
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
    ctx.drawImage(temp, 0, 0);
    ctx.restore();

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    pushState(snapshot);
    setCropRect(null);
  }, [pushState]);

  // Keyboard Shortcuts (Undo, Redo, Enter to Crop, Esc to Cancel Crop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Enter' && currentTool === 'crop') {
        e.preventDefault();
        handleApplyCrop();
      } else if (e.key === 'Escape' && currentTool === 'crop') {
        e.preventDefault();
        handleCancelCrop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleApplyCrop, handleCancelCrop, currentTool]);

  // Synchronize Canvas with Cutout Image
  useEffect(() => {
    if (!cutoutImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = cutoutImage.naturalWidth;
    canvas.height = cutoutImage.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(cutoutImage, 0, 0);
      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resetHistory(initialSnapshot);
    }
  }, [cutoutImage]);

  // Handle Image Drop or Selection
  const handleImageSelected = async (fileOrBlob: File | Blob, name: string) => {
    setIsProcessing(true);
    setProcessingError(null);

    const originalUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = async () => {
      setOriginalImage(img);

      const metadata: ImageMetadata = {
        name,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        originalSizeFormatted: `${(fileOrBlob.size / (1024 * 1024)).toFixed(2)} MB`,
        originalUrl,
      };

      try {
        let resultBlob: Blob;
        let inferenceTime = 0;
        let deviceUsed = 'CPU';

        // Check if local daemon is responsive
        const isBackendUp = await pingDaemon();
        if (isBackendUp) {
          const res = await processBackgroundRemoval(fileOrBlob, name);
          resultBlob = res.blob;
          inferenceTime = res.inferenceTimeMs;
          deviceUsed = res.device;
        } else {
          // Dev preview fallback
          resultBlob = await simulateLocalCutout(img);
          inferenceTime = 45;
          deviceUsed = 'Browser Canvas (Daemon Offline)';
        }

        metadata.inferenceTimeMs = inferenceTime;
        metadata.device = deviceUsed;

        setActiveMetadata(metadata);

        const cutout = new Image();
        cutout.onload = () => {
          setCutoutImage(cutout);
          setIsProcessing(false);
        };
        cutout.onerror = () => {
          setProcessingError('Failed to decode cutout PNG.');
          setIsProcessing(false);
        };
        cutout.src = URL.createObjectURL(resultBlob);
      } catch (err: any) {
        console.error('Inference error:', err);
        setProcessingError(err.message || 'Background removal error.');
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setProcessingError('Could not load input image file.');
      setIsProcessing(false);
    };

    img.src = originalUrl;
  };

  const simulateLocalCutout = async (img: HTMLImageElement): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rx = canvas.width * 0.42;
    const ry = canvas.height * 0.42;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1.0) {
          data[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject('Failed to serialize blob')), 'image/png');
    });
  };

  const handleResetImage = () => {
    setActiveMetadata(null);
    setOriginalImage(null);
    setCutoutImage(null);
    setCropRect(null);
    resetHistory();
    setZoom(1.0);
    setIsSplitView(false);
    setShowOriginal(false);
    setCurrentTool('magic-erase');
  };

  const handleZoomFit = () => {
    if (!cutoutImage) return;
    const availableWidth = window.innerWidth - 300;
    const availableHeight = window.innerHeight - 110;
    const scaleX = availableWidth / cutoutImage.naturalWidth;
    const scaleY = availableHeight / cutoutImage.naturalHeight;
    const fit = Math.min(scaleX, scaleY, 1.0);
    setZoom(Math.max(0.1, Number(fit.toFixed(2))));
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f1012] text-zinc-100 overflow-hidden font-sans select-none">
      {/* 1. Minimal Window Chrome TitleBar */}
      <TitleBar hardwareInfo={hardwareInfo} daemonHealthy={daemonHealthy} />

      {/* Clean 2D Processing Loading Indicator */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-[#0f1012]/80 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-zinc-200 animate-spin" />
          <div className="text-center space-y-0.5">
            <p className="text-xs font-medium text-zinc-200 tracking-tight">
              Removing Background...
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              {hardwareInfo?.accelerator || 'Local Engine'}
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {processingError && (
        <div className="bg-[#1e1515] border-b border-red-900/40 px-4 py-2 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{processingError}</span>
          </div>
          <button
            onClick={() => setProcessingError(null)}
            className="text-red-400 hover:text-red-200 underline font-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace */}
      {!activeMetadata ? (
        <DropZone
          onImageSelected={handleImageSelected}
          isProcessing={isProcessing}
          daemonHealthy={daemonHealthy}
        />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <HistoryBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            currentStep={currentStep}
            totalSteps={stepCount}
            metadata={activeMetadata}
            onExport={() => setIsExportOpen(true)}
            onResetImage={handleResetImage}
          />

          <div className="flex-1 flex overflow-hidden">
            <Toolbar
              currentTool={currentTool}
              onSelectTool={setCurrentTool}
              tolerance={tolerance}
              onToleranceChange={setTolerance}
              contiguous={contiguous}
              onContiguousChange={setContiguous}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              cropAspectRatio={cropAspectRatio}
              onCropAspectRatioChange={setCropAspectRatio}
              onApplyCrop={handleApplyCrop}
              onCancelCrop={handleCancelCrop}
              onRotateClockwise={handleRotateClockwise}
              onFlipHorizontal={handleFlipHorizontal}
              onFlipVertical={handleFlipVertical}
              zoom={zoom}
              onZoomIn={() => setZoom((z) => Math.min(z * 1.25, 8.0))}
              onZoomOut={() => setZoom((z) => Math.max(z * 0.8, 0.05))}
              onZoomFit={handleZoomFit}
              onZoom100={() => setZoom(1.0)}
              previewBackground={previewBg}
              onPreviewBackgroundChange={setPreviewBg}
              customBgColor={customBgColor}
              onCustomBgColorChange={setCustomBgColor}
              showOriginal={showOriginal}
              onToggleShowOriginal={() => {
                setShowOriginal(!showOriginal);
                setIsSplitView(false);
              }}
              isSplitView={isSplitView}
              onToggleSplitView={() => {
                setIsSplitView(!isSplitView);
                setShowOriginal(false);
              }}
            />

            <CanvasWorkspace
              canvasRef={canvasRef}
              originalImage={originalImage}
              cutoutImage={cutoutImage}
              currentTool={currentTool}
              tolerance={tolerance}
              contiguous={contiguous}
              brushSize={brushSize}
              cropAspectRatio={cropAspectRatio}
              cropRect={cropRect}
              onCropRectChange={setCropRect}
              zoom={zoom}
              onZoomChange={setZoom}
              previewBackground={previewBg}
              customBgColor={customBgColor}
              showOriginal={showOriginal}
              isSplitView={isSplitView}
              onPushHistoryState={pushState}
            />
          </div>
        </div>
      )}

      {/* Footer System Diagnostics */}
      <SystemStatus
        hardwareInfo={hardwareInfo}
        daemonHealthy={daemonHealthy}
        isProcessing={isProcessing}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        canvasRef={canvasRef}
        defaultFileName={activeMetadata?.name || 'pixcut-output.png'}
      />
    </div>
  );
};
