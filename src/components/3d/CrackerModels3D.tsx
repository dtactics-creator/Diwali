import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CRACKERS } from '../../config/crackers';
import { CrackerId, PlacedCrackerInstance, RocketTrackData } from '../../types/game';
import {
  getSurfaceNormalMap,
  getSurfaceRoughnessMap,
} from '../../utils/materialTextures';

// ─── Cracker Fuse Offsets (derived from each cracker's config) ──────────────
// The fuse anchor lives in the cracker configuration (Section 5) so models and
// interaction logic share a single source of truth.
export const CRACKER_FUSE_OFFSETS: Record<CrackerId, [number, number, number]> =
  (Object.keys(CRACKERS) as CrackerId[]).reduce(
    (acc, id) => {
      acc[id] = CRACKERS[id].fuseOffset;
      return acc;
    },
    {} as Record<CrackerId, [number, number, number]>
  );

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

/**
 * Generic branded-label factory used by the expanded cracker collection. Keeps
 * the GuessMe.co branding consistent while letting each new cracker supply its
 * own palette, printed product name and Hindi sub-label.
 */
function createBrandedLabel(
  w: number,
  h: number,
  bg1: string,
  bg2: string,
  gold: string,
  accent: string,
  productName: string,
  subName: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  drawBrandLabel(ctx, w, h, bg1, bg2, gold, accent, productName, subName);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Tags a printed-label canvas as an sRGB colour map and applies the quality
 * preset's anisotropy / mipmap filtering. Printed packaging colour artwork
 * must never be treated as linear data.
 */
function finishLabelTex(
  tex: THREE.CanvasTexture,
  anisotropy: number,
  clampV = false
): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = clampV ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface SingleCrackerMeshProps {
  crackerId: CrackerId;
  state: PlacedCrackerInstance['state'];
  elapsedInState: number;
  isPreview?: boolean;
  isValidPlacement?: boolean;
  /** Resolution of the generated procedural PBR detail maps (quality preset). */
  textureSize?: number;
  /** Texture filtering budget from the active quality preset. */
  anisotropy?: number;
  /** Master switch for image-based lighting reflections. */
  useEnvMap?: boolean;
}

export const CrackerMeshVisual: React.FC<SingleCrackerMeshProps> = ({
  crackerId,
  state,
  elapsedInState,
  isPreview = false,
  isValidPlacement = true,
  textureSize = 256,
  anisotropy = 4,
  useEnvMap = true,
}) => {
  const spinGroupRef = useRef<THREE.Group>(null);
  const rocketBodyRef = useRef<THREE.Group>(null);
  const fuseGlowRef = useRef<THREE.Mesh>(null);
  const fuseSparkRef = useRef<THREE.Mesh>(null);

  // One label texture per cracker type — memoised to avoid re-creating every render
  const phuljhadiTex = useMemo(() => finishLabelTex(createPhuljhadiLabel(), anisotropy, true), [anisotropy]);
  const flowerPotTex = useMemo(() => finishLabelTex(createFlowerPotLabel(), anisotropy), [anisotropy]);
  const chakriTex = useMemo(() => finishLabelTex(createChakriLabel(), anisotropy), [anisotropy]);
  const rocketTex = useMemo(() => finishLabelTex(createRocketLabel(), anisotropy, true), [anisotropy]);
  const aerialTex = useMemo(() => finishLabelTex(createAerialLabel(), anisotropy), [anisotropy]);
  const garlandTex = useMemo(() => finishLabelTex(createGarlandLabel(), anisotropy), [anisotropy]);

  // Labels for the expanded traditional cracker collection
  const bijiliTex = useMemo(
    () => finishLabelTex(createBrandedLabel(128, 128, '#7f1d1d', '#991b1b', '#fbbf24', '#fecaca', 'BIJILI', 'बिजली • Sharp Crack'), anisotropy),
    [anisotropy]
  );
  const smallGroundTex = useMemo(
    () => finishLabelTex(createBrandedLabel(256, 128, '#78350f', '#92400e', '#fbbf24', '#fcd34d', 'CHOTA ZAMEEN', 'छोटा ज़मीन • Ground'), anisotropy),
    [anisotropy]
  );
  const largeGroundTex = useMemo(
    () => finishLabelTex(createBrandedLabel(256, 256, '#7c2d12', '#9a3412', '#fbbf24', '#fdba74', 'BADA ZAMEEN', 'बड़ा ज़मीन • Heavy Blast'), anisotropy),
    [anisotropy]
  );
  const paperBombTex = useMemo(
    () => finishLabelTex(createBrandedLabel(256, 256, '#78350f', '#57534e', '#fbbf24', '#e7e5e4', 'PAPER BOMB', 'पेपर बम • Kadhai'), anisotropy),
    [anisotropy]
  );
  const lakshmiTex = useMemo(
    () => finishLabelTex(createBrandedLabel(256, 256, '#a16207', '#854d0e', '#fde047', '#fef08a', 'LAKSHMI', 'लक्ष्मी • Golden Shower'), anisotropy),
    [anisotropy]
  );
  const kuruviTex = useMemo(
    () => finishLabelTex(createBrandedLabel(128, 128, '#14532d', '#166534', '#fbbf24', '#bbf7d0', 'KURUVI', 'कुरुवी • Sparrow'), anisotropy),
    [anisotropy]
  );
  const singleShotTex = useMemo(
    () => finishLabelTex(createBrandedLabel(128, 256, '#0c4a6e', '#075985', '#fbbf24', '#7dd3fc', 'SINGLE SHOT', 'सिंगल शॉट • Shell'), anisotropy, true),
    [anisotropy]
  );

  // ── Procedural PBR surface maps (shared via the global texture cache) ──────
  // Each cracker part gets the correct physical surface: matte printed paper,
  // corrugated greyboard cardboard, crumpled metallic foil, glossy plastic
  // film, matte fuse coating and brushed metal hardware.
  const paperOpts = useMemo(
    () => ({ size: textureSize, repeatX: 2, repeatY: 2, anisotropy }),
    [textureSize, anisotropy]
  );
  const boardOpts = useMemo(
    () => ({ size: textureSize, repeatX: 3, repeatY: 2, anisotropy }),
    [textureSize, anisotropy]
  );
  const foilOpts = useMemo(
    () => ({ size: textureSize, repeatX: 2, repeatY: 2, anisotropy }),
    [textureSize, anisotropy]
  );
  const plasticOpts = useMemo(
    () => ({ size: Math.min(128, textureSize), repeatX: 2, repeatY: 2, anisotropy }),
    [textureSize, anisotropy]
  );

  const paperNormal = useMemo(() => getSurfaceNormalMap('paper', paperOpts, 0.7), [paperOpts]);
  const paperRough = useMemo(() => getSurfaceRoughnessMap('paper', paperOpts, 0.45), [paperOpts]);
  const boardNormal = useMemo(() => getSurfaceNormalMap('cardboard', boardOpts, 0.8), [boardOpts]);
  const boardRough = useMemo(() => getSurfaceRoughnessMap('cardboard', boardOpts, 0.4), [boardOpts]);
  const foilNormal = useMemo(() => getSurfaceNormalMap('foil', foilOpts, 0.5), [foilOpts]);
  const foilRough = useMemo(() => getSurfaceRoughnessMap('foil', foilOpts, 0.3), [foilOpts]);
  const plasticNormal = useMemo(() => getSurfaceNormalMap('plastic', plasticOpts, 0.6), [plasticOpts]);
  const plasticRough = useMemo(() => getSurfaceRoughnessMap('plastic', plasticOpts, 0.25), [plasticOpts]);
  const metalNormal = useMemo(
    () => getSurfaceNormalMap('brushedMetal', { size: Math.min(128, textureSize), anisotropy }, 0.5),
    [textureSize, anisotropy]
  );

  // Reusable material-prop bundles. Metalness stays near-zero for printed
  // paper/cardboard so only genuine foil and metal hardware read as shiny.
  const paperMat = useMemo(
    () => ({
      normalMap: paperNormal,
      roughnessMap: paperRough,
      envMapIntensity: useEnvMap ? 0.35 : 0.05,
    }),
    [paperNormal, paperRough, useEnvMap]
  );
  const boardMat = useMemo(
    () => ({
      normalMap: boardNormal,
      roughnessMap: boardRough,
      envMapIntensity: useEnvMap ? 0.45 : 0.05,
    }),
    [boardNormal, boardRough, useEnvMap]
  );
  const foilMat = useMemo(
    () => ({
      normalMap: foilNormal,
      roughnessMap: foilRough,
      envMapIntensity: useEnvMap ? 1.0 : 0.2,
    }),
    [foilNormal, foilRough, useEnvMap]
  );
  const plasticMat = useMemo(
    () => ({
      normalMap: plasticNormal,
      roughnessMap: plasticRough,
      envMapIntensity: useEnvMap ? 0.8 : 0.15,
    }),
    [plasticNormal, plasticRough, useEnvMap]
  );
  const metalMat = useMemo(
    () => ({ normalMap: metalNormal, envMapIntensity: useEnvMap ? 1.0 : 0.25 }),
    [metalNormal, useEnvMap]
  );
  const fuseMat = useMemo(
    () => ({
      normalMap: paperNormal,
      roughnessMap: paperRough,
      envMapIntensity: useEnvMap ? 0.15 : 0.02,
    }),
    [paperNormal, paperRough, useEnvMap]
  );

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
          <meshStandardMaterial {...metalMat} color={isCompleted ? '#52525b' : '#b45309'} metalness={0.82} roughness={0.32} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Stand collar */}
        <mesh position={[0, 0.048, 0]}>
          <cylinderGeometry args={[0.048, 0.065, 0.015, 20]} />
          <meshStandardMaterial {...metalMat} color={isCompleted ? '#3f3f46' : '#d97706'} metalness={0.7} roughness={0.34} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Branded Holder Cylinder with printed paper label */}
        <mesh position={[0, 0.11, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.042, 0.042, 0.1, 16]} />
          <meshStandardMaterial {...paperMat} map={phuljhadiTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.88} metalness={0.05} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Metallic Wire Stem */}
        <mesh position={[0, 0.36, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.006, 0.006, 0.52, 10]} />
          <meshStandardMaterial {...metalMat} color="#a1a1aa" metalness={0.88} roughness={0.3} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Grey pyrotechnic composition coating — glows then is consumed when active */}
        <mesh position={[0, 0.37, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.019, 0.019, isActive ? Math.max(0.04, 0.38 * (1 - elapsedInState / 7.5)) : 0.38, 14]} />
          <meshStandardMaterial
            {...fuseMat}
            color={isCompleted ? '#27272a' : (isActive ? '#fdba74' : '#71717a')}
            emissive={isActive ? '#f97316' : '#000000'}
            emissiveIntensity={isActive ? 1.6 : 0}
            roughness={0.96}
            transparent={isPreview}
            opacity={opacity}
          />
        </mesh>

        {/* Fuse effects */}
        {(isIgniting || isActive) && (
          <group position={[0, isActive ? Math.max(0.2, 0.52 - (elapsedInState / 7.5) * 0.32) : 0.52, 0]}>
            {/* Glow orb — emissive so it reads as real light, not a flat decal */}
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial
                color="#fff8dc"
                emissive="#ffb340"
                emissiveIntensity={3.2}
                roughness={1}
                metalness={0}
                toneMapped={false}
              />
            </mesh>
            {/* Tiny orbiting spark */}
            <mesh ref={fuseSparkRef} position={[0, 0, 0]}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#fde047" toneMapped={false} />
            </mesh>
            {/* Subtle local light contribution from the burning fuse */}
            <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
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
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#c2410c'} roughness={0.8} metalness={0.02} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold rim */}
        <mesh position={[0, 0.028, 0]}>
          <cylinderGeometry args={[0.152, 0.152, 0.012, 24]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.72} roughness={0.28} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Conical body with printed cardboard label */}
        <mesh position={[0, 0.175, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.044, 0.148, 0.3, 28]} />
          <meshStandardMaterial {...boardMat} map={flowerPotTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.82} metalness={0.04} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Clay nozzle at top */}
        <mesh position={[0, 0.332, 0]}>
          <cylinderGeometry args={[0.046, 0.046, 0.022, 20]} />
          <meshStandardMaterial
            normalMap={boardNormal}
            roughness={0.8}
            metalness={0.02}
            color={isActive ? '#fef08a' : (isCompleted ? '#3f3f46' : '#d6d3d1')}
            emissive={isActive ? '#f97316' : '#000000'}
            emissiveIntensity={isActive ? 2.8 : 0}
          />
        </mesh>
        {/* Fuse wick — matte coated paper, glows softly while igniting */}
        {!isCompleted && (
          <mesh position={[0.008, 0.362, 0]} rotation={[0, 0, 0.22]}>
            <cylinderGeometry args={[0.007, 0.009, 0.058, 8]} />
            <meshStandardMaterial
              {...fuseMat}
              color="#fde047"
              emissive={isIgniting ? '#f59e0b' : '#000000'}
              emissiveIntensity={isIgniting ? 1.4 : 0}
              roughness={0.78}
            />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0.008, 0.363, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.034, 12, 12]} />
              <meshStandardMaterial
                color="#fffbeb"
                emissive="#ffb340"
                emissiveIntensity={3.4}
                roughness={1}
                metalness={0}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#fbbf24" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
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
          <meshStandardMaterial {...metalMat} color="#fbbf24" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Spinning disc assembly */}
        <group ref={spinGroupRef} position={[0, 0.034, 0]}>
          {/* Outer emerald rim */}
          <mesh castShadow={!isPreview}>
            <cylinderGeometry args={[0.168, 0.168, 0.04, 30]} />
            <meshStandardMaterial {...paperMat} color={isCompleted ? '#3f3f46' : '#059669'} metalness={0.06} roughness={0.8} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Branded disc body (printed paper wrap) */}
          <mesh position={[0, 0.004, 0]}>
            <cylinderGeometry args={[0.148, 0.148, 0.038, 28]} />
            <meshStandardMaterial {...paperMat} map={chakriTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.86} metalness={0.05} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Inner gold pivot */}
          <mesh position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.048, 20]} />
            <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.75} roughness={0.26} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Spiral pyrotechnic coil arms (3 arms) */}
          {[0, Math.PI * 0.667, Math.PI * 1.333].map((ang, ai) => (
            <mesh key={ai} position={[Math.cos(ang) * 0.09, 0, Math.sin(ang) * 0.09]} rotation={[Math.PI / 2, ang, 0]}>
              <cylinderGeometry args={[0.008, 0.013, 0.09, 8]} />
              <meshStandardMaterial {...fuseMat} color={isCompleted ? '#27272a' : '#10b981'} roughness={0.75} transparent={isPreview} opacity={opacity} />
            </mesh>
          ))}
          {/* Fuse */}
          {!isCompleted && (
            <mesh position={[0.168, 0, 0.04]} rotation={[0, 0.4, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, 0.065, 8]} />
              <meshStandardMaterial
                {...fuseMat}
                color="#fef08a"
                emissive={isIgniting ? '#f59e0b' : '#000000'}
                emissiveIntensity={isIgniting ? 1.4 : 0}
              />
            </mesh>
          )}
          {(isIgniting || isActive) && (
            <group position={[0.175, 0.02, 0.02]}>
              <mesh ref={fuseGlowRef}>
                <sphereGeometry args={[0.032, 10, 10]} />
                <meshStandardMaterial
                  color="#fde047"
                  emissive="#ff9d2f"
                  emissiveIntensity={3.2}
                  roughness={1}
                  metalness={0}
                  toneMapped={false}
                />
              </mesh>
              <mesh ref={fuseSparkRef}>
                <sphereGeometry args={[0.009, 6, 6]} />
                <meshBasicMaterial color="#fb923c" toneMapped={false} />
              </mesh>
              <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
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
            <meshStandardMaterial {...plasticMat} color="#78350f" roughness={0.22} metalness={0.1} transparent opacity={isPreview ? 0.5 : 0.88} />
          </mesh>
          <mesh position={[0, 0.265, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.025, 0.052, 0.085, 16]} />
            <meshStandardMaterial {...plasticMat} color="#92400e" roughness={0.26} transparent opacity={isPreview ? 0.5 : 0.88} />
          </mesh>
          {/* Brass bottle rim */}
          <mesh position={[0, 0.313, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.018, 16]} />
            <meshStandardMaterial {...metalMat} color="#fbbf24" metalness={0.72} roughness={0.26} />
          </mesh>
        </group>

        {/* Launchable rocket assembly */}
        <group ref={rocketBodyRef}>
          {/* Bamboo guide stick */}
          <mesh position={[0.013, 0.37, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.006, 0.006, 0.65, 8]} />
            <meshStandardMaterial {...fuseMat} color="#d97706" roughness={0.85} />
          </mesh>
          {/* Motor tube with printed cardboard label */}
          <mesh position={[0, 0.51, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.038, 0.038, 0.25, 20]} />
            <meshStandardMaterial {...boardMat} map={rocketTex} roughness={0.84} metalness={0.06} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Gold nose cone */}
          <mesh position={[0, 0.66, 0]} castShadow={!isPreview}>
            <coneGeometry args={[0.042, 0.115, 20]} />
            <meshStandardMaterial {...foilMat} color="#fbbf24" metalness={0.7} roughness={0.26} transparent={isPreview} opacity={opacity} />
          </mesh>
          {/* Stabilizer fins (3) */}
          {[0, Math.PI * 0.667, Math.PI * 1.333].map((ang, fi) => (
            <mesh key={fi} position={[Math.cos(ang) * 0.04, 0.4, Math.sin(ang) * 0.04]} rotation={[0, ang, 0.35]}>
              <boxGeometry args={[0.005, 0.06, 0.055]} />
              <meshStandardMaterial {...plasticMat} color="#e11d48" metalness={0.08} roughness={0.62} transparent={isPreview} opacity={opacity} />
            </mesh>
          ))}
          {/* Bottom fuse */}
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, -0.15]}>
            <cylinderGeometry args={[0.006, 0.006, 0.068, 8]} />
            <meshStandardMaterial
              {...fuseMat}
              color="#fef08a"
              emissive={isIgniting ? '#f59e0b' : '#000000'}
              emissiveIntensity={isIgniting ? 1.4 : 0}
            />
          </mesh>
          {(isIgniting || isActive) && (
            <group position={[0, 0.352, 0]}>
              <mesh ref={fuseGlowRef}>
                <sphereGeometry args={[0.038, 12, 12]} />
                <meshStandardMaterial
                  color="#ffffff"
                  emissive="#ffb954"
                  emissiveIntensity={3.4}
                  roughness={1}
                  metalness={0}
                  toneMapped={false}
                />
              </mesh>
              <mesh ref={fuseSparkRef}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshBasicMaterial color="#fde047" toneMapped={false} />
              </mesh>
              <pointLight color="#ffab40" intensity={0.55} distance={1.4} decay={2} />
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
        {/* Heavy hexagonal base (greyboard) */}
        <mesh position={[0, 0.022, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.205, 0.215, 0.044, 6]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#27272a' : '#7e1d48'} roughness={0.82} metalness={0.03} transparent={isPreview} opacity={opacity} />
        </mesh>

        {/* Branded outer jacket (printed cardboard) */}
        <mesh position={[0, 0.175, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.178, 0.178, 0.27, 6]} />
          <meshStandardMaterial {...boardMat} map={aerialTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.82} metalness={0.05} transparent={isPreview} opacity={opacity} />
        </mesh>

        {/* 7 gold-foil mortar tubes */}
        {tubePositions.map(([tx, tz], idx) => (
          <group key={idx} position={[tx, 0.175, tz]}>
            <mesh>
              <cylinderGeometry args={[0.043, 0.043, 0.27, 16]} />
              <meshStandardMaterial
                {...foilMat}
                color={isCompleted ? '#3f3f46' : '#fbbf24'}
                metalness={0.62} roughness={0.3}
              />
            </mesh>
            {/* Tube mouth */}
            <mesh position={[0, 0.137, 0]}>
              <cylinderGeometry args={[0.034, 0.034, 0.01, 14]} />
              <meshBasicMaterial color={isActive ? '#fde047' : (isCompleted ? '#18181b' : '#09090b')} toneMapped={!isActive} />
            </mesh>
          </group>
        ))}

        {/* Side ignition fuse */}
        {!isCompleted && (
          <mesh position={[0.185, 0.085, 0]} rotation={[0, 0, -0.6]}>
            <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
            <meshStandardMaterial
              {...fuseMat}
              color="#fde047"
              emissive={isIgniting ? '#f59e0b' : '#000000'}
              emissiveIntensity={isIgniting ? 1.4 : 0}
            />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={isActive ? [0, 0.325, 0] : [0.215, 0.11, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#ffb340"
                emissiveIntensity={3.2}
                roughness={1}
                metalness={0}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.012, 6, 6]} />
              <meshBasicMaterial color="#c084fc" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.55} distance={1.4} decay={2} />
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
          <meshStandardMaterial {...fuseMat} color={isCompleted ? '#27272a' : '#fde047'} roughness={0.85} />
        </mesh>

        {/* Branded band wrapping the garland (printed paper) */}
        <mesh position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.06, 10]} />
          <meshStandardMaterial {...paperMat} map={garlandTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.86} metalness={0.05} />
        </mesh>

        {/* 14 alternating red/gold firecracker cylinders (matte paper wrapping) */}
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
                  {...paperMat}
                  color={hasFired ? '#292524' : '#dc2626'}
                  roughness={0.82}
                  metalness={0.03}
                  transparent={isPreview}
                  opacity={opacity}
                />
              </mesh>
              {/* Gold foil label band */}
              {!hasFired && (
                <mesh position={[0, 0.024, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.018, 12]} />
                  <meshStandardMaterial {...foilMat} color="#fbbf24" metalness={0.68} roughness={0.28} />
                </mesh>
              )}
              {/* End caps */}
              {!hasFired && (
                <>
                  <mesh position={[0, 0.052, 0]}>
                    <cylinderGeometry args={[0.019, 0.019, 0.005, 12]} />
                    <meshStandardMaterial {...paperMat} color="#fde047" metalness={0.1} roughness={0.6} />
                  </mesh>
                  <mesh position={[0, -0.052, 0]}>
                    <cylinderGeometry args={[0.019, 0.019, 0.005, 12]} />
                    <meshStandardMaterial {...paperMat} color="#fde047" metalness={0.1} roughness={0.6} />
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
              <meshStandardMaterial
                color="#fffbeb"
                emissive="#ffb340"
                emissiveIntensity={3.2}
                roughness={1}
                metalness={0}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#f97316" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
          </group>
        )}

        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 7. BIJILI — Small crimson lightning cracker ────────────────────────────
  if (crackerId === 'bijili') {
    return (
      <group>
        {/* Clay base pad */}
        <mesh position={[0, 0.008, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.037, 0.041, 0.016, 14]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#b45309'} roughness={0.86} metalness={0.02} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Printed crimson paper barrel */}
        <mesh position={[0, 0.056, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.031, 0.033, 0.08, 18]} />
          <meshStandardMaterial {...paperMat} map={bijiliTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.88} metalness={0.04} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold foil collar */}
        <mesh position={[0, 0.098, 0]}>
          <cylinderGeometry args={[0.034, 0.034, 0.012, 18]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.7} roughness={0.28} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Sealed paper top */}
        <mesh position={[0, 0.108, 0]}>
          <cylinderGeometry args={[0.027, 0.032, 0.011, 14]} />
          <meshStandardMaterial {...paperMat} color={isCompleted ? '#3f3f46' : '#f5f5f4'} roughness={0.9} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Green safety fuse */}
        {!isCompleted && (
          <mesh position={[0.013, 0.126, 0]} rotation={[0, 0, -0.32]}>
            <cylinderGeometry args={[0.005, 0.006, 0.046, 8]} />
            <meshStandardMaterial {...fuseMat} color="#16a34a" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.8} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0, 0.14, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.026, 10, 10]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.2} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshBasicMaterial color="#fde047" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 8. CHOTA ZAMEEN — Small wide ground cracker ────────────────────────────
  if (crackerId === 'small-ground') {
    return (
      <group>
        {/* Flat pressed base */}
        <mesh position={[0, 0.009, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.077, 0.08, 0.018, 20]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#c2410c'} roughness={0.84} metalness={0.03} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Printed squat paper body */}
        <mesh position={[0, 0.048, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.07, 0.073, 0.062, 20]} />
          <meshStandardMaterial {...paperMat} map={smallGroundTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.88} metalness={0.04} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold band */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.072, 0.072, 0.01, 20]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.7} roughness={0.28} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Creased paper crimp top */}
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.012, 16]} />
          <meshStandardMaterial {...paperMat} color={isCompleted ? '#3f3f46' : '#fde68a'} roughness={0.92} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Side fuse */}
        {!isCompleted && (
          <mesh position={[0.072, 0.05, 0]} rotation={[0, 0, Math.PI / 2 + 0.25]}>
            <cylinderGeometry args={[0.006, 0.007, 0.05, 8]} />
            <meshStandardMaterial {...fuseMat} color="#fef08a" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.8} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0.085, 0.058, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.03, 10, 10]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.2} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.009, 6, 6]} />
              <meshBasicMaterial color="#fb923c" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 9. BADA ZAMEEN — Heavy ground salute block ─────────────────────────────
  if (crackerId === 'large-ground') {
    return (
      <group>
        {/* Weighted greyboard plinth */}
        <mesh position={[0, 0.015, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.105, 0.112, 0.03, 22]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#7c2d12'} roughness={0.85} metalness={0.03} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold wrap band */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.101, 0.101, 0.012, 22]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.72} roughness={0.28} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Heavy printed block body */}
        <mesh position={[0, 0.075, 0]} castShadow={!isPreview}>
          <boxGeometry args={[0.15, 0.09, 0.15]} />
          <meshStandardMaterial {...boardMat} map={largeGroundTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.86} metalness={0.04} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Slightly tapered cap */}
        <mesh position={[0, 0.128, 0]} castShadow={!isPreview}>
          <boxGeometry args={[0.115, 0.022, 0.115]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#9a3412'} roughness={0.88} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Heavy top fuse */}
        {!isCompleted && (
          <mesh position={[0.014, 0.152, 0]} rotation={[0, 0, -0.28]}>
            <cylinderGeometry args={[0.006, 0.007, 0.05, 8]} />
            <meshStandardMaterial {...fuseMat} color="#fde047" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.78} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0, 0.165, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.034, 11, 11]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.4} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.01, 6, 6]} />
              <meshBasicMaterial color="#f97316" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.55} distance={1.4} decay={2} />
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 10. PAPER BOMB — Twine-tied layered paper parcel ───────────────────────
  if (crackerId === 'paper-bomb') {
    return (
      <group>
        {/* Layered paper parcel (rounded, slightly squashed) */}
        <mesh position={[0, 0.085, 0]} scale={[1, 0.92, 1]} castShadow={!isPreview}>
          <icosahedronGeometry args={[0.078, 1]} />
          <meshStandardMaterial {...paperMat} map={paperBombTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.95} metalness={0.01} flatShading transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Jute twine wraps (crossed) */}
        <mesh position={[0, 0.085, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.079, 0.005, 6, 24]} />
          <meshStandardMaterial {...fuseMat} color="#b45309" roughness={0.92} transparent={isPreview} opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.085, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.079, 0.005, 6, 24]} />
          <meshStandardMaterial {...fuseMat} color="#b45309" roughness={0.92} transparent={isPreview} opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.085, 0]} rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[0.079, 0.005, 6, 24]} />
          <meshStandardMaterial {...fuseMat} color="#92400e" roughness={0.92} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Folded paper top knot */}
        <mesh position={[0, 0.158, 0]}>
          <cylinderGeometry args={[0.016, 0.026, 0.03, 10]} />
          <meshStandardMaterial {...paperMat} color={isCompleted ? '#3f3f46' : '#e7e5e4'} roughness={0.94} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Top fuse */}
        {!isCompleted && (
          <mesh position={[0.01, 0.182, 0]} rotation={[0, 0, -0.22]}>
            <cylinderGeometry args={[0.006, 0.007, 0.05, 8]} />
            <meshStandardMaterial {...fuseMat} color="#fde047" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.78} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0, 0.165, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.036, 12, 12]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.4} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.011, 6, 6]} />
              <meshBasicMaterial color="#fde047" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.55} distance={1.4} decay={2} />
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 11. LAKSHMI — Decorated golden cone fountain ───────────────────────────
  if (crackerId === 'lakshmi') {
    return (
      <group>
        {/* Wide terracotta base */}
        <mesh position={[0, 0.014, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.14, 0.152, 0.028, 24]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#a16207'} roughness={0.8} metalness={0.03} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold foil collar ring */}
        <mesh position={[0, 0.034, 0]}>
          <cylinderGeometry args={[0.138, 0.138, 0.016, 24]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fde047'} metalness={0.76} roughness={0.24} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Printed golden cone body */}
        <mesh position={[0, 0.2, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.05, 0.134, 0.34, 28]} />
          <meshStandardMaterial {...paperMat} map={lakshmiTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.86} metalness={0.05} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Narrow gold-ringed neck */}
        <mesh position={[0, 0.378, 0]}>
          <cylinderGeometry args={[0.05, 0.052, 0.016, 22]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.78} roughness={0.24} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Star nozzle (glowing while active) */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.048, 0.048, 0.026, 20]} />
          <meshStandardMaterial
            {...boardMat}
            color={isActive ? '#fef9c3' : (isCompleted ? '#3f3f46' : '#fde047')}
            emissive={isActive ? '#f59e0b' : '#000000'}
            emissiveIntensity={isActive ? 2.9 : 0}
            roughness={0.7}
          />
        </mesh>
        {/* Top fuse */}
        {!isCompleted && (
          <mesh position={[0.01, 0.428, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.007, 0.008, 0.052, 8]} />
            <meshStandardMaterial {...fuseMat} color="#fef08a" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.78} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0.006, 0.42, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.036, 12, 12]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.4} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.011, 6, 6]} />
              <meshBasicMaterial color="#fde047" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.55} distance={1.4} decay={2} />
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 12. KURUVI — Tiny winged hopping spinner ───────────────────────────────
  if (crackerId === 'kuruvi') {
    return (
      <group>
        {/* Flat spinner hub */}
        <mesh position={[0, 0.018, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.042, 0.046, 0.034, 18]} />
          <meshStandardMaterial {...paperMat} map={kuruviTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.88} metalness={0.04} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Gold pivot pin */}
        <mesh position={[0, 0.038, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.014, 12]} />
          <meshStandardMaterial {...metalMat} color="#fbbf24" metalness={0.7} roughness={0.3} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Two folded paper wings */}
        {[0, Math.PI].map((ang, wi) => (
          <mesh key={wi} position={[Math.cos(ang) * 0.06, 0.03, Math.sin(ang) * 0.06]} rotation={[0, ang, 0.35]}>
            <boxGeometry args={[0.09, 0.005, 0.032]} />
            <meshStandardMaterial {...paperMat} color={isCompleted ? '#3f3f46' : (wi === 0 ? '#22c55e' : '#16a34a')} roughness={0.9} transparent={isPreview} opacity={opacity} />
          </mesh>
        ))}
        {/* Side fuse */}
        {!isCompleted && (
          <mesh position={[0.048, 0.022, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.006, 0.04, 8]} />
            <meshStandardMaterial {...fuseMat} color="#fef08a" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.8} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={[0.052, 0.03, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.026, 10, 10]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.2} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshBasicMaterial color="#86efac" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.5} distance={1.3} decay={2} />
          </group>
        )}
        {isPreview && <PreviewRing isValidPlacement={isValidPlacement} />}
      </group>
    );
  }

  // ── 13. SINGLE SHOT — Lone braced mortar tube ──────────────────────────────
  if (crackerId === 'single-shot') {
    return (
      <group>
        {/* Braced square base plate */}
        <mesh position={[0, 0.014, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.088, 0.096, 0.028, 4]} />
          <meshStandardMaterial {...boardMat} color={isCompleted ? '#3f3f46' : '#0c4a6e'} roughness={0.84} metalness={0.04} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Corner braces */}
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((ang, bi) => (
          <mesh key={bi} position={[Math.cos(ang) * 0.062, 0.055, Math.sin(ang) * 0.062]} rotation={[0.34, -ang, 0]}>
            <boxGeometry args={[0.012, 0.075, 0.03]} />
            <meshStandardMaterial {...plasticMat} color={isCompleted ? '#3f3f46' : '#075985'} roughness={0.6} transparent={isPreview} opacity={opacity} />
          </mesh>
        ))}
        {/* Gold-foil mortar tube with printed label */}
        <mesh position={[0, 0.14, 0]} castShadow={!isPreview}>
          <cylinderGeometry args={[0.058, 0.062, 0.23, 22]} />
          <meshStandardMaterial {...boardMat} map={singleShotTex} color={isCompleted ? '#52525b' : '#ffffff'} roughness={0.8} metalness={0.1} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Reinforcing gold rings */}
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.064, 0.064, 0.012, 22]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.74} roughness={0.26} transparent={isPreview} opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.225, 0]}>
          <cylinderGeometry args={[0.062, 0.062, 0.012, 22]} />
          <meshStandardMaterial {...foilMat} color={isCompleted ? '#52525b' : '#fbbf24'} metalness={0.74} roughness={0.26} transparent={isPreview} opacity={opacity} />
        </mesh>
        {/* Dark tube mouth (flashes while firing) */}
        <mesh position={[0, 0.258, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.01, 18]} />
          <meshBasicMaterial color={isActive ? '#fde047' : (isCompleted ? '#18181b' : '#09090b')} toneMapped={!isActive} />
        </mesh>
        {/* Side ignition fuse */}
        {!isCompleted && (
          <mesh position={[0.07, 0.12, 0]} rotation={[0, 0, -0.5]}>
            <cylinderGeometry args={[0.006, 0.007, 0.05, 8]} />
            <meshStandardMaterial {...fuseMat} color="#fde047" emissive={isIgniting ? '#f59e0b' : '#000000'} emissiveIntensity={isIgniting ? 1.4 : 0} roughness={0.78} />
          </mesh>
        )}
        {(isIgniting || isActive) && (
          <group position={isActive ? [0, 0.27, 0] : [0.096, 0.12, 0]}>
            <mesh ref={fuseGlowRef}>
              <sphereGeometry args={[0.036, 12, 12]} />
              <meshStandardMaterial color="#fffbeb" emissive="#ffb340" emissiveIntensity={3.3} roughness={1} metalness={0} toneMapped={false} />
            </mesh>
            <mesh ref={fuseSparkRef}>
              <sphereGeometry args={[0.011, 6, 6]} />
              <meshBasicMaterial color="#7dd3fc" toneMapped={false} />
            </mesh>
            <pointLight color="#ffab40" intensity={0.55} distance={1.4} decay={2} />
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
  /** Resolution of the generated procedural PBR detail maps (quality preset). */
  textureSize?: number;
  /** Texture filtering budget from the active quality preset. */
  anisotropy?: number;
  /** Master switch for image-based lighting reflections. */
  useEnvMap?: boolean;
}

export const PlacedCrackersManager3D: React.FC<PlacedCrackersManager3DProps> = ({
  placedCrackers,
  nearestInteractableId,
  currentTimeMs,
  onSelectPlacedCracker,
  rocketTrackRef: _rocketTrackRef,
  textureSize = 256,
  anisotropy = 4,
  useEnvMap = true,
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
              textureSize={textureSize}
              anisotropy={anisotropy}
              useEnvMap={useEnvMap}
            />
          </group>
        );
      })}
    </group>
  );
};
