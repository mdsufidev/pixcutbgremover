import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolType, AspectRatioPreset, CropRect } from '../types';
import { performMagicErase } from '../hooks/useMagicErase';

interface CanvasWorkspaceProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  originalImage: HTMLImageElement | null;
  cutoutImage: HTMLImageElement | null;
  currentTool: ToolType;
  tolerance: number;
  contiguous: boolean;
  brushSize: number;
  cropAspectRatio: AspectRatioPreset;
  cropRect: CropRect | null;
  onCropRectChange: (rect: CropRect | null) => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  previewBackground: 'checkerboard' | 'white' | 'dark' | 'custom';
  customBgColor: string;
  showOriginal: boolean;
  isSplitView: boolean;
  onPushHistoryState: (imageData: ImageData) => void;
}

type DragMode = 'none' | 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  canvasRef,
  originalImage,
  cutoutImage,
  currentTool,
  tolerance,
  contiguous,
  brushSize,
  cropAspectRatio,
  cropRect,
  onCropRectChange,
  zoom,
  onZoomChange,
  previewBackground,
  customBgColor,
  showOriginal,
  isSplitView,
  onPushHistoryState,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0-100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Crop drag interaction state
  const [cropDragMode, setCropDragMode] = useState<DragMode>('none');
  const cropDragStart = useRef<{ clientX: number; clientY: number; rect: CropRect }>({
    clientX: 0,
    clientY: 0,
    rect: { x: 0, y: 0, width: 0, height: 0 },
  });

  const lastPanPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null);

  // Space listener for viewport Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize or adjust crop rect when entering Crop tool or changing aspect ratio
  useEffect(() => {
    if (currentTool !== 'crop' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (canvas.width <= 0 || canvas.height <= 0) return;

    if (!cropRect) {
      // Default initial crop rect: full canvas
      let targetW = canvas.width;
      let targetH = canvas.height;

      if (cropAspectRatio !== 'free') {
        const ratioValues: Record<string, number> = {
          '1:1': 1,
          '16:9': 16 / 9,
          '4:3': 4 / 3,
          '3:2': 3 / 2,
          '9:16': 9 / 16,
          '2:3': 2 / 3,
        };
        const targetRatio = ratioValues[cropAspectRatio] || 1;
        const currentRatio = canvas.width / canvas.height;

        if (currentRatio > targetRatio) {
          targetW = Math.round(canvas.height * targetRatio);
          targetH = canvas.height;
        } else {
          targetW = canvas.width;
          targetH = Math.round(canvas.width / targetRatio);
        }
      }

      const initialX = Math.round((canvas.width - targetW) / 2);
      const initialY = Math.round((canvas.height - targetH) / 2);

      onCropRectChange({
        x: Math.max(0, initialX),
        y: Math.max(0, initialY),
        width: Math.min(canvas.width, targetW),
        height: Math.min(canvas.height, targetH),
      });
    } else if (cropAspectRatio !== 'free') {
      // Re-constrain existing crop rect to the newly selected aspect ratio
      const ratioValues: Record<string, number> = {
        '1:1': 1,
        '16:9': 16 / 9,
        '4:3': 4 / 3,
        '3:2': 3 / 2,
        '9:16': 9 / 16,
        '2:3': 2 / 3,
      };
      const targetRatio = ratioValues[cropAspectRatio] || 1;
      let newW = cropRect.width;
      let newH = Math.round(newW / targetRatio);

      if (newH > canvas.height) {
        newH = canvas.height;
        newW = Math.round(newH * targetRatio);
      }
      if (newW > canvas.width) {
        newW = canvas.width;
        newH = Math.round(newW / targetRatio);
      }

      const newX = Math.max(0, Math.min(cropRect.x, canvas.width - newW));
      const newY = Math.max(0, Math.min(cropRect.y, canvas.height - newH));

      onCropRectChange({ x: newX, y: newY, width: newW, height: newH });
    }
  }, [currentTool, cropAspectRatio]);

  // Auto-center and fit to screen when a new image is loaded
  useEffect(() => {
    if (!cutoutImage || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const availableWidth = container.width - 80;
    const availableHeight = container.height - 80;

    const scaleX = availableWidth / cutoutImage.naturalWidth;
    const scaleY = availableHeight / cutoutImage.naturalHeight;
    const initialFit = Math.min(scaleX, scaleY, 1.0);
    const safeFit = Math.max(0.1, Number(initialFit.toFixed(2)));

    onZoomChange(safeFit);

    const centeredX = Math.round((container.width - cutoutImage.naturalWidth * safeFit) / 2);
    const centeredY = Math.round((container.height - cutoutImage.naturalHeight * safeFit) / 2);
    setPan({ x: Math.max(20, centeredX), y: Math.max(20, centeredY) });
  }, [cutoutImage]);

  // Smooth mouse-anchored wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.min(Math.max(0.05, zoom * zoomFactor), 8.0);

    const container = containerRef.current?.getBoundingClientRect();
    if (container) {
      const mouseX = e.clientX - container.left;
      const mouseY = e.clientY - container.top;
      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      onZoomChange(Number(newZoom.toFixed(3)));
      setPan({ x: newPanX, y: newPanY });
    }
  };

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const x = Math.floor((clientX - rect.left) / zoom);
    const y = Math.floor((clientY - rect.top) / zoom);

    if (x < 0 || y < 0 || x >= canvasRef.current.width || y >= canvasRef.current.height) {
      return null;
    }
    return { x, y };
  };

  // Crop Drag Handling
  const startCropDrag = (mode: DragMode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cropRect) return;
    setCropDragMode(mode);
    cropDragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      rect: { ...cropRect },
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Pan mode (Middle click or Spacebar or Pan tool)
    if (e.button === 1 || spacePressed || currentTool === 'pan') {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0 || !canvasRef.current) return;

    // 2. Crop Mode is handled via overlay handles
    if (currentTool === 'crop') {
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 3. Magic Erase
    if (currentTool === 'magic-erase') {
      performMagicErase(canvas, coords.x, coords.y, tolerance, contiguous);
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onPushHistoryState(snapshot);
      return;
    }

    // 4. Brush Erase or Restore Brush
    if (currentTool === 'brush-erase' || currentTool === 'restore-brush') {
      setIsDrawing(true);
      lastDrawPoint.current = coords;
      paintBrushStroke(coords.x, coords.y, coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Crop handle dragging
    if (cropDragMode !== 'none' && cropRect && canvasRef.current) {
      const canvas = canvasRef.current;
      const dx = Math.round((e.clientX - cropDragStart.current.clientX) / zoom);
      const dy = Math.round((e.clientY - cropDragStart.current.clientY) / zoom);
      const start = cropDragStart.current.rect;

      let newX = start.x;
      let newY = start.y;
      let newW = start.width;
      let newH = start.height;

      const minSize = 20;

      if (cropDragMode === 'move') {
        newX = Math.max(0, Math.min(start.x + dx, canvas.width - start.width));
        newY = Math.max(0, Math.min(start.y + dy, canvas.height - start.height));
      } else {
        if (cropDragMode.includes('e')) {
          newW = Math.max(minSize, Math.min(start.width + dx, canvas.width - start.x));
        }
        if (cropDragMode.includes('s')) {
          newH = Math.max(minSize, Math.min(start.height + dy, canvas.height - start.y));
        }
        if (cropDragMode.includes('w')) {
          const maxShift = start.width - minSize;
          const shift = Math.max(-start.x, Math.min(dx, maxShift));
          newX = start.x + shift;
          newW = start.width - shift;
        }
        if (cropDragMode.includes('n')) {
          const maxShift = start.height - minSize;
          const shift = Math.max(-start.y, Math.min(dy, maxShift));
          newY = start.y + shift;
          newH = start.height - shift;
        }

        // Apply aspect ratio constraint if not free
        if (cropAspectRatio !== 'free') {
          const ratioValues: Record<string, number> = {
            '1:1': 1,
            '16:9': 16 / 9,
            '4:3': 4 / 3,
            '3:2': 3 / 2,
            '9:16': 9 / 16,
            '2:3': 2 / 3,
          };
          const targetRatio = ratioValues[cropAspectRatio] || 1;
          newH = Math.max(minSize, Math.round(newW / targetRatio));
          if (newY + newH > canvas.height) {
            newH = canvas.height - newY;
            newW = Math.round(newH * targetRatio);
          }
        }
      }

      onCropRectChange({ x: newX, y: newY, width: newW, height: newH });
      return;
    }

    // Split comparison slider dragging
    if (isDraggingSplit && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      setSplitPos(pct);
      return;
    }

    // Viewport Panning
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Canvas brush drawing
    if (isDrawing && canvasRef.current) {
      const coords = getCanvasCoords(e);
      if (coords && lastDrawPoint.current) {
        paintBrushStroke(lastDrawPoint.current.x, lastDrawPoint.current.y, coords.x, coords.y);
        lastDrawPoint.current = coords;
      }
    }

    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (cropDragMode !== 'none') {
      setCropDragMode('none');
    }
    if (isPanning) setIsPanning(false);
    if (isDraggingSplit) setIsDraggingSplit(false);

    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      lastDrawPoint.current = null;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const snapshot = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        onPushHistoryState(snapshot);
      }
    }
  };

  // Brush stroke interpolation
  const paintBrushStroke = (x0: number, y0: number, x1: number, y1: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const radius = brushSize / 2;

    if (currentTool === 'brush-erase') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      if (dist === 0) {
        ctx.arc(x0, y0, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.restore();
    } else if (currentTool === 'restore-brush' && originalImage) {
      const steps = Math.max(1, Math.ceil(dist / (radius * 0.4)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const curX = x0 + dx * t;
        const curY = y0 + dy * t;

        ctx.save();
        ctx.beginPath();
        ctx.arc(curX, curY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(originalImage, 0, 0);
        ctx.restore();
      }
    }
  };

  // Dynamic cursor style
  let cursorClass = 'cursor-default';
  if (spacePressed || isPanning || currentTool === 'pan') {
    cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';
  } else if (currentTool === 'magic-erase') {
    cursorClass = 'cursor-crosshair';
  } else if (currentTool === 'brush-erase' || currentTool === 'restore-brush') {
    cursorClass = 'cursor-none';
  } else if (currentTool === 'crop') {
    cursorClass = 'cursor-default';
  }

  const canvasWidth = canvasRef.current?.width || 0;
  const canvasHeight = canvasRef.current?.height || 0;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setCursorPos(null);
      }}
      className={`flex-1 relative overflow-hidden select-none bg-[#0f1012] ${cursorClass}`}
    >
      {/* Canvas Viewport Surface */}
      <div
        className="absolute transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        {/* Background Layer */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            previewBackground === 'checkerboard'
              ? 'bg-checkerboard'
              : previewBackground === 'white'
              ? 'bg-white'
              : previewBackground === 'dark'
              ? 'bg-black'
              : ''
          }`}
          style={{
            backgroundColor: previewBackground === 'custom' ? customBgColor : undefined,
          }}
        />

        {/* Primary Editable Canvas */}
        <canvas
          ref={canvasRef}
          className="relative block shadow-none"
          style={{
            imageRendering: zoom >= 2.0 ? 'pixelated' : 'auto',
          }}
        />

        {/* Split Comparison Curtain */}
        {isSplitView && originalImage && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              clipPath: `inset(0 ${100 - splitPos}% 0 0)`,
            }}
          >
            <img
              src={originalImage.src}
              alt="Original Comparison"
              className="w-full h-full object-fill block"
            />
          </div>
        )}

        {/* Hold to Show Original Preview */}
        {showOriginal && originalImage && (
          <img
            src={originalImage.src}
            alt="Original"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />
        )}

        {/* ADVANCED INTERACTIVE CROP BOX OVERLAY */}
        {currentTool === 'crop' && cropRect && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dimmed Outside Mask */}
            <div
              className="absolute bg-black/60 pointer-events-auto"
              style={{ top: 0, left: 0, right: 0, height: cropRect.y }}
            />
            <div
              className="absolute bg-black/60 pointer-events-auto"
              style={{
                top: cropRect.y + cropRect.height,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-auto"
              style={{
                top: cropRect.y,
                left: 0,
                width: cropRect.x,
                height: cropRect.height,
              }}
            />
            <div
              className="absolute bg-black/60 pointer-events-auto"
              style={{
                top: cropRect.y,
                left: cropRect.x + cropRect.width,
                right: 0,
                height: cropRect.height,
              }}
            />

            {/* Crop Boundary Box */}
            <div
              onMouseDown={(e) => startCropDrag('move', e)}
              className="absolute border border-white pointer-events-auto cursor-move select-none"
              style={{
                left: cropRect.x,
                top: cropRect.y,
                width: cropRect.width,
                height: cropRect.height,
              }}
            >
              {/* Rule of Thirds 3x3 Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 border-r border-white/25" />
                <div className="absolute left-2/3 top-0 bottom-0 border-r border-white/25" />
                <div className="absolute top-1/3 left-0 right-0 border-b border-white/25" />
                <div className="absolute top-2/3 left-0 right-0 border-b border-white/25" />
              </div>

              {/* Dimension HUD Badge */}
              <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-[9px] pointer-events-none whitespace-nowrap">
                {Math.round(cropRect.width)} × {Math.round(cropRect.height)} px
              </div>

              {/* 8 Draggable Corner and Edge Handles */}
              {/* Corners */}
              <div
                onMouseDown={(e) => startCropDrag('nw', e)}
                className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-zinc-900 cursor-nwse-resize"
              />
              <div
                onMouseDown={(e) => startCropDrag('ne', e)}
                className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-zinc-900 cursor-nesw-resize"
              />
              <div
                onMouseDown={(e) => startCropDrag('sw', e)}
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-zinc-900 cursor-nesw-resize"
              />
              <div
                onMouseDown={(e) => startCropDrag('se', e)}
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-zinc-900 cursor-nwse-resize"
              />

              {/* Edges */}
              <div
                onMouseDown={(e) => startCropDrag('n', e)}
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-zinc-900 cursor-ns-resize"
              />
              <div
                onMouseDown={(e) => startCropDrag('s', e)}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-zinc-900 cursor-ns-resize"
              />
              <div
                onMouseDown={(e) => startCropDrag('w', e)}
                className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-white border border-zinc-900 cursor-ew-resize"
              />
              <div
                onMouseDown={(e) => startCropDrag('e', e)}
                className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-white border border-zinc-900 cursor-ew-resize"
              />
            </div>
          </div>
        )}
      </div>

      {/* Interactive Split Bar Overlay Handle */}
      {isSplitView && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingSplit(true);
          }}
          className="absolute top-0 bottom-0 z-30 cursor-ew-resize flex items-center justify-center group"
          style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-[1px] h-full bg-white/70" />
          <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-400 text-white flex items-center justify-center absolute shadow-sm text-[10px] font-mono">
            ↔
          </div>
        </div>
      )}

      {/* Precision Circular Brush Cursor Indicator */}
      {cursorPos && (currentTool === 'brush-erase' || currentTool === 'restore-brush') && (
        <div
          className="fixed pointer-events-none rounded-full border border-zinc-300 z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: brushSize * zoom,
            height: brushSize * zoom,
            backgroundColor:
              currentTool === 'brush-erase' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          }}
        />
      )}
    </div>
  );
};
