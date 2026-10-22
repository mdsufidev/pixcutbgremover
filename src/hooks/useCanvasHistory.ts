import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY_STEPS = 25;

export function useCanvasHistory() {
  const [historyLength, setHistoryLength] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // We store states in a ref to avoid excessive re-renders while keeping array immutable
  const historyRef = useRef<ImageData[]>([]);

  const pushState = useCallback((imageData: ImageData) => {
    // Clone imageData so future canvas mutations do not mutate this snapshot
    const copy = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    const nextIndex = currentIndex + 1;
    // Truncate any redo future
    const newHistory = historyRef.current.slice(0, nextIndex);
    newHistory.push(copy);

    // Limit maximum steps to avoid memory exhaustion
    if (newHistory.length > MAX_HISTORY_STEPS) {
      newHistory.shift();
    }

    historyRef.current = newHistory;
    const finalIndex = newHistory.length - 1;
    setCurrentIndex(finalIndex);
    setHistoryLength(newHistory.length);
  }, [currentIndex]);

  const undo = useCallback((): ImageData | null => {
    if (currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      setCurrentIndex(targetIndex);
      return historyRef.current[targetIndex];
    }
    return null;
  }, [currentIndex]);

  const redo = useCallback((): ImageData | null => {
    if (currentIndex < historyRef.current.length - 1) {
      const targetIndex = currentIndex + 1;
      setCurrentIndex(targetIndex);
      return historyRef.current[targetIndex];
    }
    return null;
  }, [currentIndex]);

  const reset = useCallback((initialState?: ImageData) => {
    if (initialState) {
      const copy = new ImageData(
        new Uint8ClampedArray(initialState.data),
        initialState.width,
        initialState.height
      );
      historyRef.current = [copy];
      setCurrentIndex(0);
      setHistoryLength(1);
    } else {
      historyRef.current = [];
      setCurrentIndex(-1);
      setHistoryLength(0);
    }
  }, []);

  const getCurrentSnapshot = useCallback((): ImageData | null => {
    if (currentIndex >= 0 && currentIndex < historyRef.current.length) {
      return historyRef.current[currentIndex];
    }
    return null;
  }, [currentIndex]);

  return {
    pushState,
    undo,
    redo,
    reset,
    getCurrentSnapshot,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < historyLength - 1,
    stepCount: historyLength,
    currentStep: currentIndex + 1,
  };
}
