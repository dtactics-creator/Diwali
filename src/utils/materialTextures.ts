import * as THREE from 'three';

/**
 * Shared procedural PBR texture pipeline.
 *
 * All surface detail (normal + roughness maps) is generated on the client as
 * small, power-of-two canvas textures so that no extra binary assets or
 * dependencies are required. Textures are memoised by a composite key so the
 * same GPU texture is reused across every material that needs it (character,
 * crackers, road surface, ...) which keeps mobile memory low.
 *
 * Colour-space rules (three.js r152+):
 *   - Colour maps (map / emissiveMap) MUST be tagged SRGBColorSpace.
 *   - Data maps (normalMap / roughnessMap / metalnessMap / aoMap) MUST stay in
 *     NoColorSpace (linear), otherwise lighting maths breaks.
 */

export type MaterialSurface =
  | 'fabric'
  | 'denim'
  | 'skin'
  | 'hair'
  | 'leather'
  | 'asphalt'
  | 'concrete'
  | 'paper'
  | 'cardboard'
  | 'foil'
  | 'plastic'
  | 'brushedMetal';

export interface TextureOptions {
  /** Square texture resolution. Keep power-of-two for clean mipmapping. */
  size: number;
  repeatX?: number;
  repeatY?: number;
  /** Renderer anisotropy budget (clamped by the GPU at upload time). */
  anisotropy?: number;
}

// ─── Internal caches ─────────────────────────────────────────────────────────

const heightCanvasCache = new Map<string, HTMLCanvasElement>();
const noiseCanvasCache = new Map<string, HTMLCanvasElement>();
const textureCache = new Map<string, THREE.Texture>();

// ─── Small deterministic helpers ─────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/** Smooth value-noise (fBm) canvas in grayscale — the base for most surfaces. */
function noiseCanvas(size: number, cells: number, seed: number, octaves = 4): HTMLCanvasElement {
  const key = `n:${size}:${cells}:${seed}:${octaves}`;
  const cached = noiseCanvasCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const rnd = mulberry32(seed);

  const layers: { n: number; grid: Float32Array }[] = [];
  let f = cells;
  for (let o = 0; o < octaves; o++) {
    const n = Math.max(2, Math.round(f));
    const grid = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) grid[i] = rnd();
    layers.push({ n, grid });
    f *= 2;
  }

  const sample = (n: number, grid: Float32Array, x: number, y: number) => {
    const gx = x * n;
    const gy = y * n;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = gx - x0;
    const ty = gy - y0;
    const g = (xx: number, yy: number) => grid[(((yy % n) + n) % n) * n + (((xx % n) + n) % n)];
    const a = g(x0, y0);
    const b = g(x0 + 1, y0);
    const c = g(x0, y0 + 1);
    const d = g(x0 + 1, y0 + 1);
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };

  let i = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      let amp = 1;
      let total = 0;
      for (let o = 0; o < layers.length; o++) {
        v += sample(layers[o].n, layers[o].grid, x / size, y / size) * amp;
        total += amp;
        amp *= 0.5;
      }
      const gray = Math.round(Math.min(1, Math.max(0, v / total)) * 255);
      img.data[i++] = gray;
      img.data[i++] = gray;
      img.data[i++] = gray;
      img.data[i++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  noiseCanvasCache.set(key, canvas);
  return canvas;
}

// ─── Surface height painters (mid-gray = neutral, white = raised) ────────────

type HeightPainter = (ctx: CanvasRenderingContext2D, size: number, rnd: () => number) => void;

const HEIGHT_PAINTERS: Record<MaterialSurface, HeightPainter> = {
  // Knitted hoodie weave: interlocking vertical ribs + horizontal yarn rows.
  fabric: (ctx, s) => {
    const step = s / 18;
    ctx.lineWidth = Math.max(1, s / 256);
    for (let x = 0; x <= s; x += step) {
      ctx.beginPath();
      for (let y = 0; y <= s; y += 2) ctx.lineTo(x + Math.sin(y * 0.32) * 1.4, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.26)';
      ctx.stroke();
      ctx.beginPath();
      for (let y = 0; y <= s; y += 2) ctx.lineTo(x + step * 0.5 + Math.sin(y * 0.32 + 1.7) * 1.4, y);
      ctx.strokeStyle = 'rgba(0,0,0,0.24)';
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, s / 200);
    for (let y = 0; y <= s; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.stroke();
    }
  },

  // Denim twill: 45° diagonal warp threads with a faint weft crossing.
  denim: (ctx, s, rnd) => {
    ctx.lineWidth = Math.max(1, s / 300);
    for (let i = -s; i < s * 2; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.17)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + 1.5, 0);
      ctx.lineTo(i + 1.5 + s, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.19)';
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, s / 400);
    for (let y = 0; y < s; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + rnd() * 0.04})`;
      ctx.stroke();
    }
  },

  // Skin: micro pores with a low-frequency bump so light breaks softly.
  skin: (ctx, s, rnd) => {
    for (let i = 0; i < s * 6; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const r = 0.5 + rnd() * 1.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.26)';
      ctx.fill();
    }
  },

  // Hair: directional strand flow for anisotropic specular breakup.
  hair: (ctx, s, rnd) => {
    ctx.lineWidth = Math.max(1, s / 340);
    for (let x = 0; x <= s; x += Math.max(2, s / 90)) {
      ctx.beginPath();
      let px = x;
      for (let y = 0; y <= s; y += 3) {
        px += (rnd() - 0.5) * 1.6;
        ctx.lineTo(px, y);
      }
      ctx.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.32)';
      ctx.stroke();
    }
  },

  // Leather / synthetic shoe upper: cellular grain.
  leather: (ctx, s, rnd) => {
    for (let i = 0; i < s * 3; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const r = 2 + rnd() * 6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.24)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // Asphalt: coarse aggregate bumps + hairline cracks.
  asphalt: (ctx, s, rnd) => {
    for (let i = 0; i < s * 5; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const r = 0.8 + rnd() * 3.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rnd() > 0.45 ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)';
      ctx.fill();
    }
    ctx.lineWidth = Math.max(1, s / 300);
    for (let c = 0; c < 26; c++) {
      ctx.beginPath();
      let x = rnd() * s;
      let y = rnd() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * s * 0.12;
        y += (rnd() - 0.5) * s * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.34)';
      ctx.stroke();
    }
  },

  // Concrete / pavement / terracotta: smoother with occasional pores.
  concrete: (ctx, s, rnd) => {
    for (let i = 0; i < s * 2; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const r = 0.6 + rnd() * 2.0;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.20)';
      ctx.fill();
    }
  },

  // Printed label paper: faint fibres.
  paper: (ctx, s, rnd) => {
    ctx.lineWidth = Math.max(1, s / 420);
    for (let i = 0; i < s * 4; i++) {
      const x = rnd() * s;
      const y = rnd() * s;
      const a = rnd() * Math.PI;
      const len = 2 + rnd() * 6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.16)';
      ctx.stroke();
    }
  },

  // Greyboard packaging: corrugated flutes + paper grain.
  cardboard: (ctx, s, rnd) => {
    const step = s / 26;
    ctx.lineWidth = Math.max(1, s / 280);
    for (let x = 0; x <= s; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + step * 0.5, 0);
      ctx.lineTo(x + step * 0.5, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.20)';
      ctx.stroke();
    }
    HEIGHT_PAINTERS.paper(ctx, s, rnd);
  },

  // Metallic foil: soft crumple creases (kept subtle so it stays a foil, not chrome).
  foil: (ctx, s, rnd) => {
    ctx.lineWidth = Math.max(1, s / 320);
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      let x = rnd() * s;
      let y = 0;
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        y += s / 8;
        x += (rnd() - 0.5) * s * 0.14;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      let x = 0;
      let y = rnd() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += s / 8;
        y += (rnd() - 0.5) * s * 0.14;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.13)';
      ctx.stroke();
    }
  },

  // Plastic wrap / laminated film: soft large crinkles, glossy and smooth.
  plastic: (ctx, s, rnd) => {
    ctx.lineWidth = Math.max(1, s / 300);
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      let x = rnd() * s;
      let y = rnd() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (rnd() - 0.5) * s * 0.22;
        y += (rnd() - 0.5) * s * 0.22;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)';
      ctx.stroke();
    }
  },

  // Brushed metal: fine circumferential streaks.
  brushedMetal: (ctx, s, rnd) => {
    ctx.lineWidth = Math.max(1, s / 512);
    for (let y = 0; y < s; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.strokeStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + rnd() * 0.10})`;
      ctx.stroke();
    }
  },
};

/** Builds (and caches) the greyscale height canvas for a given surface. */
function getHeightCanvas(surface: MaterialSurface, size: number): HTMLCanvasElement {
  const key = `h:${surface}:${size}`;
  const cached = heightCanvasCache.get(key);
  if (cached) return cached;

  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const rnd = mulberry32(surface.length * 977 + size);
  HEIGHT_PAINTERS[surface](ctx, size, rnd);

  // Micro-detail overlay so no surface reads as a flat ramp.
  ctx.globalAlpha = surface === 'foil' || surface === 'brushedMetal' ? 0.12 : 0.42;
  ctx.drawImage(noiseCanvas(size, Math.max(3, size / 12), surface.length * 31 + size, 3), 0, 0);
  ctx.globalAlpha = 1;

  heightCanvasCache.set(key, canvas);
  return canvas;
}

/** Converts a height canvas into a tangent-space normal map canvas (Sobel). */
function heightToNormalCanvas(height: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const size = height.width;
  const src = height.getContext('2d')!.getImageData(0, 0, size, size).data;
  const [canvas, ctx] = makeCanvas(size);
  const out = ctx.createImageData(size, size);

  const at = (x: number, y: number) => {
    const xx = (x + size) % size;
    const yy = (y + size) % size;
    return src[(yy * size + xx) * 4] / 255;
  };

  let i = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      out.data[i++] = Math.round((nx * 0.5 + 0.5) * 255);
      out.data[i++] = Math.round((ny * 0.5 + 0.5) * 255);
      out.data[i++] = Math.round((nz * 0.5 + 0.5) * 255);
      out.data[i++] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/**
 * Converts a height canvas into a roughness canvas biased around white (1.0),
 * so `material.roughness` keeps acting as the artistic base value while the map
 * only modulates it (three multiplies roughness x roughnessMap).
 */
function heightToRoughnessCanvas(
  height: HTMLCanvasElement,
  variation: number,
  bias: number
): HTMLCanvasElement {
  const size = height.width;
  const src = height.getContext('2d')!.getImageData(0, 0, size, size).data;
  const [canvas, ctx] = makeCanvas(size);
  const out = ctx.createImageData(size, size);

  let i = 0;
  for (let p = 0; p < size * size; p++) {
    const v = src[p * 4] / 255;
    const r = Math.min(1, Math.max(0.28, bias + (v - 0.5) * variation));
    const g = Math.round(r * 255);
    out.data[i++] = g;
    out.data[i++] = g;
    out.data[i++] = g;
    out.data[i++] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

// ─── Texture factories ───────────────────────────────────────────────────────

function applyOptions(tex: THREE.CanvasTexture, opts: TextureOptions): THREE.CanvasTexture {
  const rx = opts.repeatX ?? 1;
  const ry = opts.repeatY ?? 1;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = opts.anisotropy ?? 1;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Tangent-space normal map. `normalMap` is a linear (NoColorSpace) data texture.
 */
export function getSurfaceNormalMap(
  surface: MaterialSurface,
  opts: TextureOptions,
  strength = 1
): THREE.CanvasTexture {
  const key = `nrm:${surface}:${opts.size}:${opts.repeatX ?? 1}:${opts.repeatY ?? 1}:${opts.anisotropy ?? 1}:${strength}`;
  const cached = textureCache.get(key);
  if (cached) return cached as THREE.CanvasTexture;

  const height = getHeightCanvas(surface, opts.size);
  const canvas = heightToNormalCanvas(height, strength * 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.name = `normal_${surface}`;
  tex.colorSpace = THREE.NoColorSpace;
  applyOptions(tex, opts);
  textureCache.set(key, tex);
  return tex;
}

/**
 * Roughness map biased around 1.0 so `material.roughness` remains the base value.
 */
export function getSurfaceRoughnessMap(
  surface: MaterialSurface,
  opts: TextureOptions,
  variation = 0.45,
  bias = 1
): THREE.CanvasTexture {
  const key = `rgh:${surface}:${opts.size}:${opts.repeatX ?? 1}:${opts.repeatY ?? 1}:${opts.anisotropy ?? 1}:${variation}:${bias}`;
  const cached = textureCache.get(key);
  if (cached) return cached as THREE.CanvasTexture;

  const height = getHeightCanvas(surface, opts.size);
  const canvas = heightToRoughnessCanvas(height, variation, bias);
  const tex = new THREE.CanvasTexture(canvas);
  tex.name = `roughness_${surface}`;
  tex.colorSpace = THREE.NoColorSpace;
  applyOptions(tex, opts);
  textureCache.set(key, tex);
  return tex;
}

/** Applies the sRGB colour space + filtering to a canvas colour map in place. */
export function finalizeColorMap(
  tex: THREE.CanvasTexture,
  repeatX = 1,
  repeatY = 1,
  anisotropy = 1
): THREE.CanvasTexture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Applies filtering to a linear data map (normal/roughness/metalness/ao) in place. */
export function finalizeDataMap(
  tex: THREE.CanvasTexture,
  repeatX = 1,
  repeatY = 1,
  anisotropy = 1
): THREE.CanvasTexture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
