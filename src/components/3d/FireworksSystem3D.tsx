import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CRACKERS } from '../../config/crackers';
import { audioSystem } from '../../systems/AudioSystem';
import { GraphicsConfig, PlacedCrackerInstance } from '../../types/game';

interface FireworksSystem3DProps {
  placedCrackers: PlacedCrackerInstance[];
  graphics: GraphicsConfig;
  reducedFlash: boolean;
  groundY: number;
  contrastBoost: number;
  onCameraShake: (intensity: number) => void;
  onActiveParticleCountChange?: (count: number) => void;
}

function createSparkSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.22, 'rgba(255, 248, 220, 0.92)');
  grad.addColorStop(0.55, 'rgba(255, 200, 100, 0.38)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function createSmokeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(190, 195, 210, 0.42)');
  grad.addColorStop(0.5, 'rgba(140, 145, 165, 0.22)');
  grad.addColorStop(1, 'rgba(90, 95, 110, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const SPARK_SHADER_VERTEX = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (290.0 / max(0.5, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SPARK_SHADER_FRAGMENT = `
  uniform sampler2D uMap;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.02 || vAlpha <= 0.01) discard;
    gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
  }
`;

interface InternalTracker {
  rocketLaunched: boolean;
  rocketExploded: boolean;
  shellsFired: number;
  garlandPopsFired: number;
  chakriAngle: number;
}

export const FireworksSystem3D: React.FC<FireworksSystem3DProps> = ({
  placedCrackers,
  graphics,
  reducedFlash,
  groundY,
  contrastBoost,
  onCameraShake,
  onActiveParticleCountChange,
}) => {
  const MAX_SPARKS = 4200;
  const MAX_SMOKE = 600;

  const sparkGeoRef = useRef<THREE.BufferGeometry>(null);
  const smokeGeoRef = useRef<THREE.BufferGeometry>(null);
  const dynamicLight1Ref = useRef<THREE.PointLight>(null);
  const dynamicLight2Ref = useRef<THREE.PointLight>(null);

  const sparkTexture = useMemo(() => createSparkSpriteTexture(), []);
  const smokeTexture = useMemo(() => createSmokeSpriteTexture(), []);

  // Pre-allocated typed arrays for zero GC pressure in animation loop
  const sparkData = useMemo(() => {
    return {
      positions: new Float32Array(MAX_SPARKS * 3),
      velocities: new Float32Array(MAX_SPARKS * 3),
      colors: new Float32Array(MAX_SPARKS * 3),
      sizes: new Float32Array(MAX_SPARKS),
      baseSizes: new Float32Array(MAX_SPARKS),
      alphas: new Float32Array(MAX_SPARKS),
      ages: new Float32Array(MAX_SPARKS),
      lifetimes: new Float32Array(MAX_SPARKS),
      gravities: new Float32Array(MAX_SPARKS),
      drags: new Float32Array(MAX_SPARKS),
      active: new Uint8Array(MAX_SPARKS),
      cursor: 0,
    };
  }, []);

  const smokeData = useMemo(() => {
    return {
      positions: new Float32Array(MAX_SMOKE * 3),
      velocities: new Float32Array(MAX_SMOKE * 3),
      colors: new Float32Array(MAX_SMOKE * 3),
      sizes: new Float32Array(MAX_SMOKE),
      baseSizes: new Float32Array(MAX_SMOKE),
      alphas: new Float32Array(MAX_SMOKE),
      ages: new Float32Array(MAX_SMOKE),
      lifetimes: new Float32Array(MAX_SMOKE),
      active: new Uint8Array(MAX_SMOKE),
      cursor: 0,
    };
  }, []);

  const trackerMapRef = useRef<Record<string, InternalTracker>>({});
  const lastCountReportRef = useRef<number>(0);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const sparkUniforms = useMemo(
    () => ({
      uMap: { value: sparkTexture },
    }),
    [sparkTexture]
  );

  const smokeUniforms = useMemo(
    () => ({
      uMap: { value: smokeTexture },
    }),
    [smokeTexture]
  );

  // Clean up textures on unmount
  useEffect(() => {
    return () => {
      sparkTexture.dispose();
      smokeTexture.dispose();
    };
  }, [sparkTexture, smokeTexture]);

  const spawnSpark = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    colorHex: string,
    size: number,
    lifetime: number,
    gravity: number,
    drag: number
  ) => {
    const limit = Math.min(MAX_SPARKS, graphics.maxActiveParticles);
    const i = sparkData.cursor % limit;
    sparkData.cursor = (sparkData.cursor + 1) % limit;

    const i3 = i * 3;
    sparkData.positions[i3] = x;
    sparkData.positions[i3 + 1] = y;
    sparkData.positions[i3 + 2] = z;

    sparkData.velocities[i3] = vx;
    sparkData.velocities[i3 + 1] = vy;
    sparkData.velocities[i3 + 2] = vz;

    tmpColor.set(colorHex);
    const boost = reducedFlash ? 0.82 : contrastBoost;
    sparkData.colors[i3] = Math.min(1, tmpColor.r * boost);
    sparkData.colors[i3 + 1] = Math.min(1, tmpColor.g * boost);
    sparkData.colors[i3 + 2] = Math.min(1, tmpColor.b * boost);

    const finalSize = reducedFlash ? size * 0.8 : size;
    sparkData.sizes[i] = finalSize;
    sparkData.baseSizes[i] = finalSize;
    sparkData.alphas[i] = 1.0;
    sparkData.ages[i] = 0;
    sparkData.lifetimes[i] = lifetime;
    sparkData.gravities[i] = gravity;
    sparkData.drags[i] = drag;
    sparkData.active[i] = 1;
  };

  const spawnSmoke = (
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    lifetime: number
  ) => {
    if (graphics.smokeDensity <= 0.05) return;
    const i = smokeData.cursor % MAX_SMOKE;
    smokeData.cursor = (smokeData.cursor + 1) % MAX_SMOKE;

    const i3 = i * 3;
    smokeData.positions[i3] = x;
    smokeData.positions[i3 + 1] = y;
    smokeData.positions[i3 + 2] = z;

    smokeData.velocities[i3] = vx;
    smokeData.velocities[i3 + 1] = vy;
    smokeData.velocities[i3 + 2] = vz;

    smokeData.colors[i3] = 0.78;
    smokeData.colors[i3 + 1] = 0.8;
    smokeData.colors[i3 + 2] = 0.86;

    smokeData.sizes[i] = size;
    smokeData.baseSizes[i] = size;
    smokeData.alphas[i] = 0.26 * graphics.smokeDensity;
    smokeData.ages[i] = 0;
    smokeData.lifetimes[i] = lifetime;
    smokeData.active[i] = 1;
  };

  const spawnSphericalBurst = (
    cx: number,
    cy: number,
    cz: number,
    count: number,
    speed: number,
    palette: string[],
    secondaryPalette: string[],
    gravity: number,
    drag: number
  ) => {
    const scaledCount = Math.floor(count * graphics.particleMultiplier);
    const primaryColor = palette[Math.floor(Math.random() * palette.length)];
    const secColor =
      secondaryPalette[Math.floor(Math.random() * secondaryPalette.length)] ||
      primaryColor;

    for (let k = 0; k < scaledCount; k++) {
      // Fibonacci / uniform spherical distribution with random variance
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const rSpeed = speed * (0.45 + Math.random() * 0.7);

      const vx = Math.sin(phi) * Math.cos(theta) * rSpeed;
      const vy = Math.cos(phi) * rSpeed + 0.8;
      const vz = Math.sin(phi) * Math.sin(theta) * rSpeed;

      const isCore = k % 3 === 0;
      const col = isCore ? secColor : primaryColor;
      const size = isCore ? 0.28 + Math.random() * 0.14 : 0.36 + Math.random() * 0.22;
      const life = 1.15 + Math.random() * 1.15;

      spawnSpark(cx, cy, cz, vx, vy, vz, col, size, life, gravity, drag);
    }

    // Smoke cloud at burst center
    for (let s = 0; s < 8; s++) {
      spawnSmoke(
        cx + (Math.random() - 0.5) * 0.4,
        cy + (Math.random() - 0.5) * 0.4,
        cz + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.6,
        0.35 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.6,
        1.1 + Math.random() * 0.7,
        2.4 + Math.random() * 1.2
      );
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.08);
    const nowMs = performance.now();

    let brightestLightPos: [number, number, number] | null = null;
    let brightestLightColor = '#fbbf24';
    let brightestLightIntensity = 0;

    let secondLightPos: [number, number, number] | null = null;
    let secondLightColor = '#f97316';
    let secondLightIntensity = 0;

    // 1. Emit particles for each placed cracker in 'Igniting' or 'Active' state
    for (const inst of placedCrackers) {
      if (inst.state !== 'Igniting' && inst.state !== 'Active') continue;

      if (!trackerMapRef.current[inst.instanceId]) {
        trackerMapRef.current[inst.instanceId] = {
          rocketLaunched: false,
          rocketExploded: false,
          shellsFired: 0,
          garlandPopsFired: 0,
          chakriAngle: 0,
        };
      }
      const tracker = trackerMapRef.current[inst.instanceId];
      const cfg = CRACKERS[inst.crackerId];
      const [px, py, pz] = inst.position;

      // IGNITING STATE: Fuse sparks
      if (inst.state === 'Igniting') {
        const fuseY =
          inst.crackerId === 'phuljhadi'
            ? py + 0.5
            : inst.crackerId === 'flower-pot'
            ? py + 0.34
            : inst.crackerId === 'rocket'
            ? py + 0.34
            : py + 0.1;

        const fuseCount = Math.max(1, Math.floor(55 * dt * graphics.particleMultiplier));
        for (let f = 0; f < fuseCount; f++) {
          spawnSpark(
            px + (Math.random() - 0.5) * 0.03,
            fuseY,
            pz + (Math.random() - 0.5) * 0.03,
            (Math.random() - 0.5) * 1.3,
            1.1 + Math.random() * 1.4,
            (Math.random() - 0.5) * 1.3,
            '#fde047',
            0.18 + Math.random() * 0.08,
            0.22 + Math.random() * 0.2,
            4.5,
            0.94
          );
        }

        if (brightestLightIntensity < 1.2) {
          brightestLightPos = [px, fuseY + 0.15, pz];
          brightestLightColor = '#fbbf24';
          brightestLightIntensity = 1.2;
        }
        continue;
      }

      // ACTIVE STATE
      const activeElapsed = inst.activeStartedAt
        ? (nowMs - inst.activeStartedAt) / 1000
        : 0;
      const progress = Math.min(1, activeElapsed / cfg.activeDuration);

      // A. PHULJHADI (Sparkler)
      if (inst.crackerId === 'phuljhadi') {
        const tipY = py + Math.max(0.18, 0.51 - progress * 0.33);
        const emitCount = Math.max(
          1,
          Math.floor(cfg.effect.sparkRate * dt * graphics.particleMultiplier)
        );
        for (let s = 0; s < emitCount; s++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const spd = 1.4 + Math.random() * 2.2;
          const col =
            cfg.effect.primaryColors[
              Math.floor(Math.random() * cfg.effect.primaryColors.length)
            ];
          spawnSpark(
            px,
            tipY,
            pz,
            Math.sin(phi) * Math.cos(theta) * spd,
            Math.cos(phi) * spd + 0.6,
            Math.sin(phi) * Math.sin(theta) * spd,
            col,
            0.2 + Math.random() * 0.14,
            0.28 + Math.random() * 0.32,
            cfg.effect.gravity,
            cfg.effect.drag
          );
        }

        if (Math.random() < 0.25) {
          spawnSmoke(
            px,
            tipY + 0.05,
            pz,
            (Math.random() - 0.5) * 0.18,
            0.45 + Math.random() * 0.25,
            (Math.random() - 0.5) * 0.18,
            0.45,
            1.4
          );
        }

        brightestLightPos = [px, tipY + 0.1, pz];
        brightestLightColor = '#fde68a';
        brightestLightIntensity = cfg.effect.lightIntensity;
      }

      // B. FLOWER POT (Anar Conical Fountain)
      else if (inst.crackerId === 'flower-pot') {
        const nozzleY = py + 0.32;
        const intensityEnvelope =
          progress < 0.12
            ? progress / 0.12
            : progress > 0.85
            ? (1 - progress) / 0.15
            : 1.0;

        const emitCount = Math.max(
          2,
          Math.floor(
            cfg.effect.sparkRate *
              intensityEnvelope *
              dt *
              graphics.particleMultiplier
          )
        );

        for (let s = 0; s < emitCount; s++) {
          const angle = Math.random() * Math.PI * 2;
          const radialSpread = (0.25 + Math.random() * 0.95) * (0.6 + 0.4 * intensityEnvelope);
          const vy =
            (3.8 + Math.random() * 3.4) * (0.55 + 0.5 * intensityEnvelope);
          const palette =
            Math.random() < 0.78
              ? cfg.effect.primaryColors
              : cfg.effect.secondaryColors;
          const col = palette[Math.floor(Math.random() * palette.length)];

          spawnSpark(
            px + (Math.random() - 0.5) * 0.04,
            nozzleY,
            pz + (Math.random() - 0.5) * 0.04,
            Math.cos(angle) * radialSpread,
            vy,
            Math.sin(angle) * radialSpread,
            col,
            0.28 + Math.random() * 0.22,
            0.75 + Math.random() * 0.75,
            cfg.effect.gravity,
            cfg.effect.drag
          );
        }

        if (Math.random() < 0.45) {
          spawnSmoke(
            px,
            nozzleY + 0.3,
            pz,
            (Math.random() - 0.5) * 0.35,
            0.8 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.35,
            0.75,
            1.9
          );
        }

        brightestLightPos = [px, nozzleY + 0.6, pz];
        brightestLightColor = '#fb923c';
        brightestLightIntensity = cfg.effect.lightIntensity * intensityEnvelope;
      }

      // C. ZAMEEN CHAKRI (Spinning Ground Wheel)
      else if (inst.crackerId === 'chakri') {
        tracker.chakriAngle += dt * 28;
        const emitCount = Math.max(
          2,
          Math.floor(cfg.effect.sparkRate * dt * graphics.particleMultiplier)
        );

        for (let s = 0; s < emitCount; s++) {
          const armAngle = tracker.chakriAngle + (s / emitCount) * Math.PI * 2;
          const rimRadius = 0.16;
          const sx = px + Math.cos(armAngle) * rimRadius;
          const sz = pz + Math.sin(armAngle) * rimRadius;

          // Tangential + outward velocity
          const tangAngle = armAngle + Math.PI * 0.42;
          const speed = 2.4 + Math.random() * 2.2;
          const col =
            cfg.effect.primaryColors[
              Math.floor((activeElapsed * 3 + s) % cfg.effect.primaryColors.length)
            ];

          spawnSpark(
            sx,
            py + 0.04,
            sz,
            Math.cos(tangAngle) * speed,
            0.35 + Math.random() * 0.9,
            Math.sin(tangAngle) * speed,
            col,
            0.25 + Math.random() * 0.16,
            0.42 + Math.random() * 0.45,
            cfg.effect.gravity,
            cfg.effect.drag
          );
        }

        if (Math.random() < 0.35) {
          spawnSmoke(
            px,
            py + 0.08,
            pz,
            (Math.random() - 0.5) * 0.4,
            0.35 + Math.random() * 0.3,
            (Math.random() - 0.5) * 0.4,
            0.65,
            1.6
          );
        }

        brightestLightPos = [px, py + 0.28, pz];
        brightestLightColor =
          cfg.effect.primaryColors[
            Math.floor(activeElapsed * 4) % cfg.effect.primaryColors.length
          ];
        brightestLightIntensity = cfg.effect.lightIntensity;
      }

      // D. SKY ROCKET (Ascent + High-Altitude Burst)
      else if (inst.crackerId === 'rocket') {
        if (!tracker.rocketLaunched) {
          tracker.rocketLaunched = true;
          audioSystem.playRocketLaunch();
        }

        const flightDuration = 1.05;
        if (activeElapsed < flightDuration) {
          const fProg = activeElapsed / flightDuration;
          const rocketY = py + 0.35 + Math.pow(fProg, 1.85) * cfg.effect.launchHeight;

          // Dense golden exhaust trail
          const trailCount = Math.max(
            2,
            Math.floor(140 * dt * graphics.particleMultiplier)
          );
          for (let t = 0; t < trailCount; t++) {
            spawnSpark(
              px + (Math.random() - 0.5) * 0.05,
              rocketY,
              pz + (Math.random() - 0.5) * 0.05,
              (Math.random() - 0.5) * 0.85,
              -1.8 - Math.random() * 1.5,
              (Math.random() - 0.5) * 0.85,
              t % 2 === 0 ? '#fde047' : '#fb923c',
              0.28 + Math.random() * 0.14,
              0.38 + Math.random() * 0.35,
              2.5,
              0.95
            );
          }

          spawnSmoke(
            px,
            rocketY - 0.1,
            pz,
            (Math.random() - 0.5) * 0.2,
            0.2,
            (Math.random() - 0.5) * 0.2,
            0.55,
            1.6
          );

          brightestLightPos = [px, rocketY, pz];
          brightestLightColor = '#fbbf24';
          brightestLightIntensity = 3.8;
        } else if (!tracker.rocketExploded) {
          tracker.rocketExploded = true;
          const burstY = py + 0.35 + cfg.effect.launchHeight;

          audioSystem.playAerialExplosion(1.0);
          if (!reducedFlash) {
            onCameraShake(cfg.effect.cameraShakeIntensity);
          }

          spawnSphericalBurst(
            px,
            burstY,
            pz,
            cfg.effect.particlesPerBurst,
            cfg.effect.spreadRadius,
            cfg.effect.primaryColors,
            cfg.effect.secondaryColors,
            cfg.effect.gravity,
            cfg.effect.drag
          );

          secondLightPos = [px, burstY, pz];
          secondLightColor = '#fef08a';
          secondLightIntensity = cfg.effect.lightIntensity * 1.4;
        }
      }

      // E. NAVRANG 12-SHOT AERIAL FIREWORKS BATTERY
      else if (inst.crackerId === 'aerial-fireworks') {
        const totalShells = cfg.effect.burstCount; // 5 staggered multi-color aerial shells
        const shellInterval = (cfg.activeDuration - 1.4) / totalShells;
        const expectedShells = Math.min(
          totalShells,
          Math.floor(activeElapsed / shellInterval) + 1
        );

        // Ground mortar fountain sparks while active
        if (Math.random() < 0.65) {
          spawnSpark(
            px + (Math.random() - 0.5) * 0.12,
            py + 0.3,
            pz + (Math.random() - 0.5) * 0.12,
            (Math.random() - 0.5) * 1.1,
            2.5 + Math.random() * 2.0,
            (Math.random() - 0.5) * 1.1,
            '#fde047',
            0.22,
            0.4,
            4.5,
            0.95
          );
        }

        if (expectedShells > tracker.shellsFired) {
          tracker.shellsFired = expectedShells;
          const shellIdx = expectedShells - 1;
          const offsetX = ((shellIdx % 3) - 1) * 1.15 + (Math.random() - 0.5) * 0.5;
          const burstY =
            py + cfg.effect.launchHeight - 0.6 + (shellIdx % 2) * 0.85;
          const burstZ = pz + (Math.random() - 0.5) * 0.6;

          // Rising comet streak from tube to burst altitude
          for (let c = 0; c < 18; c++) {
            const frac = c / 18;
            spawnSpark(
              px + offsetX * frac,
              py + 0.32 + (burstY - py - 0.32) * frac,
              pz + (burstZ - pz) * frac,
              (Math.random() - 0.5) * 0.3,
              0.5,
              (Math.random() - 0.5) * 0.3,
              '#fde68a',
              0.24,
              0.35 + (1 - frac) * 0.25,
              2.0,
              0.95
            );
          }

          audioSystem.playAerialExplosion(0.95);
          if (!reducedFlash) {
            onCameraShake(cfg.effect.cameraShakeIntensity);
          }

          const colorPair = [
            cfg.effect.primaryColors[shellIdx % cfg.effect.primaryColors.length],
            cfg.effect.primaryColors[(shellIdx + 2) % cfg.effect.primaryColors.length],
          ];

          spawnSphericalBurst(
            px + offsetX,
            burstY,
            burstZ,
            cfg.effect.particlesPerBurst,
            cfg.effect.spreadRadius,
            colorPair,
            cfg.effect.secondaryColors,
            cfg.effect.gravity,
            cfg.effect.drag
          );

          secondLightPos = [px + offsetX, burstY, burstZ];
          secondLightColor = colorPair[0];
          secondLightIntensity = cfg.effect.lightIntensity * 1.3;
        }
      }

      // F. 100-WALA GARLAND CRACKER (Rapid Chain Reaction)
      else if (inst.crackerId === 'garland-cracker') {
        const totalPops = cfg.effect.burstCount; // 14 rapid pops
        const popInterval = (cfg.activeDuration - 0.4) / totalPops;
        const expectedPops = Math.min(
          totalPops,
          Math.floor(activeElapsed / popInterval) + 1
        );

        if (expectedPops > tracker.garlandPopsFired) {
          tracker.garlandPopsFired = expectedPops;
          const popIndex = expectedPops - 1;
          const zOffset = -0.24 + (popIndex / totalPops) * 0.48;
          const popX = px + (Math.random() - 0.5) * 0.12;
          const popZ = pz + zOffset;

          audioSystem.playGarlandPop();
          if (!reducedFlash && popIndex % 2 === 0) {
            onCameraShake(cfg.effect.cameraShakeIntensity * 0.65);
          }

          const count = Math.floor(
            cfg.effect.particlesPerBurst * graphics.particleMultiplier
          );
          for (let p = 0; p < count; p++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.2 + Math.random() * 2.8;
            const col =
              cfg.effect.primaryColors[
                Math.floor(Math.random() * cfg.effect.primaryColors.length)
              ];
            spawnSpark(
              popX,
              py + 0.05,
              popZ,
              Math.cos(ang) * spd,
              1.2 + Math.random() * 2.6,
              Math.sin(ang) * spd,
              col,
              0.24 + Math.random() * 0.15,
              0.3 + Math.random() * 0.35,
              cfg.effect.gravity,
              cfg.effect.drag
            );
          }

          spawnSmoke(
            popX,
            py + 0.08,
            popZ,
            (Math.random() - 0.5) * 0.5,
            0.5 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.5,
            0.7,
            1.8
          );

          brightestLightPos = [popX, py + 0.3, popZ];
          brightestLightColor = '#f97316';
          brightestLightIntensity = cfg.effect.lightIntensity;
        }
      }
    }

    // 2. Update all active Spark Particles (Physics: velocity, gravity, drag, ground bounce, fade)
    let activeSparkCount = 0;
    const limit = Math.min(MAX_SPARKS, graphics.maxActiveParticles);

    for (let i = 0; i < limit; i++) {
      if (sparkData.active[i] === 0) continue;

      sparkData.ages[i] += dt;
      const life = sparkData.lifetimes[i];
      if (sparkData.ages[i] >= life) {
        sparkData.active[i] = 0;
        sparkData.alphas[i] = 0;
        sparkData.sizes[i] = 0;
        continue;
      }

      activeSparkCount++;
      const i3 = i * 3;
      const dragFactor = Math.pow(sparkData.drags[i], dt * 60);

      sparkData.velocities[i3] *= dragFactor;
      sparkData.velocities[i3 + 1] =
        sparkData.velocities[i3 + 1] * dragFactor - sparkData.gravities[i] * dt;
      sparkData.velocities[i3 + 2] *= dragFactor;

      sparkData.positions[i3] += sparkData.velocities[i3] * dt;
      sparkData.positions[i3 + 1] += sparkData.velocities[i3 + 1] * dt;
      sparkData.positions[i3 + 2] += sparkData.velocities[i3 + 2] * dt;

      // Ground bounce for falling embers
      if (sparkData.positions[i3 + 1] < groundY + 0.02) {
        sparkData.positions[i3 + 1] = groundY + 0.02;
        sparkData.velocities[i3 + 1] = Math.abs(sparkData.velocities[i3 + 1]) * 0.32;
        sparkData.velocities[i3] *= 0.65;
        sparkData.velocities[i3 + 2] *= 0.65;
      }

      const normAge = sparkData.ages[i] / life;
      const fade = 1.0 - Math.pow(normAge, 1.6);
      sparkData.alphas[i] = fade;
      sparkData.sizes[i] = sparkData.baseSizes[i] * (0.4 + 0.6 * fade);
    }

    if (sparkGeoRef.current) {
      sparkGeoRef.current.attributes.position.needsUpdate = true;
      sparkGeoRef.current.attributes.color.needsUpdate = true;
      sparkGeoRef.current.attributes.aSize.needsUpdate = true;
      sparkGeoRef.current.attributes.aAlpha.needsUpdate = true;
    }

    // 3. Update Smoke Particles
    for (let i = 0; i < MAX_SMOKE; i++) {
      if (smokeData.active[i] === 0) continue;

      smokeData.ages[i] += dt;
      const life = smokeData.lifetimes[i];
      if (smokeData.ages[i] >= life) {
        smokeData.active[i] = 0;
        smokeData.alphas[i] = 0;
        smokeData.sizes[i] = 0;
        continue;
      }

      const i3 = i * 3;
      smokeData.positions[i3] += smokeData.velocities[i3] * dt;
      smokeData.positions[i3 + 1] += smokeData.velocities[i3 + 1] * dt;
      smokeData.positions[i3 + 2] += smokeData.velocities[i3 + 2] * dt;

      const normAge = smokeData.ages[i] / life;
      smokeData.sizes[i] = smokeData.baseSizes[i] * (1.0 + normAge * 1.4);
      smokeData.alphas[i] =
        0.24 * graphics.smokeDensity * Math.sin(normAge * Math.PI);
    }

    if (smokeGeoRef.current) {
      smokeGeoRef.current.attributes.position.needsUpdate = true;
      smokeGeoRef.current.attributes.aSize.needsUpdate = true;
      smokeGeoRef.current.attributes.aAlpha.needsUpdate = true;
    }

    // 4. Update Dynamic Point Lights
    if (dynamicLight1Ref.current) {
      if (graphics.enableDynamicLights && brightestLightPos) {
        dynamicLight1Ref.current.position.set(...brightestLightPos);
        dynamicLight1Ref.current.color.set(brightestLightColor);
        const targetInt = reducedFlash
          ? Math.min(1.6, brightestLightIntensity * 0.45)
          : brightestLightIntensity;
        dynamicLight1Ref.current.intensity = THREE.MathUtils.lerp(
          dynamicLight1Ref.current.intensity,
          targetInt,
          0.35
        );
      } else {
        dynamicLight1Ref.current.intensity = THREE.MathUtils.lerp(
          dynamicLight1Ref.current.intensity,
          0,
          0.2
        );
      }
    }

    if (dynamicLight2Ref.current) {
      if (graphics.enableDynamicLights && secondLightPos) {
        dynamicLight2Ref.current.position.set(...secondLightPos);
        dynamicLight2Ref.current.color.set(secondLightColor);
        const targetInt = reducedFlash
          ? Math.min(2.0, secondLightIntensity * 0.4)
          : secondLightIntensity;
        dynamicLight2Ref.current.intensity = targetInt;
      } else {
        dynamicLight2Ref.current.intensity = THREE.MathUtils.lerp(
          dynamicLight2Ref.current.intensity,
          0,
          0.14
        );
      }
    }

    if (
      onActiveParticleCountChange &&
      state.clock.elapsedTime - lastCountReportRef.current > 0.25
    ) {
      lastCountReportRef.current = state.clock.elapsedTime;
      onActiveParticleCountChange(activeSparkCount);
    }
  });

  return (
    <group>
      {/* Smoke Particle Layer */}
      <points frustumCulled={false}>
        <bufferGeometry ref={smokeGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[smokeData.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[smokeData.colors, 3]}
          />
          <bufferAttribute
            attach="attributes-aSize"
            args={[smokeData.sizes, 1]}
          />
          <bufferAttribute
            attach="attributes-aAlpha"
            args={[smokeData.alphas, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={SPARK_SHADER_VERTEX}
          fragmentShader={SPARK_SHADER_FRAGMENT}
          uniforms={smokeUniforms}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {/* Additive Glowing Sparks & Aerial Bursts Layer */}
      <points frustumCulled={false}>
        <bufferGeometry ref={sparkGeoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[sparkData.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[sparkData.colors, 3]}
          />
          <bufferAttribute
            attach="attributes-aSize"
            args={[sparkData.sizes, 1]}
          />
          <bufferAttribute
            attach="attributes-aAlpha"
            args={[sparkData.alphas, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={SPARK_SHADER_VERTEX}
          fragmentShader={SPARK_SHADER_FRAGMENT}
          uniforms={sparkUniforms}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Controlled Dynamic Firework Lights */}
      <pointLight
        ref={dynamicLight1Ref}
        intensity={0}
        distance={9}
        decay={1.8}
      />
      <pointLight
        ref={dynamicLight2Ref}
        intensity={0}
        distance={16}
        decay={1.5}
      />
    </group>
  );
};
