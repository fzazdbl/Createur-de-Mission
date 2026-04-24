/**
 * LiquidGlassEngine - Premium Light Theme Edition
 * Handles high-fidelity Snell-Descartes refraction and specular highlights mapping.
 */
export type MapType = 'Circle' | 'Squircle' | 'Lips';

export interface MapOptions {
  width: number;
  height: number;
  n1?: number;
  n2: number;       // Refraction index (standard glass is 1.5 - 1.6)
  bezel: number;    // Bezel width in pixels
  intensity: number; // Specular light intensity
  specularExponent?: number;
  maxShift?: number;
  type: MapType;
}

export interface LiquidGlassAssetOptions {
  width: number;
  height: number;
  n1: number;
  n2: number;
  bezelWidthPx: number;
  surfaceHeightPx: number;
  surfaceType: 'convex-circle' | 'convex-squircle' | 'convex-lips';
  specularIntensity: number;
  specularExponent: number;
}

export interface LiquidGlassAssets {
  displacementMapDataUrl: string;
  highlightMapDataUrl: string;
  maximumDisplacement: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function generateMaps(options: MapOptions): { displacement: string, highlight: string } {
  const { width, height, n1 = 1.0, n2, bezel, intensity, specularExponent = 24, maxShift = 45, type } = options;
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. DISPLACEMENT MAP (Refraction)
  // R = dX, G = dY
  const dispData = ctx.createImageData(width, height);
  // 2. HIGHLIGHT MAP (Specular)
  // Gray = brightness
  const highData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      // Calculate normalized coordinates (-1 to 1)
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;

      // Distance from center for height function
      let d = 0;
      if (type === 'Circle') {
        d = Math.sqrt(nx * nx + ny * ny);
      } else if (type === 'Squircle') {
        d = Math.pow(Math.pow(nx, 4) + Math.pow(ny, 4), 1/4);
      } else if (type === 'Lips') {
        d = Math.sqrt(nx * nx + ny * ny * 1.5);
      }

      // Height function H(d) - "Glass dome"
      const bezelNorm = bezel / (Math.min(width, height) / 2);
      const h = d < (1 - bezelNorm) ? 1 : Math.cos(((d - (1 - bezelNorm)) / bezelNorm) * (Math.PI / 2));

      // Calculate Gradients (Normal vector)
      const eps = 0.01;
      const d2 = type === 'Circle' ? Math.sqrt((nx+eps)*(nx+eps) + ny*ny) : Math.pow(Math.pow(nx+eps,4)+Math.pow(ny,4), 1/4);
      const h2 = d2 < (1 - bezelNorm) ? 1 : Math.cos(((Math.max(0, d2 - (1 - bezelNorm))) / bezelNorm) * (Math.PI / 2));
      
      const d3 = type === 'Circle' ? Math.sqrt(nx*nx + (ny+eps)*(ny+eps)) : Math.pow(Math.pow(nx,4)+Math.pow(ny+eps,4), 1/4);
      const h3 = d3 < (1 - bezelNorm) ? 1 : Math.cos(((Math.max(0, d3 - (1 - bezelNorm))) / bezelNorm) * (Math.PI / 2));

      const dhdx = (h2 - h) / eps;
      const dhdy = (h3 - h) / eps;

      // Refraction
      const shiftX = dhdx * (n2 - n1) * maxShift;
      const shiftY = dhdy * (n2 - n1) * maxShift;

      dispData.data[idx]   = clamp(127 + shiftX, 0, 255);
      dispData.data[idx+1] = clamp(127 + shiftY, 0, 255);
      dispData.data[idx+2] = 0;
      dispData.data[idx+3] = 255;

      // Specular Highlight
      const lx = -0.7, ly = -0.7, lz = 1;
      const nx_val = dhdx, ny_val = dhdy, nz_val = 1;
      const mag = Math.sqrt(nx_val * nx_val + ny_val * ny_val + nz_val * nz_val);
      const dot = (lx * (nx_val/mag) + ly * (ny_val/mag) + lz * (nz_val/mag));
      const spec = Math.pow(Math.max(0, dot), specularExponent) * intensity;

      const color = clamp(180 + spec, 0, 255);
      highData.data[idx] = color;
      highData.data[idx + 1] = color;
      highData.data[idx + 2] = color;
      highData.data[idx + 3] = clamp(spec * 1.5, 0, 255);
    }
  }

  ctx.putImageData(dispData, 0, 0);
  const displacement = canvas.toDataURL();

  ctx.putImageData(highData, 0, 0);
  const highlight = canvas.toDataURL();

  return { displacement, highlight };
}

export function buildLiquidGlassAssets(options: LiquidGlassAssetOptions): LiquidGlassAssets {
  const mapType: MapType = options.surfaceType === 'convex-circle'
    ? 'Circle'
    : options.surfaceType === 'convex-lips'
      ? 'Lips'
      : 'Squircle';

  const computedMaxShift = clamp(
    Math.abs(options.n2 - options.n1) * (options.bezelWidthPx * 0.9 + options.surfaceHeightPx * 0.8),
    8,
    64,
  );

  const { displacement, highlight } = generateMaps({
    width: options.width,
    height: options.height,
    n1: options.n1,
    n2: options.n2,
    bezel: options.bezelWidthPx,
    intensity: options.specularIntensity,
    specularExponent: options.specularExponent,
    maxShift: computedMaxShift,
    type: mapType,
  });

  return {
    displacementMapDataUrl: displacement,
    highlightMapDataUrl: highlight,
    maximumDisplacement: computedMaxShift,
  };
}
