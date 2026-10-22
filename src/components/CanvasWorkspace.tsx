import React, { useRef, useEffect, useState } from 'react';
import { ToolType } from '../types';
import { performMagicErase } from '../hooks/useMagicErase';
import { Split } from 'lucide-react';

interface CanvasWorkspaceProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  originalImage: HTMLImageElement | null;
  cutoutImage: HTMLImageElement | null;
  currentTool: ToolType;
  tolerance: number;
  contiguous: boolean;
  brushSize: number;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  previewBackground: 'checkerboard' | 'white' | 'dark' | 'custom';
  customBgColor: string;
  showOriginal: boolean;
  isSplitView: boolean;
  onPushHistoryState: (imageData: ImageData) => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  canvasRef,
  originalImage,
  cutoutImage,
  currentTool,
  tolerance,
  contiguous,
  brushSize,
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

  const lastPanPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastDrawPoint = useRef<{ x: number; y: number } | null>(null);

  // Keyboard Space listener for quick Pan mode
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

  // Calculate Auto-Fit to Screen when a new cutout loads
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

    // Center image in the viewport
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
      const dx = mouseX - pan.x;
      const dy = mouseY - pan.y;
      const newPanX = mouseX - dx * (newZoom / zoom);
      const newPanY = mouseY - dy * (newZoom / zoom);
      setPan({ x: newPanX, y: newPanY });
    }

    onZoomChange(newZoom);
  };

  // Convert client viewport coordinates to exact canvas pixel coordinates
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const containerRect = container.getBoundingClientRect();
    const imgX = (clientX - containerRect.left - pan.x) / zoom;
    const imgY = (clientY - containerRect.top - pan.y) / zoom;

    if (imgX < 0 || imgX >= canvas.width || imgY < 0 || imgY >= canvas.height) {
      return null;
    }

    return { x: Math.floor(imgX), y: Math.floor(imgY) };
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDraggingSplit) return;

    // Pan with middle click, Spacebar held, or Pan tool
    if (e.button === 1 || spacePressed || currentTool === 'pan') {
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return; // Only primary left-click for editing

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    if (currentTool === 'magic-erase') {
      const updated = performMagicErase(ctx, canvas.width, canvas.height, coords.x, coords.y, {
        tolerance,
        contiguous,
      });
      if (updated) {
        onPushHistoryState(updated);
      }
    } else if (currentTool === 'brush-erase' || currentTool === 'restore-brush') {
      setIsDrawing(true);
      lastDrawPoint.current = coords;
      drawBrushStroke(coords.x, coords.y);
    }
  };

  // Drawing Brush / Restore Stroke
  const drawBrushStroke = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (currentTool === 'brush-erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();

      if (lastDrawPoint.current) {
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lastDrawPoint.current.x, lastDrawPoint.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if (currentTool === 'restore-brush' && originalImage) {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    }
    ctx.restore();

    lastDrawPoint.current = { x, y };
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });

    if (isDraggingSplit && containerRef.current && canvasRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const canvasLeft = containerRect.left + pan.x;
      const canvasWidth = canvasRef.current.width * zoom;
      const relativeX = e.clientX - canvasLeft;
      const percent = Math.min(Math.max(0, (relativeX / canvasWidth) * 100), 100);
      setSplitPos(percent);
      return;
    }

    if (isPanning) {
      const dx = e.clientX - lastPanPoint.current.x;
      const dy = e.clientY - lastPanPoint.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawing) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords) {
        drawBrushStroke(coords.x, coords.y);
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDraggingSplit) setIsDraggingSplit(false);

    if (isDrawing) {
      setIsDrawing(false);
      lastDrawPoint.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          onPushHistoryState(snapshot);
        }
      }
    }
  };

  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (spacePressed || currentTool === 'pan') return 'cursor-grab';
    if (currentTool === 'magic-erase') return 'cursor-crosshair';
    if (currentTool === 'brush-erase' || currentTool === 'restore-brush') return 'cursor-none';
    return 'cursor-default';
  };

  const getBackgroundStyle = () => {
    switch (previewBackground) {
      case 'white':
        return { backgroundColor: '#ffffff' };
      case 'dark':
        return { backgroundColor: '#12141c' };
      case 'custom':
        return { backgroundColor: customBgColor };
      case 'checkerboard':
      default:
        return {};
    }
  };

  const imgWidth = canvasRef.current?.width || cutoutImage?.naturalWidth || 600;
  const imgHeight = canvasRef.current?.height || cutoutImage?.naturalHeight || 400;

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        setIsDrawing(false);
        setIsDraggingSplit(false);
        setCursorPos(null);
      }}
      className={`flex-1 relative overflow-hidden bg-[#090a0f] select-none ${getCursorClass()}`}
    >
      {/* Canvas Viewport Plane (No CSS transition lag for instant precision) */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          className={`shadow-2xl border border-[#262a36] rounded relative overflow-hidden ${
            previewBackground === 'checkerboard' ? 'bg-checkerboard' : ''
          }`}
          style={{
            ...getBackgroundStyle(),
            width: `${imgWidth * zoom}px`,
            height: `${imgHeight * zoom}px`,
          }}
        >
          {/* Main Cutout Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              width: `${imgWidth * zoom}px`,
              height: `${imgHeight * zoom}px`,
              display: showOriginal && !isSplitView ? 'none' : 'block',
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
            }}
          />

          {/* Full Original Image (When "Compare with Original" toggled) */}
          {originalImage && showOriginal && !isSplitView && (
            <img
              src={originalImage.src}
              alt="Original"
              style={{
                width: `${imgWidth * zoom}px`,
                height: `${imgHeight * zoom}px`,
                display: 'block',
              }}
            />
          )}

          {/* Split Slider View (Interactive Before / After curtain) */}
          {originalImage && isSplitView && (
            <>
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{
                  clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)`,
                }}
              >
                <img
                  src={originalImage.src}
                  alt="Original"
                  style={{
                    width: `${imgWidth * zoom}px`,
                    height: `${imgHeight * zoom}px`,
                    display: 'block',
                  }}
                />
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-zinc-300">
                  Before
                </div>
              </div>

              {/* Split Line & Handle */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingSplit(true);
                }}
                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-30 group"
                style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-600 border border-white text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Split className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-zinc-300 pointer-events-none">
                After
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Brush Ring Cursor */}
      {(currentTool === 'brush-erase' || currentTool === 'restore-brush') &&
        cursorPos &&
        !isPanning &&
        !spacePressed && (
          <div
            className="pointer-events-none fixed rounded-full border border-blue-400 bg-blue-500/20 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-none"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              width: `${brushSize * zoom}px`,
              height: `${brushSize * zoom}px`,
            }}
          />
        )}
    </main>
  );
};
