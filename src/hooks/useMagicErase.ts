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

export function performMagicErase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startX: number,
  startY: number,
  options: MagicEraseOptions
): ImageData | null {
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Target clicked pixel RGBA
  const targetIdx = (startY * width + startX) * 4;
  const targetR = data[targetIdx];
  const targetG = data[targetIdx + 1];
  const targetB = data[targetIdx + 2];
  const targetA = data[targetIdx + 3];

  // If clicked on fully transparent pixel, nothing to erase
  if (targetA === 0) {
    return null;
  }

  // Tolerance: 0 to 100 mapped to color Euclidean distance squared (max is 3 * 255^2 = 195075)
  // Max distance is ~441.67.
  const maxColorDist = (options.tolerance / 100) * 441.67;
  const maxColorDistSq = maxColorDist * maxColorDist;

  const totalPixels = width * height;

  if (!options.contiguous) {
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
    // Preallocated circular buffer/queue for high performance without GC spikes
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
      const cy = Math.floor(currentPixel / width);
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
