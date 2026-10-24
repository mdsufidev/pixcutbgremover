import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { DropZone } from './components/DropZone';
import { Toolbar } from './components/Toolbar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { BackendSetupModal } from './components/BackendSetupModal';
import { SystemStatus } from './components/SystemStatus';
import { ToolType, AspectRatioPreset, CropRect, HardwareInfo, ImageMetadata, ToolMode } from './types';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { pingDaemon, getHardwareInfo, processBackgroundRemoval, processImageEnhance, getEnhancerStatus } from './services/api';
import { AlertCircle, Loader2, UploadCloud } from 'lucide-react';

export const App: React.FC = () => {
  // Tool Division: 'bg-remover' (Background Removal) vs 'enhancer' (AI Picture Enhancer)
  const [activeToolMode, setActiveToolMode] = useState<ToolMode | null>(null);

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
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBackendSetupOpen, setIsBackendSetupOpen] = useState<boolean>(false);

  // Crop Tool State
  const [cropAspectRatio, setCropAspectRatio] = useState<AspectRatioPreset>('free');
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  // Real-ESRGAN Enhancer State (default 1x for 100% original dimension detail restoration)
  const [enhancerScale, setEnhancerScale] = useState<number>(1);
  const [enhancerModel, setEnhancerModel] = useState<string>('realesr-animevideov3');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhancerAvailable, setEnhancerAvailable] = useState<boolean>(true);

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
        const enh = await getEnhancerStatus();
        if (isMounted && enh) setEnhancerAvailable(enh.available);
      } else if (window.electronAPI?.checkBackendInstalled) {
        const status = await window.electronAPI.checkBackendInstalled();
        if (!status.installed && isMounted) {
          setIsBackendSetupOpen(true);
        }
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

  // Real-ESRGAN Face & Image Enhancement Handler
  const handleApplyEnhance = useCallback(async () => {
    if (!canvasRef.current || isEnhancing) return;
    setIsEnhancing(true);
    setProcessingError(null);

    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setProcessingError('Could not export canvas data for enhancement.');
        setIsEnhancing(false);
        return;
      }

      try {
        const res = await processImageEnhance(
          blob,
          activeMetadata?.name || 'enhanced.png',
          enhancerScale,
          enhancerModel
        );

        const enhancedImg = new Image();
        enhancedImg.onload = () => {
          canvas.width = enhancedImg.naturalWidth;
          canvas.height = enhancedImg.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(enhancedImg, 0, 0);
            const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            pushState(snapshot);
          }

          if (activeMetadata) {
            setActiveMetadata({
              ...activeMetadata,
              originalWidth: enhancedImg.naturalWidth,
              originalHeight: enhancedImg.naturalHeight,
              inferenceTimeMs: res.inferenceTimeMs,
              device: `${res.engine} (${res.scale}x)`,
            });
          }
          setCutoutImage(enhancedImg);
          setIsEnhancing(false);
        };

        enhancedImg.onerror = () => {
          setProcessingError('Failed to decode enhanced output image.');
          setIsEnhancing(false);
        };

        enhancedImg.src = URL.createObjectURL(res.blob);
      } catch (err: any) {
        console.error('Enhancement error:', err);
        setProcessingError(err.message || 'Real-ESRGAN enhancement error.');
        setIsEnhancing(false);
      }
    }, 'image/png');
  }, [isEnhancing, activeMetadata, enhancerScale, enhancerModel, pushState]);

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

  // Handle Image Drop or Selection for specific tool
  const handleImageSelected = async (fileOrBlob: File | Blob, name: string, mode: ToolMode = 'bg-remover') => {
    setIsProcessing(true);
    setProcessingError(null);
    setActiveToolMode(mode);

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

      if (mode === 'enhancer') {
        // AI Picture Enhancer Mode: Load original photo intact (no background removed)
        metadata.inferenceTimeMs = 0;
        metadata.device = 'Real-ESRGAN Vulkan';
        setActiveMetadata(metadata);
        setCutoutImage(img);
        setCurrentTool('pan');
        setIsProcessing(false);
        return;
      }

      // Background Remover Mode: Process background removal
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
          setCurrentTool('magic-erase');
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

  // Seamless Mode Switcher (e.g. from TitleBar or Toolbar)
  const handleSwitchToolMode = async (targetMode: ToolMode | null) => {
    if (targetMode === null) {
      handleResetImage();
      return;
    }
    if (targetMode === activeToolMode) return;

    if (targetMode === 'bg-remover' && activeToolMode === 'enhancer' && canvasRef.current) {
      // Switching from enhancer to background remover: remove background from current enhanced image
      setIsProcessing(true);
      setProcessingError(null);
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setActiveToolMode('bg-remover');
          setCurrentTool('magic-erase');
          return;
        }
        try {
          const res = await processBackgroundRemoval(blob, activeMetadata?.name || 'enhanced.png');
          const cutout = new Image();
          cutout.onload = () => {
            setCutoutImage(cutout);
            setIsProcessing(false);
            setActiveToolMode('bg-remover');
            setCurrentTool('magic-erase');
          };
          cutout.src = URL.createObjectURL(res.blob);
        } catch (err: any) {
          setIsProcessing(false);
          setActiveToolMode('bg-remover');
          setCurrentTool('magic-erase');
        }
      }, 'image/png');
    } else {
      setActiveToolMode(targetMode);
      if (targetMode === 'enhancer') {
        setCurrentTool('pan');
      } else {
        setCurrentTool('magic-erase');
      }
    }
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
    setActiveToolMode(null);
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

  // Global drag-and-drop state across the entire window
  const [isGlobalDragging, setIsGlobalDragging] = useState<boolean>(false);
  const dragCounterRef = useRef<number>(0);

  const handleGlobalDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsGlobalDragging(true);
    }
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsGlobalDragging(false);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGlobalDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsGlobalDragging(false);
      dragCounterRef.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          handleImageSelected(file, file.name, activeToolMode || 'bg-remover');
        }
      }
    },
    [activeToolMode]
  );

  // Global Clipboard Paste (Ctrl+V) for Instant Screenshots & Copied Images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          handleImageSelected(file, 'clipboard_image.png', activeToolMode || 'bg-remover');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeToolMode]);

  return (
    <div
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
      className="h-screen w-screen flex flex-col bg-[#F4F5F7] text-gray-900 overflow-hidden font-sans select-none relative"
    >
      {/* 1. Minimal Window Chrome TitleBar with Unified Tool Actions */}
      <TitleBar
        hardwareInfo={hardwareInfo}
        daemonHealthy={daemonHealthy}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeToolMode={activeMetadata ? activeToolMode : null}
        onSelectMode={handleSwitchToolMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        metadata={activeMetadata}
        onExport={() => setIsExportOpen(true)}
        onResetImage={handleResetImage}
      />

      {/* Global Drag & Drop Overlay */}
      {isGlobalDragging && (
        <div className="absolute inset-0 z-50 bg-emerald-50/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-500 m-2 rounded-2xl transition-all duration-200 pointer-events-none">
          <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-300 flex items-center justify-center text-emerald-600 mb-4 shadow-md">
            <UploadCloud className="w-8 h-8 animate-bounce text-emerald-600" />
          </div>
          <p className="text-lg font-semibold text-emerald-950">Drop image to open</p>
          <p className="text-xs text-emerald-700 mt-1 font-normal">Replaces workspace canvas immediately</p>
        </div>
      )}

      {/* Modern Desktop Utility Floating Glass Skeleton / Progress Card */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-gray-900/30 backdrop-blur-2xs flex flex-col items-center justify-center p-4 transition-all duration-200">
          <div className="max-w-xs w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center space-y-4 text-gray-900">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>

            <div className="space-y-1 w-full">
              <p className="text-sm font-semibold text-gray-900 tracking-tight">
                {activeToolMode === 'enhancer' ? 'Enhancing Picture Details' : 'Removing Background'}
              </p>
              <p className="text-xs text-gray-500 font-normal">
                {activeToolMode === 'enhancer' ? 'Real-ESRGAN + CodeFormer Neural Pass' : 'Neural segmentation pass in progress'}
              </p>
            </div>

            {/* Smooth Skeleton Shimmer Bar */}
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden relative border border-gray-200/60">
              <div className="absolute inset-y-0 bg-emerald-600 rounded-full w-2/3 animate-pulse" />
            </div>

            <span className="text-[10px] font-mono text-gray-400">
              {hardwareInfo?.accelerator || 'Local AI Engine'}
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {processingError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
            <span>{processingError}</span>
          </div>
          <button
            onClick={() => setProcessingError(null)}
            className="text-red-700 hover:text-red-900 underline font-mono text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace (Home Dashboard vs Active Tool Workspace) */}
      {!activeMetadata || !activeToolMode ? (
        <DropZone
          onImageSelected={handleImageSelected}
          isProcessing={isProcessing}
          daemonHealthy={daemonHealthy}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          <Toolbar
            activeToolMode={activeToolMode}
            onSwitchToolMode={handleSwitchToolMode}
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
            enhancerScale={enhancerScale}
            onEnhancerScaleChange={setEnhancerScale}
            enhancerModel={enhancerModel}
            onEnhancerModelChange={setEnhancerModel}
            onApplyEnhance={handleApplyEnhance}
            isEnhancing={isEnhancing}
            enhancerAvailable={enhancerAvailable}
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
      )}

      {/* Footer System Diagnostics & Zoom Control Bar */}
      <SystemStatus
        hardwareInfo={hardwareInfo}
        daemonHealthy={daemonHealthy}
        isProcessing={isProcessing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        metadata={activeMetadata}
        zoom={activeMetadata ? zoom : undefined}
        onZoomIn={() => setZoom((z) => Math.min(z * 1.25, 8.0))}
        onZoomOut={() => setZoom((z) => Math.max(z * 0.8, 0.05))}
        onZoomFit={handleZoomFit}
        onZoom100={() => setZoom(1.0)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        canvasRef={canvasRef}
        defaultFileName={activeMetadata?.name || 'pixcut-output.png'}
      />

      {/* Settings & Hardware Acceleration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentHardware={hardwareInfo}
        onHardwareUpdated={(updated) => setHardwareInfo(updated)}
      />

      {/* First-time Backend Setup Modal (Downloads FastAPI AI Engine from GitHub) */}
      <BackendSetupModal
        isOpen={isBackendSetupOpen}
        onSuccess={() => {
          setIsBackendSetupOpen(false);
          pingDaemon().then((ok) => {
            setDaemonHealthy(ok);
            if (ok) getHardwareInfo().then(setHardwareInfo);
          });
        }}
      />
    </div>
  );
};
