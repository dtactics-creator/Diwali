import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CRACKERS } from '../../config/crackers';
import { audioSystem } from '../../systems/AudioSystem';
import { GraphicsConfig, PlacedCrackerInstance } from '../../types/game';
import { getCrackerWorldFusePosition } from './CrackerModels3D';

// ─── Sprite Textures ──────────────────────────────────────────────────────────

function createSparkSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  // Bright core with long radial falloff
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,252,210,0.95)');
  g.addColorStop(0.35, 'rgba(255,210,90,0.52)');
  g.addColorStop(0.72, 'rgba(255,165,30,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function createEmberSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,200,80,1)');
  g.addColorStop(0.5, 'rgba(255,100,20,0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

function createSmokeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  // Soft multi-layered smoke puff
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(210, 215, 230, 0.55)');
  g.addColorStop(0.3, 'rgba(175, 180, 200, 0.35)');
  g.addColorStop(0.65, 'rgba(130, 135, 160, 0.14)');
  g.addColorStop(1, 'rgba(80, 85, 110, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();
  // Second offset puff for irregularity
  const g2 = ctx.createRadialGradient(80, 52, 2, 80, 52, 32);
  g2.addColorStop(0, 'rgba(220, 225, 240, 0.28)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(80, 52, 32, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

// ─── Shaders ──────────────────────────────────────────────────────────────────

const SPARK_VERT = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(0.5, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const SPARK_FRAG = `
  uniform sampler2D uMap;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.015 || vAlpha <= 0.01) discard;
    gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
  }
`;

const SMOKE_VERT = `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (380.0 / max(0.5, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const SMOKE_FRAG = `
  uniform sampler2D uMap;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.01 || vAlpha <= 0.005) discard;
    gl_FragColor = vec4(vec3(0.82, 0.84, 0.9) * tex.rgb, tex.a * vAlpha);
  }
`;

// ─── Colour palettes per cracker ─────────────────────────────────────────────

const PALETTES: Record<string, { primary: string[]; secondary: string[]; ember: string[] }> = {
  phuljhadi: {
    primary: ['#fffbeb', '#fde68a', '#fbbf24', '#f59e0b', '#ffffff'],
    secondary: ['#fb923c', '#fef08a', '#ffffff'],
    ember: ['#f97316', '#fbbf24'],
  },
  'flower-pot': {
    primary: ['#fef08a', '#fbbf24', '#f97316', '#ffffff', '#fed7aa'],
    secondary: ['#34d399', '#60a5fa', '#fb7185', '#a3e635'],
    ember: ['#f97316', '#fbbf24', '#fb923c'],
  },
  chakri: {
    primary: ['#fde047', '#34d399', '#f43f5e', '#fb923c', '#38bdf8'],
    secondary: ['#ffffff', '#4ade80', '#f472b6'],
    ember: ['#10b981', '#fbbf24'],
  },
  rocket: {
    primary: ['#fbbf24', '#ef4444', '#38bdf8', '#ffffff', '#fde047'],
    secondary: ['#a855f7', '#22c55e', '#fde047', '#fb923c'],
    ember: ['#ef4444', '#fbbf24'],
  },
  'aerial-fireworks': {
    primary: ['#fbbf24', '#f43f5e', '#38bdf8', '#4ade80', '#c084fc', '#ffffff'],
    secondary: ['#fde047', '#fb923c', '#60a5fa', '#a3e635'],
    ember: ['#a855f7', '#fbbf24', '#38bdf8'],
  },
  'garland-cracker': {
    primary: ['#fef08a', '#f97316', '#ef4444', '#ffffff', '#fbbf24'],
    secondary: ['#fbbf24', '#f43f5e', '#fb923c'],
    ember: ['#ef4444', '#fb923c'],
  },
};

// ─── Particle pool sizes ──────────────────────────────────────────────────────

const MAX_SPARK = 5600;
const MAX_EMBER = 1200;
const MAX_SMOKE = 800;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParticlePool {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  baseSizes: Float32Array;
  alphas: Float32Array;
  ages: Float32Array;
  lifetimes: Float32Array;
  gravities: Float32Array;
  drags: Float32Array;
  active: Uint8Array;
  cursor: number;
}

interface SmokePool {
  positions: Float32Array;
  velocities: Float32Array;
  sizes: Float32Array;
  baseSizes: Float32Array;
  alphas: Float32Array;
  ages: Float32Array;
  lifetimes: Float32Array;
  spins: Float32Array;
  active: Uint8Array;
  cursor: number;
}

interface Tracker {
  rocketLaunched: boolean;
  rocketExploded: boolean;
  shellsFired: number;
  garlandPopsFired: number;
  chakriAngle: number;
  fuseFlashTimer: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FireworksSystem3DProps {
  placedCrackers: PlacedCrackerInstance[];
  graphics: GraphicsConfig;
  reducedFlash: boolean;
  groundY: number;
  contrastBoost: number;
  onCameraShake: (intensity: number) => void;
  onActiveParticleCountChange?: (count: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const FireworksSystem3D: React.FC<FireworksSystem3DProps> = ({
  placedCrackers,
  graphics,
  reducedFlash,
  groundY,
  contrastBoost,
  onCameraShake,
  onActiveParticleCountChange,
}) => {
  const sparkGeoRef = useRef<THREE.BufferGeometry>(null);
  const emberGeoRef = useRef<THREE.BufferGeometry>(null);
  const smokeGeoRef = useRef<THREE.BufferGeometry>(null);
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const light3Ref = useRef<THREE.PointLight>(null);

  const sparkTex = useMemo(() => createSparkSpriteTexture(), []);
  const emberTex = useMemo(() => createEmberSpriteTexture(), []);
  const smokeTex = useMemo(() => createSmokeSpriteTexture(), []);

  const sparkUniforms = useMemo(() => ({ uMap: { value: sparkTex } }), [sparkTex]);
  const emberUniforms = useMemo(() => ({ uMap: { value: emberTex } }), [emberTex]);
  const smokeUniforms = useMemo(() => ({ uMap: { value: smokeTex } }), [smokeTex]);

  const tmpColor = useMemo(() => new THREE.Color(), []);
  const lastReportRef = useRef(0);

  useEffect(() => () => {
    sparkTex.dispose();
    emberTex.dispose();
    smokeTex.dispose();
  }, [sparkTex, emberTex, smokeTex]);

  // ── Particle pools ────────────────────────────────────────────────────────

  const makePool = (max: number): ParticlePool => ({
    positions: new Float32Array(max * 3),
    velocities: new Float32Array(max * 3),
    colors: new Float32Array(max * 3),
    sizes: new Float32Array(max),
    baseSizes: new Float32Array(max),
    alphas: new Float32Array(max),
    ages: new Float32Array(max),
    lifetimes: new Float32Array(max),
    gravities: new Float32Array(max),
    drags: new Float32Array(max),
    active: new Uint8Array(max),
    cursor: 0,
  });

  const makeSmokePool = (max: number): SmokePool => ({
    positions: new Float32Array(max * 3),
    velocities: new Float32Array(max * 3),
    sizes: new Float32Array(max),
    baseSizes: new Float32Array(max),
    alphas: new Float32Array(max),
    ages: new Float32Array(max),
    lifetimes: new Float32Array(max),
    spins: new Float32Array(max),
    active: new Uint8Array(max),
    cursor: 0,
  });

  const sp = useMemo(() => makePool(MAX_SPARK), []);
  const ep = useMemo(() => makePool(MAX_EMBER), []);
  const smp = useMemo(() => makeSmokePool(MAX_SMOKE), []);

  const trackers = useRef<Record<string, Tracker>>({});

  // ── Emitters ──────────────────────────────────────────────────────────────

  const emitSpark = (
    pool: ParticlePool, max: number,
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    color: string, size: number,
    life: number, grav: number, drag: number
  ) => {
    const limit = Math.min(max, graphics.maxActiveParticles);
    const i = pool.cursor % limit;
    pool.cursor = (pool.cursor + 1) % limit;
    const i3 = i * 3;
    pool.positions[i3] = x; pool.positions[i3 + 1] = y; pool.positions[i3 + 2] = z;
    pool.velocities[i3] = vx; pool.velocities[i3 + 1] = vy; pool.velocities[i3 + 2] = vz;
    tmpColor.set(color);
    const boost = reducedFlash ? 0.82 : contrastBoost;
    pool.colors[i3] = Math.min(1, tmpColor.r * boost);
    pool.colors[i3 + 1] = Math.min(1, tmpColor.g * boost);
    pool.colors[i3 + 2] = Math.min(1, tmpColor.b * boost);
    const sz = reducedFlash ? size * 0.78 : size;
    pool.sizes[i] = sz; pool.baseSizes[i] = sz;
    pool.alphas[i] = 1; pool.ages[i] = 0;
    pool.lifetimes[i] = life;
    pool.gravities[i] = grav;
    pool.drags[i] = drag;
    pool.active[i] = 1;
  };

  const emitSmoke = (
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    size: number, life: number, density = 1
  ) => {
    if (graphics.smokeDensity <= 0.05) return;
    const i = smp.cursor % MAX_SMOKE;
    smp.cursor = (smp.cursor + 1) % MAX_SMOKE;
    const i3 = i * 3;
    smp.positions[i3] = x; smp.positions[i3 + 1] = y; smp.positions[i3 + 2] = z;
    smp.velocities[i3] = vx; smp.velocities[i3 + 1] = vy; smp.velocities[i3 + 2] = vz;
    smp.sizes[i] = size; smp.baseSizes[i] = size;
    smp.alphas[i] = 0.28 * graphics.smokeDensity * density;
    smp.ages[i] = 0; smp.lifetimes[i] = life;
    smp.spins[i] = (Math.random() - 0.5) * 0.6;
    smp.active[i] = 1;
  };

  // Spherical burst helper — Fibonacci-distributed, colour-per-layer
  const emitBurst = (
    cx: number, cy: number, cz: number,
    count: number, speed: number,
    palette: string[], secPalette: string[],
    grav: number, drag: number,
    isLarge = false
  ) => {
    const n = Math.floor(count * graphics.particleMultiplier);
    for (let k = 0; k < n; k++) {
      const u = Math.random();
      const v = Math.random();
      const th = u * Math.PI * 2;
      const ph = Math.acos(2 * v - 1);
      const spd = speed * (0.4 + Math.random() * 0.75);
      const vx = Math.sin(ph) * Math.cos(th) * spd;
      const vy = Math.cos(ph) * spd + (isLarge ? 1.2 : 0.6);
      const vz = Math.sin(ph) * Math.sin(th) * spd;
      const layer = k % 5;
      let col: string;
      if (layer === 0) col = palette[Math.floor(Math.random() * palette.length)];
      else if (layer === 1) col = secPalette[Math.floor(Math.random() * secPalette.length)];
      else col = palette[Math.floor(Math.random() * palette.length)];
      const size = isLarge
        ? (layer < 2 ? 0.42 + Math.random() * 0.22 : 0.28 + Math.random() * 0.18)
        : (layer < 2 ? 0.32 + Math.random() * 0.16 : 0.22 + Math.random() * 0.12);
      const life = (isLarge ? 1.4 : 1.0) + Math.random() * 1.0;
      emitSpark(sp, MAX_SPARK, cx, cy, cz, vx, vy, vz, col, size, life, grav, drag);

      // Long-lived ember for large bursts
      if (isLarge && k % 4 === 0) {
        const ePalette = PALETTES[Object.keys(PALETTES)[0]]?.ember || palette;
        const ecol = ePalette[Math.floor(Math.random() * ePalette.length)];
        emitSpark(ep, MAX_EMBER, cx + (Math.random() - 0.5) * 0.3, cy + (Math.random() - 0.5) * 0.3, cz + (Math.random() - 0.5) * 0.3,
          vx * 0.55, vy * 0.55, vz * 0.55, ecol,
          0.18 + Math.random() * 0.1, 2.2 + Math.random() * 1.4, grav * 0.6, 0.98
        );
      }
    }
    // Smoke cloud
    const smkCount = Math.floor((isLarge ? 12 : 6) * graphics.smokeDensity);
    for (let s = 0; s < smkCount; s++) {
      emitSmoke(
        cx + (Math.random() - 0.5) * 0.5, cy + (Math.random() - 0.5) * 0.4, cz + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.7, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.7,
        isLarge ? 1.6 + Math.random() * 1.0 : 0.9 + Math.random() * 0.6,
        isLarge ? 3.2 + Math.random() * 1.6 : 2.0 + Math.random() * 1.0
      );
    }
  };

  // ── Main frame loop ───────────────────────────────────────────────────────

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.08);
    const nowMs = performance.now();

    let l1pos: [number, number, number] | null = null, l1col = '#fbbf24', l1int = 0;
    let l2pos: [number, number, number] | null = null, l2col = '#f97316', l2int = 0;
    let l3pos: [number, number, number] | null = null, l3col = '#ffffff', l3int = 0;

    // ── Per-cracker emission ────────────────────────────────────────────────
    for (const inst of placedCrackers) {
      if (inst.state !== 'Igniting' && inst.state !== 'Active') continue;

      if (!trackers.current[inst.instanceId]) {
        trackers.current[inst.instanceId] = {
          rocketLaunched: false, rocketExploded: false,
          shellsFired: 0, garlandPopsFired: 0,
          chakriAngle: 0, fuseFlashTimer: 0,
        };
      }
      const tk = trackers.current[inst.instanceId];
      const cfg = CRACKERS[inst.crackerId];
      const pal = PALETTES[inst.crackerId] || PALETTES.rocket;
      const [px, py, pz] = inst.position;

      // ── IGNITING: Layered fuse effect at physical fuse anchor ────────
      if (inst.state === 'Igniting') {
        const [fuseX, fuseY, fuseZ] = getCrackerWorldFusePosition(inst);

        // Bright fuse sparks (irregular trajectories)
        const fCount = Math.max(1, Math.floor(70 * dt * graphics.particleMultiplier));
        for (let f = 0; f < fCount; f++) {
          const ang = Math.random() * Math.PI * 2;
          const elev = Math.random() * Math.PI * 0.5;
          const spd = 0.8 + Math.random() * 1.8;
          emitSpark(sp, MAX_SPARK,
            fuseX + (Math.random() - 0.5) * 0.025, fuseY, fuseZ + (Math.random() - 0.5) * 0.025,
            Math.cos(ang) * Math.cos(elev) * spd,
            Math.sin(elev) * spd + 0.4 + Math.random() * 0.6,
            Math.sin(ang) * Math.cos(elev) * spd,
            f % 3 === 0 ? '#ffffff' : '#fde047',
            0.14 + Math.random() * 0.1,
            0.18 + Math.random() * 0.22,
            5.0, 0.92
          );
        }

        // Small fuse smoke wisp
        tk.fuseFlashTimer += dt;
        if (tk.fuseFlashTimer > 0.08) {
          tk.fuseFlashTimer = 0;
          emitSmoke(
            fuseX + (Math.random() - 0.5) * 0.02, fuseY + 0.04, fuseZ + (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.15, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.15,
            0.28 + Math.random() * 0.18, 1.0 + Math.random() * 0.5, 0.6
          );
        }

        l1pos = [fuseX, fuseY + 0.12, fuseZ];
        l1col = '#fde068'; l1int = 1.5;
        continue;
      }

      // ── ACTIVE ──────────────────────────────────────────────────────────
      const ae = inst.activeStartedAt ? (nowMs - inst.activeStartedAt) / 1000 : 0;
      const prog = Math.min(1, ae / cfg.activeDuration);

      // ════ A. PHULJHADI — Golden sparkler shower ════════════════════════
      if (inst.crackerId === 'phuljhadi') {
        const tipY = py + Math.max(0.2, 0.52 - prog * 0.32);
        const intensity = prog > 0.9 ? (1 - prog) / 0.1 : 1;
        const n = Math.max(1, Math.floor(120 * dt * graphics.particleMultiplier * intensity));
        for (let s = 0; s < n; s++) {
          const th = Math.random() * Math.PI * 2;
          const ph = 0.15 + Math.random() * 0.7; // biased upward
          const spd = 1.2 + Math.random() * 2.8;
          const layer = Math.random();
          const col = layer < 0.5
            ? pal.primary[Math.floor(Math.random() * pal.primary.length)]
            : pal.secondary[Math.floor(Math.random() * pal.secondary.length)];
          emitSpark(sp, MAX_SPARK,
            px + (Math.random() - 0.5) * 0.02, tipY, pz + (Math.random() - 0.5) * 0.02,
            Math.cos(th) * Math.sin(ph) * spd,
            Math.cos(ph) * spd + 0.55,
            Math.sin(th) * Math.sin(ph) * spd,
            col, 0.18 + Math.random() * 0.14,
            0.25 + Math.random() * 0.38, cfg.effect.gravity, cfg.effect.drag
          );
          // Fine ember trail every few sparks
          if (s % 5 === 0) {
            emitSpark(ep, MAX_EMBER, px, tipY, pz,
              (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6,
              pal.ember[Math.floor(Math.random() * pal.ember.length)],
              0.12 + Math.random() * 0.08, 0.8 + Math.random() * 0.6, 1.8, 0.96
            );
          }
        }
        if (Math.random() < 0.2) {
          emitSmoke(px, tipY + 0.06, pz,
            (Math.random() - 0.5) * 0.14, 0.4 + Math.random() * 0.2, (Math.random() - 0.5) * 0.14,
            0.38, 1.2 + Math.random() * 0.4, 0.45 * intensity
          );
        }
        l1pos = [px, tipY + 0.1, pz]; l1col = '#fde68a'; l1int = cfg.effect.lightIntensity * intensity;
      }

      // ════ B. FLOWER POT — Continuous upward fountain ══════════════════
      else if (inst.crackerId === 'flower-pot') {
        const nozzleY = py + 0.34;
        const envelope = prog < 0.1 ? prog / 0.1 : prog > 0.88 ? (1 - prog) / 0.12 : 1;
        const n = Math.max(2, Math.floor(200 * dt * graphics.particleMultiplier * envelope));

        for (let s = 0; s < n; s++) {
          const ang = Math.random() * Math.PI * 2;
          // Fountain: central stream + spreading outer shower
          const isCentral = Math.random() < 0.45;
          const radial = isCentral ? 0.08 + Math.random() * 0.2 : 0.25 + Math.random() * 1.1;
          const upSpeed = isCentral
            ? (4.2 + Math.random() * 3.8) * envelope
            : (2.5 + Math.random() * 2.8) * envelope;
          const layer = Math.random();
          const col = layer < 0.7
            ? pal.primary[Math.floor(Math.random() * pal.primary.length)]
            : pal.secondary[Math.floor(Math.random() * pal.secondary.length)];
          emitSpark(sp, MAX_SPARK,
            px + (Math.random() - 0.5) * 0.05, nozzleY, pz + (Math.random() - 0.5) * 0.05,
            Math.cos(ang) * radial, upSpeed,
            Math.sin(ang) * radial,
            col, 0.26 + Math.random() * 0.24,
            0.65 + Math.random() * 0.85, cfg.effect.gravity, cfg.effect.drag
          );
        }
        // Falling ember shower
        if (ae > 0.4) {
          const eCount = Math.max(1, Math.floor(28 * dt * graphics.particleMultiplier * envelope));
          for (let e = 0; e < eCount; e++) {
            const ang2 = Math.random() * Math.PI * 2;
            const r = 0.4 + Math.random() * 1.2;
            emitSpark(ep, MAX_EMBER,
              px + Math.cos(ang2) * r, py + 2.0 + Math.random() * 1.4, pz + Math.sin(ang2) * r,
              (Math.random() - 0.5) * 0.4, -0.5 - Math.random() * 1.0, (Math.random() - 0.5) * 0.4,
              pal.ember[Math.floor(Math.random() * pal.ember.length)],
              0.16 + Math.random() * 0.1, 0.9 + Math.random() * 0.8, 2.5, 0.97
            );
          }
        }
        if (Math.random() < 0.5 * envelope) {
          emitSmoke(px, nozzleY + 0.35, pz,
            (Math.random() - 0.5) * 0.45, 0.85 + Math.random() * 0.6, (Math.random() - 0.5) * 0.45,
            0.65 + Math.random() * 0.45, 2.0 + Math.random() * 1.0, envelope
          );
        }
        l1pos = [px, nozzleY + 0.7, pz]; l1col = '#fb923c'; l1int = cfg.effect.lightIntensity * envelope;
      }

      // ════ C. ZAMEEN CHAKRI — Spinning radial spark wheel ══════════════
      else if (inst.crackerId === 'chakri') {
        const slowdown = Math.max(0.08, 1 - prog * 0.82);
        tk.chakriAngle += dt * 32 * slowdown;
        const n = Math.max(2, Math.floor(180 * dt * graphics.particleMultiplier * slowdown));
        const arms = 3;
        for (let s = 0; s < n; s++) {
          const armOffset = (s % arms) * (Math.PI * 2 / arms);
          const rimAng = tk.chakriAngle + armOffset + (Math.random() - 0.5) * 0.35;
          const rimR = 0.168;
          const sx = px + Math.cos(rimAng) * rimR;
          const sz = pz + Math.sin(rimAng) * rimR;
          // Mostly tangential, slight outward
          const tangAng = rimAng + Math.PI * 0.45;
          const spd = (2.8 + Math.random() * 2.6) * slowdown;
          const colIdx = Math.floor((ae * 3 + s) % pal.primary.length);
          emitSpark(sp, MAX_SPARK,
            sx, py + 0.042, sz,
            Math.cos(tangAng) * spd + (Math.random() - 0.5) * 0.4,
            0.22 + Math.random() * 0.7,
            Math.sin(tangAng) * spd + (Math.random() - 0.5) * 0.4,
            pal.primary[colIdx],
            0.22 + Math.random() * 0.18,
            0.32 + Math.random() * 0.42, cfg.effect.gravity, cfg.effect.drag
          );
        }
        if (Math.random() < 0.28) {
          emitSmoke(px, py + 0.1, pz,
            (Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 0.35, (Math.random() - 0.5) * 0.5,
            0.55 + Math.random() * 0.3, 1.4 + Math.random() * 0.8, 0.7 * slowdown
          );
        }
        l1pos = [px, py + 0.3, pz];
        l1col = pal.primary[Math.floor(ae * 5) % pal.primary.length];
        l1int = cfg.effect.lightIntensity * slowdown;
      }

      // ════ D. SKY ROCKET — Ascent trail + aerial explosion ════════════
      else if (inst.crackerId === 'rocket') {
        if (!tk.rocketLaunched) {
          tk.rocketLaunched = true;
          audioSystem.playRocketLaunch();
        }
        const fDur = 1.05;
        if (ae < fDur) {
          // Fast ascent
          const fP = ae / fDur;
          const rocketY = py + 0.38 + Math.pow(fP, 1.85) * cfg.effect.launchHeight;
          // Dense golden exhaust plume
          const tCount = Math.max(2, Math.floor(165 * dt * graphics.particleMultiplier));
          for (let t = 0; t < tCount; t++) {
            const isCore = t % 4 < 2;
            emitSpark(sp, MAX_SPARK,
              px + (Math.random() - 0.5) * 0.06, rocketY, pz + (Math.random() - 0.5) * 0.06,
              (Math.random() - 0.5) * 1.0,
              -2.2 - Math.random() * 1.8,
              (Math.random() - 0.5) * 1.0,
              isCore ? '#ffffff' : (t % 4 === 2 ? '#fde047' : '#fb923c'),
              isCore ? 0.32 + Math.random() * 0.16 : 0.24 + Math.random() * 0.12,
              0.3 + Math.random() * 0.4, 2.2, 0.95
            );
          }
          // Smoke trail behind rocket
          emitSmoke(px, rocketY - 0.15, pz,
            (Math.random() - 0.5) * 0.25, -0.2 - Math.random() * 0.2, (Math.random() - 0.5) * 0.25,
            0.45 + Math.random() * 0.35, 1.4, 0.8
          );
          l1pos = [px, rocketY, pz]; l1col = '#fbbf24'; l1int = 4.5;
        } else if (!tk.rocketExploded) {
          // Aerial burst
          tk.rocketExploded = true;
          const bY = py + 0.38 + cfg.effect.launchHeight;
          audioSystem.playAerialExplosion(1.0);
          if (!reducedFlash) onCameraShake(cfg.effect.cameraShakeIntensity);
          // Central flash sparks
          const flashN = Math.floor(55 * graphics.particleMultiplier);
          for (let f = 0; f < flashN; f++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 3.5;
            emitSpark(sp, MAX_SPARK, px, bY, pz, Math.cos(ang) * spd, (Math.random() - 0.5) * spd, Math.sin(ang) * spd,
              '#ffffff', 0.55 + Math.random() * 0.3, 0.35 + Math.random() * 0.2, 4, 0.88
            );
          }
          // Main burst
          emitBurst(px, bY, pz, cfg.effect.particlesPerBurst, cfg.effect.spreadRadius,
            pal.primary, pal.secondary, cfg.effect.gravity, cfg.effect.drag, true
          );
          // Embers
          for (let e = 0; e < Math.floor(40 * graphics.particleMultiplier); e++) {
            const ang = Math.random() * Math.PI * 2;
            const ph = Math.acos(2 * Math.random() - 1);
            const spd = 1.5 + Math.random() * 3;
            emitSpark(ep, MAX_EMBER, px, bY, pz,
              Math.sin(ph) * Math.cos(ang) * spd, Math.cos(ph) * spd, Math.sin(ph) * Math.sin(ang) * spd,
              pal.ember[Math.floor(Math.random() * pal.ember.length)],
              0.2 + Math.random() * 0.12, 2.5 + Math.random() * 1.5, 2.2, 0.98
            );
          }
          l2pos = [px, bY, pz]; l2col = '#fef08a'; l2int = cfg.effect.lightIntensity * 1.6;
        } else if (ae < fDur + 0.45) {
          // Brief post-burst light fade
          const fade = 1 - (ae - fDur) / 0.45;
          l2pos = [px, py + cfg.effect.launchHeight, pz];
          l2col = '#fef08a'; l2int = cfg.effect.lightIntensity * fade;
        }
      }

      // ════ E. AERIAL FIREWORKS BATTERY — Sequential multi-colour shells ═
      else if (inst.crackerId === 'aerial-fireworks') {
        const shellInterval = (cfg.activeDuration - 1.2) / cfg.effect.burstCount;
        const expected = Math.min(cfg.effect.burstCount, Math.floor(ae / shellInterval) + 1);

        // Ground mortar sparks while launching
        if (Math.random() < 0.7) {
          emitSpark(sp, MAX_SPARK,
            px + (Math.random() - 0.5) * 0.14, py + 0.32, pz + (Math.random() - 0.5) * 0.14,
            (Math.random() - 0.5) * 1.2, 2.8 + Math.random() * 2.4, (Math.random() - 0.5) * 1.2,
            '#fde047', 0.22, 0.38, 5.0, 0.95
          );
        }

        if (expected > tk.shellsFired) {
          tk.shellsFired = expected;
          const si = expected - 1;
          const ox = ((si % 3) - 1) * 1.2 + (Math.random() - 0.5) * 0.6;
          const bY = py + cfg.effect.launchHeight - 0.5 + (si % 2) * 1.0 + (Math.random() - 0.5) * 0.3;
          const bZ = pz + (Math.random() - 0.5) * 0.7;

          // Rising comet streak (18 dots from tube to burst)
          for (let c = 0; c < 22; c++) {
            const fr = c / 22;
            emitSpark(sp, MAX_SPARK,
              px + ox * fr, py + 0.32 + (bY - py - 0.32) * fr, pz + (bZ - pz) * fr,
              (Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4,
              '#fde68a', 0.26, 0.28 + (1 - fr) * 0.3, 1.8, 0.96
            );
          }

          audioSystem.playAerialExplosion(0.9 + Math.random() * 0.2);
          if (!reducedFlash) onCameraShake(cfg.effect.cameraShakeIntensity * 0.85);

          // Pick a unique colour pair per shell
          const ci = si % pal.primary.length;
          const cp = [pal.primary[ci], pal.primary[(ci + 2) % pal.primary.length]];

          // Double-burst for HIGH graphics
          emitBurst(px + ox, bY, bZ, cfg.effect.particlesPerBurst, cfg.effect.spreadRadius,
            cp, pal.secondary, cfg.effect.gravity, cfg.effect.drag, true
          );
          if (graphics.particleMultiplier >= 1.5) {
            // Secondary smaller burst slightly offset
            emitBurst(
              px + ox + (Math.random() - 0.5) * 0.5, bY - 0.5, bZ + (Math.random() - 0.5) * 0.5,
              Math.floor(cfg.effect.particlesPerBurst * 0.55),
              cfg.effect.spreadRadius * 0.7,
              pal.secondary, pal.primary, cfg.effect.gravity * 1.1, cfg.effect.drag, false
            );
          }
          // Embers
          for (let e = 0; e < Math.floor(30 * graphics.particleMultiplier); e++) {
            const ang = Math.random() * Math.PI * 2;
            const ph2 = Math.acos(2 * Math.random() - 1);
            const spd = 1.2 + Math.random() * 2.8;
            emitSpark(ep, MAX_EMBER, px + ox, bY, bZ,
              Math.sin(ph2) * Math.cos(ang) * spd, Math.cos(ph2) * spd, Math.sin(ph2) * Math.sin(ang) * spd,
              pal.ember[Math.floor(Math.random() * pal.ember.length)],
              0.18 + Math.random() * 0.1, 2.8 + Math.random() * 1.8, 2.0, 0.98
            );
          }

          l2pos = [px + ox, bY, bZ]; l2col = cp[0]; l2int = cfg.effect.lightIntensity * 1.4;
          l3pos = [px - ox * 0.5, bY - 0.5, bZ]; l3col = pal.secondary[0]; l3int = cfg.effect.lightIntensity * 0.8;
        }
      }

      // ════ F. 100-WALA GARLAND — Sequential chain pops ════════════════
      else if (inst.crackerId === 'garland-cracker') {
        const popInterval = (cfg.activeDuration - 0.4) / cfg.effect.burstCount;
        const expected = Math.min(cfg.effect.burstCount, Math.floor(ae / popInterval) + 1);

        if (expected > tk.garlandPopsFired) {
          tk.garlandPopsFired = expected;
          const pi = expected - 1;
          const zOff = -0.26 + (pi / cfg.effect.burstCount) * 0.52;
          const popX = px + (Math.random() - 0.5) * 0.1;
          const popZ = pz + zOff;

          audioSystem.playGarlandPop();
          if (!reducedFlash && pi % 2 === 0) onCameraShake(cfg.effect.cameraShakeIntensity * 0.55);

          // Sharp crack — flat radial pop
          const n = Math.floor(cfg.effect.particlesPerBurst * graphics.particleMultiplier);
          for (let p = 0; p < n; p++) {
            const ang = Math.random() * Math.PI * 2;
            const elevAng = (Math.random() - 0.5) * Math.PI * 0.5;
            const spd = 1.4 + Math.random() * 3.2;
            const col = pal.primary[Math.floor(Math.random() * pal.primary.length)];
            emitSpark(sp, MAX_SPARK, popX, py + 0.055, popZ,
              Math.cos(ang) * Math.cos(elevAng) * spd,
              Math.sin(elevAng) * spd + 1.2 + Math.random() * 2.0,
              Math.sin(ang) * Math.cos(elevAng) * spd,
              col, 0.22 + Math.random() * 0.16,
              0.28 + Math.random() * 0.38, cfg.effect.gravity, cfg.effect.drag
            );
          }
          // Flash smoke puff
          emitSmoke(popX, py + 0.08, popZ,
            (Math.random() - 0.5) * 0.6, 0.55 + Math.random() * 0.45, (Math.random() - 0.5) * 0.6,
            0.55 + Math.random() * 0.45, 1.5 + Math.random() * 0.8, 1.0
          );
          // Embers
          for (let e = 0; e < Math.floor(8 * graphics.particleMultiplier); e++) {
            emitSpark(ep, MAX_EMBER, popX, py + 0.06, popZ,
              (Math.random() - 0.5) * 2.0, 1.0 + Math.random() * 2.5, (Math.random() - 0.5) * 2.0,
              pal.ember[Math.floor(Math.random() * pal.ember.length)],
              0.14 + Math.random() * 0.08, 1.0 + Math.random() * 0.8, 5.0, 0.95
            );
          }
          l1pos = [popX, py + 0.3, popZ]; l1col = '#f97316'; l1int = cfg.effect.lightIntensity;
        }
      }
    }

    // ── Physics update: bright sparks ────────────────────────────────────

    let activeSparkCount = 0;
    const sparkLimit = Math.min(MAX_SPARK, graphics.maxActiveParticles);

    for (let i = 0; i < sparkLimit; i++) {
      if (sp.active[i] === 0) continue;
      sp.ages[i] += dt;
      const life = sp.lifetimes[i];
      if (sp.ages[i] >= life) { sp.active[i] = 0; sp.alphas[i] = 0; sp.sizes[i] = 0; continue; }
      activeSparkCount++;
      const i3 = i * 3;
      const drag = Math.pow(sp.drags[i], dt * 60);
      sp.velocities[i3] *= drag;
      sp.velocities[i3 + 1] = sp.velocities[i3 + 1] * drag - sp.gravities[i] * dt;
      sp.velocities[i3 + 2] *= drag;
      sp.positions[i3] += sp.velocities[i3] * dt;
      sp.positions[i3 + 1] += sp.velocities[i3 + 1] * dt;
      sp.positions[i3 + 2] += sp.velocities[i3 + 2] * dt;
      if (sp.positions[i3 + 1] < groundY + 0.02) {
        sp.positions[i3 + 1] = groundY + 0.02;
        sp.velocities[i3 + 1] = Math.abs(sp.velocities[i3 + 1]) * 0.28;
        sp.velocities[i3] *= 0.6;
        sp.velocities[i3 + 2] *= 0.6;
      }
      const na = sp.ages[i] / life;
      // Sharper leading edge, longer tail
      const fade = na < 0.08 ? na / 0.08 : 1 - Math.pow((na - 0.08) / 0.92, 1.4);
      sp.alphas[i] = Math.max(0, fade);
      sp.sizes[i] = sp.baseSizes[i] * (0.3 + 0.7 * fade);
    }

    // ── Physics update: embers ────────────────────────────────────────────

    for (let i = 0; i < MAX_EMBER; i++) {
      if (ep.active[i] === 0) continue;
      ep.ages[i] += dt;
      if (ep.ages[i] >= ep.lifetimes[i]) { ep.active[i] = 0; ep.alphas[i] = 0; ep.sizes[i] = 0; continue; }
      const i3 = i * 3;
      const drag = Math.pow(ep.drags[i], dt * 60);
      ep.velocities[i3] *= drag;
      ep.velocities[i3 + 1] = ep.velocities[i3 + 1] * drag - ep.gravities[i] * dt;
      ep.velocities[i3 + 2] *= drag;
      ep.positions[i3] += ep.velocities[i3] * dt;
      ep.positions[i3 + 1] += ep.velocities[i3 + 1] * dt;
      ep.positions[i3 + 2] += ep.velocities[i3 + 2] * dt;
      if (ep.positions[i3 + 1] < groundY + 0.015) {
        ep.positions[i3 + 1] = groundY + 0.015;
        ep.velocities[i3 + 1] *= -0.18;
        ep.velocities[i3] *= 0.55;
        ep.velocities[i3 + 2] *= 0.55;
      }
      const na = ep.ages[i] / ep.lifetimes[i];
      ep.alphas[i] = Math.max(0, 1 - Math.pow(na, 1.8));
      ep.sizes[i] = ep.baseSizes[i] * (0.5 + 0.5 * (1 - na));
    }

    // ── Physics update: smoke ─────────────────────────────────────────────

    for (let i = 0; i < MAX_SMOKE; i++) {
      if (smp.active[i] === 0) continue;
      smp.ages[i] += dt;
      if (smp.ages[i] >= smp.lifetimes[i]) { smp.active[i] = 0; smp.alphas[i] = 0; smp.sizes[i] = 0; continue; }
      const i3 = i * 3;
      smp.positions[i3] += smp.velocities[i3] * dt;
      smp.positions[i3 + 1] += smp.velocities[i3 + 1] * dt;
      smp.positions[i3 + 2] += smp.velocities[i3 + 2] * dt;
      // Slight horizontal drift for natural smoke behaviour
      smp.velocities[i3] += smp.spins[i] * dt * 0.15;
      smp.velocities[i3 + 2] += smp.spins[i] * dt * 0.1;
      const na = smp.ages[i] / smp.lifetimes[i];
      smp.sizes[i] = smp.baseSizes[i] * (1.0 + na * 1.8);
      smp.alphas[i] = 0.26 * graphics.smokeDensity * Math.sin(na * Math.PI);
    }

    // Mark buffer attributes dirty
    if (sparkGeoRef.current) {
      (sparkGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (sparkGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (sparkGeoRef.current.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (sparkGeoRef.current.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    }
    if (emberGeoRef.current) {
      (emberGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (emberGeoRef.current.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (emberGeoRef.current.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (emberGeoRef.current.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    }
    if (smokeGeoRef.current) {
      (smokeGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (smokeGeoRef.current.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (smokeGeoRef.current.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    }

    // ── Dynamic point lights ─────────────────────────────────────────────

    const updateLight = (
      ref: React.RefObject<THREE.PointLight | null>,
      pos: [number, number, number] | null,
      color: string,
      intensity: number
    ) => {
      const lt = ref.current;
      if (!lt) return;
      if (graphics.enableDynamicLights && pos) {
        lt.position.set(...pos);
        lt.color.set(color);
        const target = reducedFlash ? Math.min(1.8, intensity * 0.42) : intensity;
        lt.intensity = THREE.MathUtils.lerp(lt.intensity, target, 0.38);
      } else {
        lt.intensity = THREE.MathUtils.lerp(lt.intensity, 0, 0.18);
      }
    };
    updateLight(light1Ref, l1pos, l1col, l1int);
    updateLight(light2Ref, l2pos, l2col, l2int);
    updateLight(light3Ref, l3pos, l3col, l3int);

    if (onActiveParticleCountChange && state.clock.elapsedTime - lastReportRef.current > 0.22) {
      lastReportRef.current = state.clock.elapsedTime;
      onActiveParticleCountChange(activeSparkCount);
    }
  });

  return (
    <group>
      {/* ── Smoke layer (NormalBlending, behind sparks) ── */}
      <points frustumCulled={false}>
        <bufferGeometry ref={smokeGeoRef}>
          <bufferAttribute attach="attributes-position" args={[smp.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[smp.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[smp.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={SMOKE_VERT}
          fragmentShader={SMOKE_FRAG}
          uniforms={smokeUniforms}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {/* ── Long-lived embers (AdditiveBlending, dimmer) ── */}
      <points frustumCulled={false}>
        <bufferGeometry ref={emberGeoRef}>
          <bufferAttribute attach="attributes-position" args={[ep.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[ep.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[ep.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[ep.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={SPARK_VERT}
          fragmentShader={SPARK_FRAG}
          uniforms={emberUniforms}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ── Bright sparks & aerial bursts (AdditiveBlending, front) ── */}
      <points frustumCulled={false}>
        <bufferGeometry ref={sparkGeoRef}>
          <bufferAttribute attach="attributes-position" args={[sp.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[sp.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sp.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[sp.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={SPARK_VERT}
          fragmentShader={SPARK_FRAG}
          uniforms={sparkUniforms}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* ── Dynamic point lights (3) ── */}
      <pointLight ref={light1Ref} intensity={0} distance={8} decay={1.8} />
      <pointLight ref={light2Ref} intensity={0} distance={16} decay={1.5} />
      <pointLight ref={light3Ref} intensity={0} distance={12} decay={1.6} />
    </group>
  );
};
