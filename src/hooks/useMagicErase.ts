/**
 * High-performance Flood Fill & Color Match Magic Eraser for HTML5 Canvas.
 * Supports:
 * 1. Contiguous (connected BFS flood-fill with tolerance).
 * 2. Global (all matching color pixels across image).
 * 3. Fast squared-distance color matching avoiding Math.sqrt overhead.
 */

export interface MagicEraseOptions {
  tolerance: number; // 0 to 100
  contiguous: boolean;
  feather?: number; // feather edge radius
}

/**
 * Universal performMagicErase function supporting both:
 * 1. performMagicErase(canvas, startX, startY, tolerance, contiguous)
 * 2. performMagicErase(ctx, width, height, startX, startY, options)
 */
export function performMagicErase(
  canvasOrCtx: HTMLCanvasElement | CanvasRenderingContext2D,
  arg2: number,
  arg3: number,
  arg4?: number | MagicEraseOptions,
  arg5?: number | boolean,
  arg6?: MagicEraseOptions
): ImageData | null {
  let ctx: CanvasRenderingContext2D | null;
  let width: number;
  let height: number;
  let startX: number;
  let startY: number;
  let tolerance = 20;
  let contiguous = true;

  if (canvasOrCtx instanceof HTMLCanvasElement) {
    ctx = canvasOrCtx.getContext('2d');
    width = canvasOrCtx.width;
    height = canvasOrCtx.height;
    startX = Math.round(arg2);
    startY = Math.round(arg3);

    if (typeof arg4 === 'number') {
      tolerance = arg4;
    } else if (arg4 && typeof arg4 === 'object') {
      tolerance = arg4.tolerance ?? 20;
      contiguous = arg4.contiguous ?? true;
    }

    if (typeof arg5 === 'boolean') {
      contiguous = arg5;
    }
  } else {
    ctx = canvasOrCtx;
    width = Math.round(arg2);
    height = Math.round(arg3);
    startX = Math.round(arg4 as number);
    startY = Math.round(arg5 as number);

    if (arg6 && typeof arg6 === 'object') {
      tolerance = arg6.tolerance ?? 20;
      contiguous = arg6.contiguous ?? true;
    }
  }

  if (!ctx || width <= 0 || height <= 0) {
    return null;
  }

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Target clicked pixel RGBA
  let targetIdx = (startY * width + startX) * 4;
  let targetA = data[targetIdx + 3];

  // If clicked directly on a transparent pixel, search nearby (radius 2) for closest opaque pixel
  if (targetA === 0) {
    let found = false;
    for (let r = 1; r <= 3 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = startX + dx;
          const ny = startY + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            if (data[idx + 3] > 0) {
              startX = nx;
              startY = ny;
              targetIdx = idx;
              targetA = data[idx + 3];
              found = true;
            }
          }
        }
      }
    }
    // If still transparent, nothing to erase
    if (!found) {
      return null;
    }
  }

  const targetR = data[targetIdx];
  const targetG = data[targetIdx + 1];
  const targetB = data[targetIdx + 2];

  // Tolerance: 0 to 100 mapped to color Euclidean distance squared (max is 3 * 255^2 = 195075)
  // Max Euclidean distance is ~441.67.
  const effectiveTol = Math.max(1, tolerance);
  const maxColorDist = (effectiveTol / 100) * 441.67;
  const maxColorDistSq = maxColorDist * maxColorDist;

  const totalPixels = width * height;

  if (!contiguous) {
    // GLOBAL COLOR MATCH: Iterate through all pixels and erase matching
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const alpha = data[idx + 3];
      if (alpha === 0) continue;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const dR = r - targetR;
      const dG = g - targetG;
      const dB = b - targetB;
      const distSq = dR * dR + dG * dG + dB * dB;

      if (distSq <= maxColorDistSq) {
        data[idx + 3] = 0; // Erase
      }
    }
  } else {
    // CONTIGUOUS BFS FLOOD FILL:
    const queue = new Int32Array(totalPixels);
    const visited = new Uint8Array(totalPixels);
    let head = 0;
    let tail = 0;

    const startPixel = startY * width + startX;
    queue[tail++] = startPixel;
    visited[startPixel] = 1;

    // 4-directional offsets
    const dx = [0, 0, -1, 1];
    const dy = [-1, 1, 0, 0];

    while (head < tail) {
      const currentPixel = queue[head++];
      const cx = currentPixel % width;
      const cy = (currentPixel / width) | 0;
      const cIdx = currentPixel * 4;

      // Erase this connected matching pixel
      data[cIdx + 3] = 0;

      // Check 4 neighbors
      for (let i = 0; i < 4; i++) {
        const nx = cx + dx[i];
        const ny = cy + dy[i];

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nPixel = ny * width + nx;
          if (visited[nPixel] === 0) {
            visited[nPixel] = 1;
            const nIdx = nPixel * 4;
            const nA = data[nIdx + 3];

            // Only visit non-transparent pixels
            if (nA > 0) {
              const nR = data[nIdx];
              const nG = data[nIdx + 1];
              const nB = data[nIdx + 2];

              const dR = nR - targetR;
              const dG = nG - targetG;
              const dB = nB - targetB;
              const distSq = dR * dR + dG * dG + dB * dB;

              if (distSq <= maxColorDistSq) {
                queue[tail++] = nPixel;
              }
            }
          }
        }
      }
    }
  }

  // Write changes back to the canvas context
  ctx.putImageData(imageData, 0, 0);
  return imageData;
}
