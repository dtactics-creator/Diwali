import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CRACKERS } from '../../config/crackers';
import { CrackerId, PlacedCrackerInstance, RocketTrackData } from '../../types/game';

// ─── Cracker Fuse Offsets (in local model space) ────────────────────────────
export const CRACKER_FUSE_OFFSETS: Record<CrackerId, [number, number, number]> = {
  phuljhadi: [0, 0.52, 0],
  'flower-pot': [0.008, 0.363, 0],
  chakri: [0.175, 0.054, 0.02],
  rocket: [0, 0.352, 0],
  'aerial-fireworks': [0.215, 0.11, 0],
  'garland-cracker': [0, 0.054, -0.275],
};

/**
 * Calculates the exact 3D world-space coordinates of a placed cracker's fuse,
 * taking into account its position, Y-rotation, and physical fuse anchor offset.
 */
export function getCrackerWorldFusePosition(cracker: PlacedCrackerInstance): [number, number, number] {
  const [ox, oy, oz] = CRACKER_FUSE_OFFSETS[cracker.crackerId] || [0, 0.2, 0];
  const rotY = cracker.rotationY || 0;
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const worldX = cracker.position[0] + (ox * cos + oz * sin);
  const worldY = cracker.position[1] + oy;
  const worldZ = cracker.position[2] + (-ox * sin + oz * cos);
  return [worldX, worldY, worldZ];
}

// ─── Premium GuessMe.co Label Texture Generator ─────────────────────────────

function drawBrandLabel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bg1: string,
  bg2: string,
  gold: string,
  accent: string,
  productName: string,
  subName: string
) {
  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, bg1);
  grad.addColorStop(1, bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Metallic sheen overlay
  const sheen = ctx.createLinearGradient(0, 0, w, 0);
  sheen.addColorStop(0, 'rgba(255,255,255,0)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  // Top gold border band
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, w, Math.round(h * 0.14));

  // Bottom gold border band
  ctx.fillStyle = gold;
  ctx.fillRect(0, h - Math.round(h * 0.14), w, Math.round(h * 0.14));

  // Inner accent line on borders
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(h * 0.14) + 2);
  ctx.lineTo(w, Math.round(h * 0.14) + 2);
  ctx.moveTo(0, h - Math.round(h * 0.14) - 2);
  ctx.lineTo(w, h - Math.round(h * 0.14) - 2);
  ctx.stroke();

  // Decorative small diamonds along top/bottom border
  ctx.fillStyle = accent;
  for (let x = 8; x < w; x += 22) {
    const ty = Math.round(h * 0.07);
    ctx.beginPath();
    ctx.moveTo(x, ty - 4);
    ctx.lineTo(x + 4, ty);
    ctx.lineTo(x, ty + 4);
    ctx.lineTo(x - 4, ty);
    ctx.closePath();
    ctx.fill();
  }

  // Indian festive curved arch frame
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  const topY = Math.round(h * 0.18);
  const botY = Math.round(h * 0.82);
  ctx.strokeRect(6, topY, w - 12, botY - topY);

  // Corner ornaments
  const cornerSize = 6;
  [[6, topY], [w - 6, topY], [6, botY], [w - 6, botY]].forEach(([cx, cy]) => {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(cx, cy, cornerSize / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Brand name: GUESSME.CO in gold on dark bg area
  const centerY = h / 2;
  ctx.save();
  ctx.font = `bold ${Math.round(h * 0.17)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText('GUESSME.CO', w / 2 + 1, centerY - h * 0.09 + 1);
  // Gold text
  const textGrad = ctx.createLinearGradient(0, centerY - h * 0.14, 0, centerY - h * 0.04);
  textGrad.addColorStop(0, '#ffe07a');
  textGrad.addColorStop(0.5, '#fbbf24');
  textGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = textGrad;
  ctx.fillText('GUESSME.CO', w / 2, centerY - h * 0.09);
  ctx.restore();

  // Product name below brand
  ctx.save();
  ctx.font = `bold ${Math.round(h * 0.12)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 3;
  ctx.fillText(productName, w / 2, centerY + h * 0.05);
  ctx.restore();

  // Sub label (Hindi/tagline) below product name
  ctx.save();
  ctx.font = `${Math.round(h * 0.08)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.fillText(subName, w / 2, centerY + h * 0.19);
  ctx.restore();
}

function createPhuljhadiLabel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  // Vertical label for sparkler holder
  drawBrandLabel(ctx, 128, 256, '#78350f', '#92400e', '#fbbf24', '#fed7aa', 'PHULJHADI', 'फुलझड़ी • Sparkler');
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createFlowerPotLabel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  drawBrandLabel(ctx, 256, 256, '#991b1b', '#7f1d1d', '#fbbf24', '#fca5a5', 'FLOWER POT', 'अनार • Conical Fountain');
  return new THREE.CanvasTexture(canvas);
}

function createChakriLabel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  drawBrandLabel(ctx, 256, 128, '#064e3b', '#065f46', '#fbbf24', '#6ee7b7', 'ZAMEEN CHAKRI', 'ज़मीन चक्री • Ground Spinner');
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createRocketLabel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  drawBrandLabel(ctx, 128, 256, '#1e1b4b', '#312e81', '#fbbf24', '#a5b4fc', 'SKY ROCKET', 'रॉकेट • Aerial Burst');
  return new THREE.CanvasTexture(canvas);
}

function createAerialLabel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  drawBrandLabel(ctx, 256, 256, '#4c1d95', '#5b21b6', '#fbbf24', '#c4b5fd', 'AERIAL FIREWORKS', 'आकाशीय शॉट • Multi-Burst');
  return new THREE.CanvasTexture(canvas);
}

function createGarlandLabel(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  drawBrandLabel(ctx, 256, 64, '#881337', '#9f1239', '#fbbf24', '#fda4af', '100-WALA', 'लड़ी • Rapid Chain');
  return new THREE.CanvasTexture(canvas);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SingleCrackerMeshProps {
  crackerId: CrackerId;
  state: PlacedCrackerInstance['state'];
  elapsedInState: number;
  isPreview?: boolean;
  isValidPlacement?: boolean;
}

export const CrackerMeshVisual: React.FC<SingleCrackerMeshProps> = ({
  crackerId,
  state,
  elapsedInState,
  isPreview = false,
  isValidPlacement = true,
}) => {
  const spinGroupRef = useRef<THREE.Group>(null);
  const rocketBodyRef = useRef<THREE.Group>(null);
  const fuseGlowRef = useRef<THREE.Mesh>(null);
  const fuseSparkRef = useRef<THREE.Mesh>(null);

  // One label texture per cracker type — memoised to avoid re-creating every render
  const phuljhadiTex = useMemo(() => createPhuljhadiLabel(), []);
  const flowerPotTex = useMemo(() => createFlowerPotLabel(), []);
  const chakriTex = useMemo(() => createChakriLabel(), []);
  const rocketTex = useMemo(() => createRocketLabel(), []);
  const aerialTex = useMemo(() => createAerialLabel(), []);
  const garlandTex = useMemo(() => createGarlandLabel(), []);

  const isCompleted = state === 'Completed';
  const isIgniting = state === 'Igniting';
  const isActive = state === 'Active';
  const opacity = isPreview ? 0.72 : 1;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Chakri spin
    if (crackerId === 'chakri' && spinGroupRef.current) {
      if (isActive) {
        const slowdown = Math.max(0.2, 1 - elapsedInState / 6.2);
        spinGroupRef.current.rotation.y += dt * 30 * slowdown;
      } else if (isIgniting) {
        spinGroupRef.current.rotation.y += dt * 3;
      }
    }

    // Rocket ascent
    if (crackerId === 'rocket' && rocketBodyRef.current) {
      if (isActive) {
        const fP = Math.min(1, elapsedInState / 1.05);
        const altitude = Math.pow(fP, 1.85) * 6.2;
        rocketBodyRef.current.position.y = altitude;
        rocketBodyRef.current.visible = fP < 0.96;
      } else if (isCompleted) {
        rocketBodyRef.current.visible = false;
      } else {
        rocketBodyRef.current.position.y = 0;
        rocketBodyRef.current.visible = true;
      }
    }

    // Fuse glow pulse
    if (fuseGlowRef.current && (isIgniting || isActive)) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.025) * 0.3 + Math.random() * 0.15;
      fuseGlowRef.current.scale.setScalar(pulse);
    }

    // Tiny fuse spark orbit
    if (fuseSparkRef.current && (isIgniting || isActive)) {
      const angle = Date.now() * 0.008;
      fuseSparkRef.current.position.x = Math.cos(angle) * 0.025;
      fuseSparkRef.current.position.z = Math.sin(angle) * 0.025;
    }
  });

  // ── 1. PHULJHADI ──────────────────────────────────────────────────────────
  if (crackerId === 'phuljhadi') {
    return (
      <group>
        {/* Ornate Brass Stand Base */}
        <mesh position={[0, 0.022, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.07, 0.095, 0.044, 20]} />
          <meshStandardMaterial color={isCompleted ? '#52525b' : '#b45309'} metalness={0.82} roughness={0.22} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Stand collar */}
        <mesh position={[0, 0.048, 0]}>
          <cylinderGeometry args={[0.048, 0.065, 0.015, 20]} />
          <meshStandardMaterial color={isCompleted ? '#3f3f46' : '#d97706'} metalness={0.7} roughness={0.28} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Branded Holder Cylinder with label */}
        <mesh position={[0, 0.11, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.042, 0.042, 0.1, 16]} />
          <meshStandardMaterial map={phuljhadiTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.45} metalness={0.35} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Metallic Wire Stem */}
        <mesh position={[0, 0.36, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.006, 0.006, 0.52, 10]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.88} roughness={0.25} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Grey Pyrotechnic coating — gradually consumed when active */}
        <mesh position={[0, 0.37, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.019, 0.019, isActive ? Math.max(0.04, 0.38 * (1 - elapsedInState / 7.5)) : 0.38, 14]} />
          <meshStandardMaterial color={isCompleted ? '#27272a' : '#71717a'} roughness={0.95} transparent={isPreview} opacity={opacity} />
        </mesh>

        {/* Fuse effects */}
        {(isIgniting || isActive) && (
          <group position={[0, isActive ? Math.max(0.2, 0.52 - (elapsedInState / 7.5) * 0.32) : 0.52, 0]}>
            {/* Glow orb */}
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshBasicMaterial color="#fff8dc" />
            </mesh>
            {/* Tiny orbiting spark */}
            <mesh ref={fuseSparkRef} position={[0, 0, 0]}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          </group>
        )}

        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 2. FLOWER POT / ANAR ──────────────────────────────────────────────────
  if (crackerId === 'flower-pot') {
    return (
      <group>
        {/* Terracotta base disc */}
        <mesh position={[0, 0.012, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.155, 0.168, 0.024, 24]} />
          <meshStandardMaterial color={isCompleted ? '#3f3f46' : '#c2410c'} roughness={0.7} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold rim */}
        <mesh position={[0, 0.028, 0]}>
          <cylinderGeometry args={[0.152, 0.152, 0.012, 24]} />
          <meshStandardMaterial color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.65} roughness={0.3} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Conical body with branded label */}
        <mesh position={[0, 0.175, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.044, 0.148, 0.3, 28]} />
          <meshStandardMaterial map={flowerPotTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.42} metalness={0.28} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Clay nozzle at top */}
        <mesh position={[0, 0.332, 0]}>
          <cylinderGeometry args={[0.046, 0.046, 0.022, 20]} />
          <meshStandardMaterial
            color={isActive ? '#fef08a' : (isCompleted ? '#3f3f46' : '#d6d3d1')}
            emissive={isActive ? '#f97316' : '#000000'}
            emissiveIntensity={isActive ? 2.8 : 0}
          />
        </mesh>
        {/* Fuse wick */}
        {!isCompleted && (
          <mesh position={[0.008, 0.362, 0]} rotation={[0, 0, 0.22]}>
            <cylinderGeometry args={[0.007, 0.009, 0.058, 8]} />
            <meshStandardMaterial color="#fde047" roughness={0.7} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0.008, 0.363, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.034, 12, 12]} />
              <meshBasicMaterial color="#fffbeb" />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 3. ZAMEEN CHAKRI ──────────────────────────────────────────────────────
  if (crackerId === 'chakri') {
    return (
      <group>
        {/* Static ground pin */}
        <mesh position={[0, 0.016, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.032, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
        </mesh>

        {/* Spinning disc assembly */}
        <group ref={spinGroupRef} position={[0, 0.034, 0]}>
          {/* Outer emerald rim */}
          <mesh castShadow={!isPreview}>
            <cylinderGeometry args={[0.168, 0.168, 0.04, 30]} />
            <meshStandardMaterial color={isCompleted ? '#3f3f46' : '#059669'} metalness={0.3} roughness={0.45} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Branded disc body */}
          <mesh position={[0, 0.004, 0]}>
            <cylinderGeometry args={[0.148, 0.148, 0.038, 28]} />
            <meshStandardMaterial map={chakriTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.4} metalness={0.25} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Inner gold pivot */}
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.048, 20]} />
            <meshStandardMaterial color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.72} roughness={0.22} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Spiral pyrotechnic coil arms (3 arms) */}
          {[0, Math.PI * 0.667, Math.PI * 1.333].map((ang, ai) => (
            <mesh key={ai} position={[Math.cos(ang) * 0.09, 0, Math.sin(ang) * 0.09]} rotation={[Math.PI / 2, ang, 0]}>
              <cylinderGeometry args={[0.008, 0.013, 0.09, 8]} />
              <meshStandardMaterial color={isCompleted ? '#27272a' : '#10b981'} roughness={0.6} transparent={isPreview} opacity={opacity} />
            </mesh>
          ))}
          {/* Fuse */}
          {!isCompleted && (
            <mesh position={[0.168, 0, 0.04]} rotation={[0, 0.4, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, 0.065, 8]} />
              <meshStandardMaterial color="#fef08a" />
            </mesh>
          )}
          {(isIgniting || isActive) && (
            <group position={[0.175, 0.02, 0.02]}>
              <mesh ref={fuseGlowRef}>
                <sphereGeometry args={[0.032, 10, 10]} />
                <meshBasicMaterial color="#fde047" />
              </mesh>
              <mesh ref={fuseSparkRef}>
                <sphereGeometry args={[0.009, 6, 6]} />
                <meshBasicMaterial color="#fb923c" />
              </mesh>
            </group>
          )}
        </group>
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 4. SKY ROCKET ─────────────────────────────────────────────────────────
  if (crackerId === 'rocket') {
    return (
      <group>
        {/* Weighted amber glass launch bottle (stays on ground) */}
        <group>
          <mesh position={[0, 0.115, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.055, 0.064, 0.23, 20]} />
            <meshStandardMaterial color="#78350f" roughness={0.18} metalness={0.15} transparent opacity={isPreview ? 0.5 : 0.88} />
          </mesh>
          <mesh position={[0, 0.265, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.025, 0.052, 0.085, 16]} />
            <meshStandardMaterial color="#92400e" roughness={0.22} transparent opacity={isPreview ? 0.5 : 0.88} />
          </mesh>
          {/* Brass bottle rim */}
          <mesh position={[0, 0.313, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.018, 16]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.72} roughness={0.22} />
          </mesh>
        </group>

        {/* Launchable rocket assembly */}
        <group ref={rocketBodyRef}>
          {/* Bamboo guide stick */}
          <mesh position={[0.013, 0.37, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.006, 0.006, 0.65, 8]} />
            <meshStandardMaterial color="#d97706" roughness={0.82} />
          </mesh>
          {/* Motor tube with branded label */}
          <mesh position={[0, 0.51, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.038, 0.038, 0.25, 20]} />
            <meshStandardMaterial map={rocketTex} roughness={0.4} metalness={0.32} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Gold nose cone */}
          <mesh position={[0, 0.66, 0]} castShadow={!isPreview}>
            <coneGeometry args={[0.042, 0.115, 20]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.68} roughness={0.22} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Stabilizer fins (3) */}
          {[0, Math.PI * 0.667, Math.PI * 1.333].map((ang, fi) => (
            <mesh key={fi} position={[Math.cos(ang) * 0.04, 0.4, Math.sin(ang) * 0.04]} rotation={[0, ang, 0.35]}>
              <boxGeometry args={[0.005, 0.06, 0.055]} />
              <meshStandardMaterial color="#e11d48" metalness={0.4} roughness={0.5} transparent={isPreview} opacity={opacity} />
            </mesh>
          ))}
          {/* Bottom fuse */}
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, -0.15]}>
            <cylinderGeometry args={[0.006, 0.006, 0.068, 8]} />
            <meshStandardMaterial color="#fef08a" />
          </mesh>
          {(isIgniting || isActive) && (
            <group position={[0, 0.352, 0]}>
              <mesh ref={fuseGlowRef}>
                <sphereGeometry args={[0.038, 12, 12]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
              <mesh ref={fuseSparkRef}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshBasicMaterial color="#fde047" />
              </mesh>
            </group>
          )}
        </group>
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 5. AERIAL FIREWORKS CAKE ───────────────────────────────────────────────
  if (crackerId === 'aerial-fireworks') {
    const tubePositions: [number, number][] = [
      [0, 0], [0.095, 0], [-0.095, 0],
      [0.048, 0.082], [-0.048, 0.082],
      [0.048, -0.082], [-0.048, -0.082],
    ];
    return (
      <group>
        {/* Heavy hexagonal base */}
        <mesh position={[0, 0.022, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.205, 0.215, 0.044, 6]} />
          <meshStandardMaterial color={isCompleted ? '#27272a' : '#7e1d48'} roughness={0.62} transparent={isPreview} opacity={opacity} />
        </mesh>

        {/* Branded outer jacket */}
        <mesh position={[0, 0.175, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.178, 0.178, 0.27, 6]} />
          <meshStandardMaterial map={aerialTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.4} metalness={0.32} transparent={isPreview} opacity={opacity} />
        </mesh>

        {/* 7 mortar tubes */}
        {tubePositions.map(([tx, tz], idx) => (
          <group key={idx} position={[tx, 0.175, tz]}>
            <mesh>
              <cylinderGeometry args={[0.043, 0.043, 0.27, 16]} />
              <meshStandardMaterial
                color={isCompleted ? '#3f3f46' : '#fbbf24'}
                metalness={0.52} roughness={0.32}
              />
            </mesh>
            {/* Tube mouth */}
            <mesh position={[0, 0.137, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.01, 14]} />
              <meshBasicMaterial color={isActive ? '#fde047' : (isCompleted ? '#18181b' : '#09090b')} />
            </mesh>
          </group>
        ))}

        {/* Side ignition fuse */}
        {!isCompleted && (
          <mesh position={[0.185, 0.085, 0]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
            <meshStandardMaterial color="#fde047" />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={isActive ? [0, 0.325, 0] : [0.215, 0.11, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshBasicMaterial color="#c084fc" />
            </mesh>
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 6. 100-WALA GARLAND CRACKER ───────────────────────────────────────────
  if (crackerId === 'garland-cracker') {
    return (
      <group position={[0, 0.026, 0]}>
        {/* Central braided fuse cord */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.58, 10]} />
          <meshStandardMaterial color={isCompleted ? '#27272a' : '#fde047'} roughness={0.8} />
        </mesh>

        {/* Branded band wrapping the garland */}
        <mesh position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.06, 10]} />
          <meshStandardMaterial map={garlandTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.5} metalness={0.2} />
        </mesh>

        {/* 14 alternating red/gold firecracker cylinders */}
        {Array.from({ length: 14 }).map((_, i) => {
          const zOffset = -0.255 + i * 0.038;
          const side = i % 2 === 0 ? 1 : -1;
          const hasFired = isCompleted || (isActive && elapsedInState / 5.2 > i / 14);
          return (
            <group key={i} position={[side * 0.058, hasFired ? -0.008 : 0, zOffset]} rotation={[0, side * 0.25, Math.PI / 2]}>
              {/* Main cracker body */}
              <mesh castShadow={!isPreview}>
                <cylinderGeometry args={[0.019, 0.019, 0.1, 12]} />
                <meshStandardMaterial
                  color={hasFired ? '#292524' : '#dc2626'}
                  roughness={0.65}
                  transparent={isPreview}
                  opacity={opacity}
                />
              </mesh>
              {/* Gold label band */}
              {!hasFired && (
                <mesh position={[0, 0.024, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.018, 12]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.62} roughness={0.28} />
                </mesh>
              )}
              {/* End caps */}
              {!hasFired && (
                <>
                  <mesh position={[0, 0.052, 0]}>
                    <cylinderGeometry args={[0.019, 0.019, 0.005, 12]} />
                    <meshStandardMaterial color="#fde047" metalness={0.4} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, -0.052, 0]}>
                    <cylinderGeometry args={[0.019, 0.019, 0.005, 12]} />
                    <meshStandardMaterial color="#fde047" metalness={0.4} roughness={0.4} />
                  </mesh>
                </>
              )}
            </group>
          );
        })}

        {(isIgniting || isActive) && (
          <group position={[0, 0.028, isActive ? -0.255 + Math.min(1, elapsedInState / 5.2) * 0.51 : -0.275]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.034, 12, 12]} />
              <meshBasicMaterial color="#fffbeb" />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
          </group>
        )}

        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  return null;
};

// ─── Shared Preview Ring ─────────────────────────────────────────────────────
function PreviewRing({ isValidPlacement }: { isValidPlacement: boolean }) {
  return (
    <group position={[0, 0.006, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.34, 36]} />
        <meshBasicMaterial
          color={isValidPlacement ? '#22c55e' : '#ef4444'}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.26, 36]} />
        <meshBasicMaterial
          color={isValidPlacement ? '#4ade80' : '#f87171'}
          side={THREE.DoubleSide}
          transparent
          opacity={0.22}
        />
      </mesh>
    </group>
  );
}

// ─── PlacedCrackersManager3D (unchanged API) ─────────────────────────────────

interface PlacedCrackersManager3DProps {
  placedCrackers: PlacedCrackerInstance[];
  nearestInteractableId: string | null;
  currentTimeMs: number;
  onSelectPlacedCracker: (instanceId: string) => void;
  rocketTrackRef?: React.MutableRefObject<RocketTrackData>;
}

export const PlacedCrackersManager3D: React.FC<PlacedCrackersManager3DProps> = ({
  placedCrackers,
  nearestInteractableId,
  currentTimeMs,
  onSelectPlacedCracker,
  rocketTrackRef: _rocketTrackRef,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    // Placed crackers remain permanently stationary & visible in world space
    if (groupRef.current) {
      groupRef.current.visible = true;
    }
  });

  return (
    <group ref={groupRef}>
      {placedCrackers.map((item) => {
        const config = CRACKERS[item.crackerId];
        const isNearest = nearestInteractableId === item.instanceId;

        let elapsedInState = 0;
        if (item.state === 'Igniting' && item.ignitedAt) {
          elapsedInState = (currentTimeMs - item.ignitedAt) / 1000;
        } else if (item.state === 'Active' && item.activeStartedAt) {
          elapsedInState = (currentTimeMs - item.activeStartedAt) / 1000;
        }

        return (
          <group
            key={item.instanceId}
            position={item.position}
            rotation={[0, item.rotationY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              // Strict Proximity: only trigger interaction if character is within range
              if (item.state === 'Placed' && isNearest) onSelectPlacedCracker(item.instanceId);
            }}
          >
            {/* Ground contact shadow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
              <circleGeometry args={[0.22, 22]} />
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={item.state === 'Completed' ? 0.2 : 0.42}
                depthWrite={false}
              />
            </mesh>

            {/* Placed highlight ring */}
            {item.state === 'Placed' && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
                <ringGeometry args={isNearest ? [0.25, 0.32, 32] : [0.22, 0.26, 32]} />
                <meshBasicMaterial
                  color={isNearest ? '#fbbf24' : config.accentColor}
                  transparent
                  opacity={isNearest ? 0.92 : 0.55}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Safety warning pulse ring during igniting */}
            {item.state === 'Igniting' && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
                <ringGeometry args={[0.27, 0.35, 32]} />
                <meshBasicMaterial color="#f97316" transparent opacity={0.85} side={THREE.DoubleSide} />
              </mesh>
            )}

            <CrackerMeshVisual
              crackerId={item.crackerId}
              state={item.state}
              elapsedInState={elapsedInState}
            />
          </group>
        );
      })}
    </group>
  );
};
