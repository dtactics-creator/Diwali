import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  CharacterAnimationState,
  PlayableBounds,
  RocketTrackData,
} from '../../types/game';

export interface CharacterInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  crouch: boolean;
  celebrate: boolean;      // touch/mobile hold-boolean
  celebrateTrigger: number; // keyboard G: one-shot counter (incremented per press)
  joyX: number;
  joyY: number;
}

interface PlayerCharacter3DProps {
  spawnPosition: [number, number, number];
  groundY: number;
  movementBounds: PlayableBounds;
  inputRef: React.MutableRefObject<CharacterInputState>;
  autoMoveTarget?: [number, number, number] | null;
  autoMoveMode?: 'approach' | 'retreat' | null;
  onAutoMoveComplete?: () => void;
  forcedState: CharacterAnimationState | null;
  igniteTargetPosition: [number, number, number] | null;
  onPositionChange: (pos: [number, number, number], animState: CharacterAnimationState) => void;
  customGlbUrl?: string | null;
  onAssetStatusChange?: (loadedCustom: boolean, availableClips: string[]) => void;
  enableShadows: boolean;
  rocketTrackRef?: React.MutableRefObject<RocketTrackData>;
}

function createDenimTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1e2f4d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = -128; i < 256; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createHoodieTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#841d37ff');
  grad.addColorStop(1, '#4c1122');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle festive gold geometric motif on chest
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 105, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(128, 70);
  ctx.lineTo(163, 105);
  ctx.lineTo(128, 140);
  ctx.lineTo(93, 105);
  ctx.closePath();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Builds genuine THREE.AnimationClip instances for our 17-bone articulated human rig
 * so that THREE.AnimationMixer drives all character animations with smooth cross-fading.
 */
function buildRigAnimationClips(): THREE.AnimationClip[] {
  const qTrack = (
    nodeName: string,
    times: number[],
    eulerKeys: [number, number, number][]
  ) => {
    const values: number[] = [];
    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();
    for (const [rx, ry, rz] of eulerKeys) {
      euler.set(rx, ry, rz, 'XYZ');
      quat.setFromEuler(euler);
      values.push(quat.x, quat.y, quat.z, quat.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${nodeName}.quaternion`, times, values);
  };

  const vTrack = (
    nodeName: string,
    times: number[],
    posKeys: [number, number, number][]
  ) => {
    const values: number[] = [];
    for (const [px, py, pz] of posKeys) {
      values.push(px, py, pz);
    }
    return new THREE.VectorKeyframeTrack(`${nodeName}.position`, times, values);
  };

  // 1. IDLE CLIP (2.6s loop) — Natural breathing & weight shift
  const idleTimes = [0, 0.65, 1.3, 1.95, 2.6];
  const idleClip = new THREE.AnimationClip('Idle', 2.6, [
    // Hips: gentle vertical bob (breathing) + subtle side sway
    vTrack('Hips', idleTimes, [
      [0, 0.955, 0],
      [0, 0.968, 0.004],
      [0, 0.952, 0],
      [0, 0.965, -0.004],
      [0, 0.955, 0],
    ]),
    // Spine: gentle lean variation + side tilt for weight shift
    qTrack('Spine', idleTimes, [
      [0.015, 0.008, 0.006],
      [0.022, -0.005, -0.004],
      [0.012, 0.010, 0.003],
      [0.018, -0.008, -0.006],
      [0.015, 0.008, 0.006],
    ]),
    // Head: gentle look-around with subtle nod
    qTrack('Head', idleTimes, [
      [0.008, 0.018, 0.003],
      [-0.012, -0.012, -0.002],
      [0.005, 0.025, 0.004],
      [-0.008, -0.018, -0.003],
      [0.008, 0.018, 0.003],
    ]),
    // Left arm: relaxed hanging, slight swing
    qTrack('LeftUpperArm', idleTimes, [
      [0.08, 0.015, 0.18],
      [0.06, 0.020, 0.20],
      [0.07, 0.012, 0.19],
      [0.09, 0.010, 0.17],
      [0.08, 0.015, 0.18],
    ]),
    qTrack('LeftForeArm', idleTimes, [
      [-0.18, 0, 0],
      [-0.22, 0, 0],
      [-0.20, 0, 0],
      [-0.16, 0, 0],
      [-0.18, 0, 0],
    ]),
    // Right arm: holding agarbatti — naturally bent
    qTrack('RightUpperArm', idleTimes, [
      [-0.12, -0.02, -0.22],
      [-0.15, -0.025, -0.24],
      [-0.13, -0.018, -0.21],
      [-0.11, -0.015, -0.23],
      [-0.12, -0.02, -0.22],
    ]),
    qTrack('RightForeArm', idleTimes, [
      [-0.38, 0, 0],
      [-0.42, 0, 0],
      [-0.40, 0, 0],
      [-0.36, 0, 0],
      [-0.38, 0, 0],
    ]),
    // Legs: subtle weight shift
    qTrack('LeftThigh', idleTimes, [
      [0.005, 0, -0.025],
      [0.012, 0, -0.028],
      [0.008, 0, -0.022],
      [0.003, 0, -0.030],
      [0.005, 0, -0.025],
    ]),
    qTrack('RightThigh', idleTimes, [
      [0.005, 0, 0.025],
      [0.003, 0, 0.030],
      [0.008, 0, 0.022],
      [0.012, 0, 0.028],
      [0.005, 0, 0.025],
    ]),
    qTrack('LeftShin', idleTimes, [
      [0.028, 0, 0],
      [0.035, 0, 0],
      [0.030, 0, 0],
      [0.025, 0, 0],
      [0.028, 0, 0],
    ]),
    qTrack('RightShin', idleTimes, [
      [0.028, 0, 0],
      [0.025, 0, 0],
      [0.030, 0, 0],
      [0.035, 0, 0],
      [0.028, 0, 0],
    ]),
  ]);

  // 2. WALK CLIP (0.9s loop)
  const wTimes = [0, 0.225, 0.45, 0.675, 0.9];
  const walkClip = new THREE.AnimationClip('Walk', 0.9, [
    vTrack('Hips', wTimes, [
      [0, 0.95, 0],
      [0, 0.98, 0],
      [0, 0.95, 0],
      [0, 0.98, 0],
      [0, 0.95, 0],
    ]),
    qTrack('Spine', wTimes, [
      [0.06, -0.06, 0],
      [0.08, 0, 0],
      [0.06, 0.06, 0],
      [0.08, 0, 0],
      [0.06, -0.06, 0],
    ]),
    qTrack('LeftThigh', wTimes, [
      [-0.42, 0, -0.02],
      [0, 0, -0.02],
      [0.38, 0, -0.02],
      [0.05, 0, -0.02],
      [-0.42, 0, -0.02],
    ]),
    qTrack('LeftShin', wTimes, [
      [0.12, 0, 0],
      [0.18, 0, 0],
      [0.25, 0, 0],
      [0.65, 0, 0],
      [0.12, 0, 0],
    ]),
    qTrack('RightThigh', wTimes, [
      [0.38, 0, 0.02],
      [0.05, 0, 0.02],
      [-0.42, 0, 0.02],
      [0, 0, 0.02],
      [0.38, 0, 0.02],
    ]),
    qTrack('RightShin', wTimes, [
      [0.25, 0, 0],
      [0.65, 0, 0],
      [0.12, 0, 0],
      [0.18, 0, 0],
      [0.25, 0, 0],
    ]),
    qTrack('LeftUpperArm', wTimes, [
      [0.32, 0, 0.12],
      [0, 0, 0.12],
      [-0.32, 0, 0.12],
      [0, 0, 0.12],
      [0.32, 0, 0.12],
    ]),
    qTrack('LeftForeArm', wTimes, [
      [-0.35, 0, 0],
      [-0.42, 0, 0],
      [-0.5, 0, 0],
      [-0.42, 0, 0],
      [-0.35, 0, 0],
    ]),
    qTrack('RightUpperArm', wTimes, [
      [-0.35, 0, -0.12],
      [-0.1, 0, -0.12],
      [0.25, 0, -0.12],
      [-0.1, 0, -0.12],
      [-0.35, 0, -0.12],
    ]),
    qTrack('RightForeArm', wTimes, [
      [-0.6, 0, 0],
      [-0.5, 0, 0],
      [-0.45, 0, 0],
      [-0.5, 0, 0],
      [-0.6, 0, 0],
    ]),
  ]);

  // 3. RUN CLIP (0.6s loop)
  const rTimes = [0, 0.15, 0.3, 0.45, 0.6];
  const runClip = new THREE.AnimationClip('Run', 0.6, [
    vTrack('Hips', rTimes, [
      [0, 0.91, 0],
      [0, 0.99, 0],
      [0, 0.91, 0],
      [0, 0.99, 0],
      [0, 0.91, 0],
    ]),
    qTrack('Spine', rTimes, [
      [0.18, -0.1, 0],
      [0.2, 0, 0],
      [0.18, 0.1, 0],
      [0.2, 0, 0],
      [0.18, -0.1, 0],
    ]),
    qTrack('LeftThigh', rTimes, [
      [-0.72, 0, -0.02],
      [0, 0, -0.02],
      [0.62, 0, -0.02],
      [0.1, 0, -0.02],
      [-0.72, 0, -0.02],
    ]),
    qTrack('LeftShin', rTimes, [
      [0.2, 0, 0],
      [0.3, 0, 0],
      [0.35, 0, 0],
      [1.15, 0, 0],
      [0.2, 0, 0],
    ]),
    qTrack('RightThigh', rTimes, [
      [0.62, 0, 0.02],
      [0.1, 0, 0.02],
      [-0.72, 0, 0.02],
      [0, 0, 0.02],
      [0.62, 0, 0.02],
    ]),
    qTrack('RightShin', rTimes, [
      [0.35, 0, 0],
      [1.15, 0, 0],
      [0.2, 0, 0],
      [0.3, 0, 0],
      [0.35, 0, 0],
    ]),
    qTrack('LeftUpperArm', rTimes, [
      [0.6, 0, 0.15],
      [0, 0, 0.15],
      [-0.65, 0, 0.15],
      [0, 0, 0.15],
      [0.6, 0, 0.15],
    ]),
    qTrack('LeftForeArm', rTimes, [
      [-1.0, 0, 0],
      [-1.1, 0, 0],
      [-1.15, 0, 0],
      [-1.1, 0, 0],
      [-1.0, 0, 0],
    ]),
    qTrack('RightUpperArm', rTimes, [
      [-0.65, 0, -0.15],
      [0, 0, -0.15],
      [0.6, 0, -0.15],
      [0, 0, -0.15],
      [-0.65, 0, -0.15],
    ]),
    qTrack('RightForeArm', rTimes, [
      [-1.15, 0, 0],
      [-1.1, 0, 0],
      [-1.0, 0, 0],
      [-1.1, 0, 0],
      [-1.15, 0, 0],
    ]),
  ]);

  // 4. TURN CLIP (0.6s loop)
  const tTimes = [0, 0.3, 0.6];
  const turnClip = new THREE.AnimationClip('Turn', 0.6, [
    vTrack('Hips', tTimes, [
      [0, 0.94, 0],
      [0, 0.97, 0],
      [0, 0.94, 0],
    ]),
    qTrack('Spine', tTimes, [
      [0.05, 0.15, 0],
      [0.05, -0.15, 0],
      [0.05, 0.15, 0],
    ]),
    qTrack('LeftThigh', tTimes, [
      [-0.25, 0, -0.04],
      [0.15, 0, -0.04],
      [-0.25, 0, -0.04],
    ]),
    qTrack('RightThigh', tTimes, [
      [0.15, 0, 0.04],
      [-0.25, 0, 0.04],
      [0.15, 0, 0.04],
    ]),
  ]);

  // 5. CROUCH CLIP (1.4s loop)
  const cTimes = [0, 0.7, 1.4];
  const crouchClip = new THREE.AnimationClip('Crouch', 1.4, [
    vTrack('Hips', cTimes, [
      [0, 0.62, -0.08],
      [0, 0.6, -0.08],
      [0, 0.62, -0.08],
    ]),
    qTrack('Spine', cTimes, [
      [0.38, 0, 0],
      [0.42, 0, 0],
      [0.38, 0, 0],
    ]),
    qTrack('Head', cTimes, [
      [-0.28, 0, 0],
      [-0.3, 0, 0],
      [-0.28, 0, 0],
    ]),
    qTrack('LeftThigh', cTimes, [
      [-0.95, 0, -0.06],
      [-0.98, 0, -0.06],
      [-0.95, 0, -0.06],
    ]),
    qTrack('LeftShin', cTimes, [
      [1.45, 0, 0],
      [1.48, 0, 0],
      [1.45, 0, 0],
    ]),
    qTrack('RightThigh', cTimes, [
      [-0.95, 0, 0.06],
      [-0.98, 0, 0.06],
      [-0.95, 0, 0.06],
    ]),
    qTrack('RightShin', cTimes, [
      [1.45, 0, 0],
      [1.48, 0, 0],
      [1.45, 0, 0],
    ]),
    qTrack('RightUpperArm', cTimes, [
      [-0.65, 0, -0.1],
      [-0.7, 0, -0.1],
      [-0.65, 0, -0.1],
    ]),
    qTrack('RightForeArm', cTimes, [
      [-0.55, 0, 0],
      [-0.6, 0, 0],
      [-0.55, 0, 0],
    ]),
  ]);

  // 6. IGNITE CRACKER CLIP (1.2s action)
  const iTimes = [0, 0.35, 0.85, 1.2];
  const igniteClip = new THREE.AnimationClip('Ignite', 1.2, [
    vTrack('Hips', iTimes, [
      [0, 0.92, 0],
      [0, 0.62, -0.05],
      [0, 0.60, -0.05],
      [0, 0.92, 0],
    ]),
    qTrack('Spine', iTimes, [
      [0.08, 0, 0],
      [0.48, -0.08, 0],
      [0.52, -0.12, 0],
      [0.08, 0, 0],
    ]),
    qTrack('Head', iTimes, [
      [0, 0, 0],
      [-0.2, 0.08, 0],
      [-0.22, 0.1, 0],
      [0, 0, 0],
    ]),
    qTrack('LeftThigh', iTimes, [
      [-0.1, 0, -0.04],
      [-0.92, 0, -0.08],
      [-0.95, 0, -0.08],
      [-0.1, 0, -0.04],
    ]),
    qTrack('LeftShin', iTimes, [
      [0.15, 0, 0],
      [1.38, 0, 0],
      [1.42, 0, 0],
      [0.15, 0, 0],
    ]),
    qTrack('RightThigh', iTimes, [
      [-0.1, 0, 0.04],
      [-0.82, 0, 0.08],
      [-0.85, 0, 0.08],
      [-0.1, 0, 0.04],
    ]),
    qTrack('RightShin', iTimes, [
      [0.15, 0, 0],
      [1.32, 0, 0],
      [1.35, 0, 0],
      [0.15, 0, 0],
    ]),
    qTrack('RightUpperArm', iTimes, [
      [-0.25, 0, -0.12],
      [-1.18, -0.1, -0.05],
      [-1.26, -0.14, -0.02],
      [-0.25, 0, -0.12],
    ]),
    qTrack('RightForeArm', iTimes, [
      [-0.5, 0, 0],
      [-0.18, 0, 0],
      [-0.1, 0, 0],
      [-0.5, 0, 0],
    ]),
  ]);

  // 7. CELEBRATE CLIP (1.1s loop)
  const celTimes = [0, 0.275, 0.55, 0.825, 1.1];
  const celebrateClip = new THREE.AnimationClip('Celebrate', 1.1, [
    vTrack('Hips', celTimes, [
      [0, 0.96, 0],
      [0, 1.04, 0],
      [0, 0.95, 0],
      [0, 1.04, 0],
      [0, 0.96, 0],
    ]),
    qTrack('Spine', celTimes, [
      [-0.06, -0.08, 0.04],
      [-0.1, 0, -0.04],
      [-0.06, 0.08, 0.04],
      [-0.1, 0, -0.04],
      [-0.06, -0.08, 0.04],
    ]),
    qTrack('LeftUpperArm', celTimes, [
      [-2.35, 0, 0.35],
      [-2.55, 0, 0.55],
      [-2.35, 0, 0.35],
      [-2.55, 0, 0.55],
      [-2.35, 0, 0.35],
    ]),
    qTrack('LeftForeArm', celTimes, [
      [-0.35, 0, 0],
      [-0.15, 0, 0],
      [-0.35, 0, 0],
      [-0.15, 0, 0],
      [-0.35, 0, 0],
    ]),
    qTrack('RightUpperArm', celTimes, [
      [-2.35, 0, -0.35],
      [-2.55, 0, -0.55],
      [-2.35, 0, -0.35],
      [-2.55, 0, -0.55],
      [-2.35, 0, -0.35],
    ]),
    qTrack('RightForeArm', celTimes, [
      [-0.35, 0, 0],
      [-0.15, 0, 0],
      [-0.35, 0, 0],
      [-0.15, 0, 0],
      [-0.35, 0, 0],
    ]),
  ]);

  return [
    idleClip,
    walkClip,
    runClip,
    turnClip,
    crouchClip,
    igniteClip,
    celebrateClip,
  ];
}

export const PlayerCharacter3D: React.FC<PlayerCharacter3DProps> = ({
  spawnPosition,
  groundY,
  movementBounds,
  inputRef,
  autoMoveTarget = null,
  autoMoveMode = null,
  onAutoMoveComplete,
  forcedState,
  igniteTargetPosition,
  onPositionChange,
  customGlbUrl,
  onAssetStatusChange,
  enableShadows,
  rocketTrackRef,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const rigRootRef = useRef<THREE.Group>(null);
  const customModelGroupRef = useRef<THREE.Group>(null);
  const agarbattiLightRef = useRef<THREE.PointLight>(null);

  const posRef = useRef<THREE.Vector3>(
    new THREE.Vector3(spawnPosition[0], groundY, spawnPosition[2])
  );
  // World-space velocity is smoothed every frame to avoid abrupt starts/stops.
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const desiredVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const rotYRef = useRef<number>(0);
  const currentStateRef = useRef<CharacterAnimationState>('Idle');
  const lastReportedTimeRef = useRef<number>(0);
  const completedAutoTargetRef = useRef<string | null>(null);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsMapRef = useRef<Partial<Record<CharacterAnimationState, THREE.AnimationAction>>>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);

  const lastCelebrateTriggerRef = useRef<number>(0);
  const celebrateActiveRef = useRef<boolean>(false);   // true while celebrate plays
  const celebrateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [usingCustomGlb, setUsingCustomGlb] = useState(false);

  const denimTexture = useMemo(() => createDenimTexture(), []);
  const hoodieTexture = useMemo(() => createHoodieTexture(), []);
  const builtInClips = useMemo(() => buildRigAnimationClips(), []);

  // Reset spawn position when environment changes
  useEffect(() => {
    posRef.current.set(spawnPosition[0], groundY, spawnPosition[2]);
    velocityRef.current.set(0, 0, 0);
    desiredVelocityRef.current.set(0, 0, 0);
    if (rootGroupRef.current) {
      rootGroupRef.current.position.copy(posRef.current);
    }
    const t = setTimeout(() => {
      onPositionChange([spawnPosition[0], groundY, spawnPosition[2]], 'Idle');
    }, 0);
    return () => clearTimeout(t);
  }, [spawnPosition[0], spawnPosition[1], spawnPosition[2], groundY]);

  // Attempt loading external or user-uploaded GLB when provided
  useEffect(() => {
    if (!customGlbUrl) {
      setUsingCustomGlb(false);
      const t = setTimeout(() => {
        onAssetStatusChange?.(false, [
          'Idle',
          'Walk',
          'Run',
          'Turn',
          'Crouch',
          'Ignite',
          'Celebrate',
        ]);
      }, 0);
      return () => clearTimeout(t);
    }

    const loader = new GLTFLoader();
    let cancelled = false;

    loader.load(
      customGlbUrl,
      (gltf) => {
        if (cancelled || !customModelGroupRef.current) return;

        // Clear previous custom children
        while (customModelGroupRef.current.children.length > 0) {
          customModelGroupRef.current.remove(customModelGroupRef.current.children[0]);
        }

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const targetHeight = 1.72;
        const scale = size.y > 0.01 ? targetHeight / size.y : 1;
        model.scale.setScalar(scale);

        const postBox = new THREE.Box3().setFromObject(model);
        model.position.y = -postBox.min.y;

        model.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = enableShadows;
            obj.receiveShadow = enableShadows;
          }
        });

        customModelGroupRef.current.add(model);

        const mixer = new THREE.AnimationMixer(model);
        mixerRef.current = mixer;
        const newActions: Partial<Record<CharacterAnimationState, THREE.AnimationAction>> = {};
        const clipNames: string[] = [];

        gltf.animations.forEach((clip) => {
          clipNames.push(clip.name);
          const lower = clip.name.toLowerCase().replace(/[\s_-]/g, '');
          let state: CharacterAnimationState | null = null;

          // Never treat the first arbitrary clip (especially Run) as Idle.
          if (lower.includes('idle') || lower.includes('standing') || lower === 'stand') state = 'Idle';
          else if (lower.includes('walk')) state = 'Walk';
          else if (lower.includes('run') || lower.includes('sprint')) state = 'Run';
          else if (lower.includes('turn')) state = 'Turn';
          else if (lower.includes('crouch') || lower.includes('squat') || lower.includes('bend')) state = 'Crouch';
          else if (lower.includes('ignite') || lower.includes('interact') || lower.includes('reach') || lower.includes('use')) state = 'Ignite';
          else if (lower.includes('celeb') || lower.includes('wave') || lower.includes('dance') || lower.includes('clap')) state = 'Celebrate';

          if (state && !newActions[state]) {
            const action = mixer.clipAction(clip);
            const oneShot = state === 'Ignite' || state === 'Turn';
            action.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
            action.clampWhenFinished = oneShot;
            newActions[state] = action;
          }
        });

        // Missing clips remain genuinely unavailable. Do not substitute Run for Idle.
        actionsMapRef.current = newActions;
        activeActionRef.current = null;
        if (newActions.Idle) {
          newActions.Idle.reset().fadeIn(0.2).play();
          activeActionRef.current = newActions.Idle;
        }

        setUsingCustomGlb(true);
        onAssetStatusChange?.(true, clipNames);
      },
      undefined,
      () => {
        if (!cancelled) {
          setUsingCustomGlb(false);
          onAssetStatusChange?.(false, [
            'Idle',
            'Walk',
            'Run',
            'Turn',
            'Crouch',
            'Ignite',
            'Celebrate',
          ]);
        }
      }
    );

    return () => {
      cancelled = true;
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      activeActionRef.current = null;
      actionsMapRef.current = {};
    };
  }, [customGlbUrl]);

  // Initialize built-in articulated skeletal AnimationMixer when not using custom GLB
  useEffect(() => {
    if (usingCustomGlb || !rigRootRef.current) return;

    const mixer = new THREE.AnimationMixer(rigRootRef.current);
    mixerRef.current = mixer;

    const map: Partial<Record<CharacterAnimationState, THREE.AnimationAction>> = {};
    builtInClips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      map[clip.name as CharacterAnimationState] = action;
    });

    actionsMapRef.current = map;
    if (map.Idle) {
      map.Idle.reset().fadeIn(0.15).play();
      activeActionRef.current = map.Idle;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [usingCustomGlb, builtInClips]);

  // Helper to smoothly cross-fade animation states
  const transitionToAnimation = (nextState: CharacterAnimationState) => {
    const requestedAction = actionsMapRef.current[nextState];
    // If a custom GLB lacks this clip, use a real Idle clip if available;
    // otherwise leave its current pose untouched instead of playing the wrong clip.
    const nextAction = requestedAction || (nextState !== 'Idle' ? actionsMapRef.current.Idle : null) || null;
    if (!nextAction) {
      if (currentStateRef.current !== nextState && nextState === 'Idle' && activeActionRef.current) {
        activeActionRef.current.fadeOut(0.2);
        activeActionRef.current = null;
      }
      currentStateRef.current = nextState;
      return;
    }
    if (activeActionRef.current === nextAction) {
      currentStateRef.current = nextState;
      return;
    }

    currentStateRef.current = nextState;
    const prevAction = activeActionRef.current;
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    if (prevAction && prevAction !== nextAction) {
      nextAction.crossFadeFrom(prevAction, 0.24, false);
    } else {
      nextAction.fadeIn(0.24);
    }
    nextAction.play();
    activeActionRef.current = nextAction;
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);

    if (mixerRef.current) {
      mixerRef.current.update(dt);
    }

    // Subtle flicker on the handheld incense stick (agarbatti) ember
    if (agarbattiLightRef.current) {
      agarbattiLightRef.current.intensity =
        0.55 + Math.sin(state.clock.elapsedTime * 18) * 0.12;
    }

    const input = inputRef.current;
    const isRetreating = autoMoveMode === 'retreat';
    let moveX = 0;
    let moveZ = 0;

    // Normal manual movement allowed only when not in mandatory retreat or ignition
    if (!isRetreating && forcedState !== 'Ignite') {
      moveX = input.joyX;
      moveZ = input.joyY;

      if (input.left) moveX -= 1;
      if (input.right) moveX += 1;
      if (input.forward) moveZ -= 1;
      if (input.backward) moveZ -= 1;
    }
    const walkSpeed = 2.05;
    const runSpeed = 3.55;
    if (!autoMoveTarget) completedAutoTargetRef.current = null;
    const autoKey = autoMoveTarget ? `${autoMoveMode}:${autoMoveTarget[0].toFixed(2)}:${autoMoveTarget[2].toFixed(2)}` : null;
    if (autoKey !== completedAutoTargetRef.current && autoMoveTarget) {
      const dx = autoMoveTarget[0] - posRef.current.x;
      const dz = autoMoveTarget[2] - posRef.current.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= 0.16) {
        velocityRef.current.set(0, 0, 0);
        completedAutoTargetRef.current = autoKey;
        onAutoMoveComplete?.();
      } else {
        moveX = dx / distance;
        moveZ = dz / distance;
      }
    }
    const inputLength = Math.hypot(moveX, moveZ);
    const autoMoving = Boolean(autoMoveTarget && autoKey !== completedAutoTargetRef.current);
    const hasMoveInput = (inputLength > 0.08 || autoMoving) && forcedState !== 'Ignite';
    const maxSpeed = autoMoving ? (autoMoveMode === 'retreat' ? runSpeed : walkSpeed) : (input.run ? runSpeed : walkSpeed);
    const acceleration = 10.0;
    const deceleration = 13.0;

    desiredVelocityRef.current.set(0, 0, 0);
    if (hasMoveInput) {
      const normalizedX = moveX / inputLength;
      const normalizedZ = moveZ / inputLength;
      desiredVelocityRef.current.set(normalizedX * maxSpeed, 0, normalizedZ * maxSpeed);
    }

    // Exponential damping gives consistent, frame-rate-independent acceleration.
    const smoothing = 1 - Math.exp(-(hasMoveInput ? acceleration : deceleration) * dt);
    velocityRef.current.lerp(desiredVelocityRef.current, smoothing);

    const currentSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);
    const isMoving = currentSpeed > 0.12;

    // ── Celebrate one-shot trigger detection (keyboard G) ──────────────────
    // Each G keypress increments celebrateTrigger; we track the last-handled
    // value so we only fire once per press, regardless of how long G is held.
    const newCelebrateTrigger = input.celebrateTrigger > lastCelebrateTriggerRef.current;
    const touchCelebrate = input.celebrate && !celebrateActiveRef.current;
    const shouldStartCelebrate = (newCelebrateTrigger || touchCelebrate)
      && forcedState !== 'Ignite'
      && !celebrateActiveRef.current;

    if (shouldStartCelebrate) {
      lastCelebrateTriggerRef.current = input.celebrateTrigger;
      celebrateActiveRef.current = true;
      // Clear any pending timer
      if (celebrateTimerRef.current) clearTimeout(celebrateTimerRef.current);
      // Auto-exit celebrate after clip duration (1.1s * 2 = 2.2s play, then back to Idle)
      celebrateTimerRef.current = setTimeout(() => {
        celebrateActiveRef.current = false;
        // If touch-held celebrate button is still down, let it retrigger naturally
      }, 2200);
    }

    const isCelebrating = forcedState === 'Celebrate' || celebrateActiveRef.current;

    if (forcedState === 'Ignite') {
      velocityRef.current.set(0, 0, 0);
      if (igniteTargetPosition) {
        const dx = igniteTargetPosition[0] - posRef.current.x;
        const dz = igniteTargetPosition[2] - posRef.current.z;
        if (Math.hypot(dx, dz) > 0.02) {
          const targetAngle = Math.atan2(dx, dz);
          const angleDiff = THREE.MathUtils.euclideanModulo(targetAngle - rotYRef.current + Math.PI, Math.PI * 2) - Math.PI;
          rotYRef.current += angleDiff * (1 - Math.exp(-12 * dt));
        }
      }
      transitionToAnimation('Ignite');
    } else if (isCelebrating && !hasMoveInput) {
      // Celebrate: character stays in place and faces cracker show
      velocityRef.current.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(deceleration * dt));
      if (igniteTargetPosition) {
        const dx = igniteTargetPosition[0] - posRef.current.x;
        const dz = igniteTargetPosition[2] - posRef.current.z;
        if (Math.hypot(dx, dz) > 0.02) {
          const targetAngle = Math.atan2(dx, dz);
          const angleDiff = THREE.MathUtils.euclideanModulo(targetAngle - rotYRef.current + Math.PI, Math.PI * 2) - Math.PI;
          rotYRef.current += angleDiff * (1 - Math.exp(-10 * dt));
        }
      }
      transitionToAnimation('Celebrate');
    } else if (input.crouch && !isMoving && !isRetreating) {
      velocityRef.current.set(0, 0, 0);
      transitionToAnimation('Crouch');
    } else {
      if (isMoving) {
        posRef.current.x += velocityRef.current.x * dt;
        posRef.current.z += velocityRef.current.z * dt;
        posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, movementBounds.minX, movementBounds.maxX);
        posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, movementBounds.minZ, movementBounds.maxZ);
        posRef.current.y = groundY;

        const targetAngle = Math.atan2(velocityRef.current.x, velocityRef.current.z);
        const angleDiff = THREE.MathUtils.euclideanModulo(targetAngle - rotYRef.current + Math.PI, Math.PI * 2) - Math.PI;
        rotYRef.current += angleDiff * (1 - Math.exp(-11 * dt));

        // Run activates immediately when Shift is held + there is movement input.
        // No speed-ratio gate — that caused the delayed/broken run feel.
        const useRun = (autoMoving && autoMoveMode === 'retreat') || (input.run && hasMoveInput);
        transitionToAnimation(useRun ? 'Run' : 'Walk');
        if (activeActionRef.current) {
          // Scale playback speed to match actual travel speed for foot synchronisation.
          const baseSpeed = useRun ? runSpeed : walkSpeed;
          activeActionRef.current.setEffectiveTimeScale(THREE.MathUtils.clamp(currentSpeed / baseSpeed, 0.6, 1.3));
        }
      } else {
        // Finish deceleration before returning to Idle to avoid visible foot sliding.
        if (currentSpeed < 0.12) {
          velocityRef.current.set(0, 0, 0);
          transitionToAnimation('Idle');
        } else {
          transitionToAnimation(input.run && hasMoveInput ? 'Run' : 'Walk');
        }
      }
    }

    // Prevent accumulated velocity from pushing against a movement boundary.
    if (posRef.current.x <= movementBounds.minX || posRef.current.x >= movementBounds.maxX) velocityRef.current.x = 0;
    if (posRef.current.z <= movementBounds.minZ || posRef.current.z >= movementBounds.maxZ) velocityRef.current.z = 0;
    // Always enforce exact ground altitude so character feet stay firmly anchored to the floor
    posRef.current.y = groundY;

    if (rootGroupRef.current) {
      rootGroupRef.current.position.copy(posRef.current);
      rootGroupRef.current.rotation.y = rotYRef.current;
      // Character stays firmly on the street floor; cleanly hidden when camera points to sky
      const tilt = rocketTrackRef?.current?.cameraTiltProgress ?? 0;
      rootGroupRef.current.visible = tilt < 0.22;
    }

    // Throttle parent state callback to ~15Hz to avoid React re-render overhead in frame loop
    if (state.clock.elapsedTime - lastReportedTimeRef.current > 0.065) {
      lastReportedTimeRef.current = state.clock.elapsedTime;
      onPositionChange(
        [posRef.current.x, posRef.current.y, posRef.current.z],
        currentStateRef.current
      );
    }
  });

  return (
    <group ref={rootGroupRef} position={[spawnPosition[0], groundY, spawnPosition[2]]}>
      {/* Ground Contact Shadow Disc so feet always anchor convincingly to the scene floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        receiveShadow={false}
      >
        <circleGeometry args={[0.36, 28]} />
        <meshBasicMaterial
          color="#05050a"
          transparent
          opacity={0.48}
          depthWrite={false}
        />
      </mesh>

      {/* External Custom GLB Container */}
      <group ref={customModelGroupRef} visible={usingCustomGlb} />

      {/* Built-in 17-Bone Articulated 3D Human Character Rig */}
      <group ref={rigRootRef} visible={!usingCustomGlb} position={[0, -0.04, 0]}>
        {/* HIPS ROOT BONE (Y = 0.96m) */}
        <group name="Hips" position={[0, 0.96, 0]}>
          {/* Pelvis / Denim Waistband */}
          <mesh castShadow={enableShadows} receiveShadow={enableShadows}>
            <capsuleGeometry args={[0.145, 0.1, 12, 20]} />
            <meshStandardMaterial
              map={denimTexture}
              roughness={0.82}
              metalness={0.05}
            />
          </mesh>

          {/* SPINE / TORSO BONE */}
          <group name="Spine" position={[0, 0.08, 0]}>
            {/* Festive Maroon/Crimson Casual Hoodie Torso */}
            <mesh
              position={[0, 0.25, 0]}
              castShadow={enableShadows}
              receiveShadow={enableShadows}
            >
              <capsuleGeometry args={[0.165, 0.34, 16, 24]} />
              <meshStandardMaterial
                map={hoodieTexture}
                roughness={0.72}
                metalness={0.06}
              />
            </mesh>

            {/* Hoodie Bottom Ribbed Hem & Inner Ivory Tee Layer */}
            <mesh position={[0, 0.04, 0]} castShadow={enableShadows}>
              <cylinderGeometry args={[0.158, 0.152, 0.06, 24]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.6} />
            </mesh>

            {/* Hoodie Draped Hood Behind Collar */}
            <mesh
              position={[0, 0.45, -0.11]}
              rotation={[-0.35, 0, 0]}
              castShadow={enableShadows}
            >
              <sphereGeometry args={[0.13, 18, 16]} />
              <meshStandardMaterial color="#581325" roughness={0.78} />
            </mesh>

            {/* Golden Drawstrings on Chest */}
            <mesh position={[-0.045, 0.36, 0.162]}>
              <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[0.045, 0.36, 0.162]}>
              <cylinderGeometry args={[0.006, 0.006, 0.13, 8]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.4} roughness={0.3} />
            </mesh>

            {/* NECK & HEAD BONE */}
            <group name="Head" position={[0, 0.49, 0]}>
              {/* Neck */}
              <mesh position={[0, 0.03, 0]} castShadow={enableShadows}>
                <cylinderGeometry args={[0.058, 0.066, 0.1, 16]} />
                <meshStandardMaterial color="#c6865c" roughness={0.55} />
              </mesh>

              {/* Sculpted Head */}
              <mesh position={[0, 0.165, 0.01]} castShadow={enableShadows}>
                <sphereGeometry args={[0.125, 24, 24]} />
                <meshStandardMaterial color="#c98a60" roughness={0.52} />
              </mesh>

              {/* Nose Bridge */}
              <mesh position={[0, 0.16, 0.132]} rotation={[0.18, 0, 0]}>
                <capsuleGeometry args={[0.016, 0.032, 8, 8]} />
                <meshStandardMaterial color="#be7e54" roughness={0.55} />
              </mesh>

              {/* Ears */}
              <mesh position={[-0.122, 0.16, 0]}>
                <sphereGeometry args={[0.026, 12, 12]} />
                <meshStandardMaterial color="#be7e54" roughness={0.55} />
              </mesh>
              <mesh position={[0.122, 0.16, 0]}>
                <sphereGeometry args={[0.026, 12, 12]} />
                <meshStandardMaterial color="#be7e54" roughness={0.55} />
              </mesh>

              {/* Eyes & Eyebrows */}
              <mesh position={[-0.044, 0.182, 0.116]}>
                <sphereGeometry args={[0.015, 12, 12]} />
                <meshStandardMaterial color="#18181b" roughness={0.2} />
              </mesh>
              <mesh position={[0.044, 0.182, 0.116]}>
                <sphereGeometry args={[0.015, 12, 12]} />
                <meshStandardMaterial color="#18181b" roughness={0.2} />
              </mesh>
              <mesh position={[-0.044, 0.21, 0.118]} rotation={[0, 0, 0.08]}>
                <boxGeometry args={[0.036, 0.009, 0.012]} />
                <meshStandardMaterial color="#18181b" roughness={0.8} />
              </mesh>
              <mesh position={[0.044, 0.21, 0.118]} rotation={[0, 0, -0.08]}>
                <boxGeometry args={[0.036, 0.009, 0.012]} />
                <meshStandardMaterial color="#18181b" roughness={0.8} />
              </mesh>

              {/* Modern Textured Wavy Indian Hair Cap */}
              <mesh position={[0, 0.205, -0.005]} castShadow={enableShadows}>
                <sphereGeometry args={[0.132, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
                <meshStandardMaterial color="#141418" roughness={0.82} />
              </mesh>
              <mesh position={[0, 0.27, 0.06]} rotation={[0.3, 0, 0]}>
                <capsuleGeometry args={[0.048, 0.09, 10, 14]} />
                <meshStandardMaterial color="#18181f" roughness={0.8} />
              </mesh>
            </group>

            {/* LEFT UPPER ARM BONE */}
            <group name="LeftUpperArm" position={[-0.21, 0.41, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow={enableShadows}>
                <capsuleGeometry args={[0.052, 0.2, 12, 16]} />
                <meshStandardMaterial color="#6e182d" roughness={0.74} />
              </mesh>

              {/* LEFT FOREARM BONE */}
              <group name="LeftForeArm" position={[0, -0.26, 0]}>
                <mesh position={[0, -0.11, 0]} castShadow={enableShadows}>
                  <capsuleGeometry args={[0.044, 0.18, 12, 16]} />
                  <meshStandardMaterial color="#6e182d" roughness={0.74} />
                </mesh>
                {/* Left Hand */}
                <mesh position={[0, -0.24, 0]} castShadow={enableShadows}>
                  <sphereGeometry args={[0.044, 14, 14]} />
                  <meshStandardMaterial color="#c6865c" roughness={0.55} />
                </mesh>
              </group>
            </group>

            {/* RIGHT UPPER ARM BONE */}
            <group name="RightUpperArm" position={[0.21, 0.41, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow={enableShadows}>
                <capsuleGeometry args={[0.052, 0.2, 12, 16]} />
                <meshStandardMaterial color="#6e182d" roughness={0.74} />
              </mesh>

              {/* RIGHT FOREARM BONE */}
              <group name="RightForeArm" position={[0, -0.26, 0]}>
                <mesh position={[0, -0.11, 0]} castShadow={enableShadows}>
                  <capsuleGeometry args={[0.044, 0.18, 12, 16]} />
                  <meshStandardMaterial color="#6e182d" roughness={0.74} />
                </mesh>

                {/* Right Hand + Handheld Glowing Agarbatti (Incense Stick for safe ignition) */}
                <group position={[0, -0.24, 0]}>
                  <mesh castShadow={enableShadows}>
                    <sphereGeometry args={[0.044, 14, 14]} />
                    <meshStandardMaterial color="#c6865c" roughness={0.55} />
                  </mesh>

                  {/* Agarbatti Stick */}
                  <group position={[0, -0.02, 0.12]} rotation={[Math.PI / 2.2, 0, 0]}>
                    <mesh>
                      <cylinderGeometry args={[0.004, 0.005, 0.24, 8]} />
                      <meshStandardMaterial color="#78350f" roughness={0.8} />
                    </mesh>
                    {/* Glowing Incense Tip */}
                    <mesh position={[0, 0.125, 0]}>
                      <sphereGeometry args={[0.014, 10, 10]} />
                      <meshBasicMaterial color="#ff6b00" />
                    </mesh>
                    <pointLight
                      ref={agarbattiLightRef}
                      position={[0, 0.13, 0]}
                      color="#ff7b00"
                      intensity={0.55}
                      distance={1.4}
                    />
                  </group>
                </group>
              </group>
            </group>
          </group>

          {/* LEFT THIGH BONE */}
          <group name="LeftThigh" position={[-0.095, -0.04, 0]}>
            <mesh position={[0, -0.21, 0]} castShadow={enableShadows}>
              <capsuleGeometry args={[0.068, 0.34, 12, 18]} />
              <meshStandardMaterial map={denimTexture} roughness={0.82} />
            </mesh>

            {/* LEFT SHIN BONE */}
            <group name="LeftShin" position={[0, -0.44, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow={enableShadows}>
                <capsuleGeometry args={[0.054, 0.34, 12, 18]} />
                <meshStandardMaterial map={denimTexture} roughness={0.82} />
              </mesh>
              {/* Rolled Denim Cuff */}
              <mesh position={[0, -0.37, 0]}>
                <cylinderGeometry args={[0.058, 0.058, 0.04, 16]} />
                <meshStandardMaterial color="#93c5fd" roughness={0.85} />
              </mesh>
              {/* Left Sneaker (White/Crimson/Gold Street Sneaker) */}
              <group position={[0, -0.44, 0.04]}>
                <mesh castShadow={enableShadows}>
                  <boxGeometry args={[0.105, 0.075, 0.22]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.45} />
                </mesh>
                <mesh position={[0, -0.032, 0]}>
                  <boxGeometry args={[0.11, 0.022, 0.23]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.015, -0.02]}>
                  <boxGeometry args={[0.108, 0.04, 0.1]} />
                  <meshStandardMaterial color="#881337" roughness={0.6} />
                </mesh>
              </group>
            </group>
          </group>

          {/* RIGHT THIGH BONE */}
          <group name="RightThigh" position={[0.095, -0.04, 0]}>
            <mesh position={[0, -0.21, 0]} castShadow={enableShadows}>
              <capsuleGeometry args={[0.068, 0.34, 12, 18]} />
              <meshStandardMaterial map={denimTexture} roughness={0.82} />
            </mesh>

            {/* RIGHT SHIN BONE */}
            <group name="RightShin" position={[0, -0.44, 0]}>
              <mesh position={[0, -0.2, 0]} castShadow={enableShadows}>
                <capsuleGeometry args={[0.054, 0.34, 12, 18]} />
                <meshStandardMaterial map={denimTexture} roughness={0.82} />
              </mesh>
              {/* Rolled Denim Cuff */}
              <mesh position={[0, -0.37, 0]}>
                <cylinderGeometry args={[0.058, 0.058, 0.04, 16]} />
                <meshStandardMaterial color="#93c5fd" roughness={0.85} />
              </mesh>
              {/* Right Sneaker */}
              <group position={[0, -0.44, 0.04]}>
                <mesh castShadow={enableShadows}>
                  <boxGeometry args={[0.105, 0.075, 0.22]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.45} />
                </mesh>
                <mesh position={[0, -0.032, 0]}>
                  <boxGeometry args={[0.11, 0.022, 0.23]} />
                  <meshStandardMaterial color="#fbbf24" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.015, -0.02]}>
                  <boxGeometry args={[0.108, 0.04, 0.1]} />
                  <meshStandardMaterial color="#881337" roughness={0.6} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
