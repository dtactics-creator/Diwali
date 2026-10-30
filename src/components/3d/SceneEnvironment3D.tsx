import React, { useMemo, useRef } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CrackerId,
  EnvironmentConfig,
  GraphicsConfig,
  RocketTrackData,
  TimeOfDayConfig,
  WeatherConfig,
} from '../../types/game';
import { CrackerMeshVisual } from './CrackerModels3D';

interface SceneEnvironment3DProps {
  environment: EnvironmentConfig;
  timeOfDay: TimeOfDayConfig;
  weather: WeatherConfig;
  weatherEffectsEnabled: boolean;
  graphics: GraphicsConfig;
  selectedCrackerForPlacement: CrackerId | null;
  hoverPosition: [number, number, number] | null;
  isValidHover: boolean;
  onGroundHover: (pos: [number, number, number] | null, isValid: boolean) => void;
  onGroundClick: (pos: [number, number, number], isValid: boolean) => void;
  cameraShakeRef: React.MutableRefObject<number>;
  /** Shared ref from FireworksSystem3D containing live rocket/shell position */
  rocketTrackRef: React.MutableRefObject<RocketTrackData>;
}

export const SceneEnvironment3D: React.FC<SceneEnvironment3DProps> = ({
  environment,
  timeOfDay,
  weather,
  weatherEffectsEnabled,
  graphics,
  selectedCrackerForPlacement,
  hoverPosition,
  isValidHover,
  onGroundHover,
  onGroundClick,
  cameraShakeRef,
  rocketTrackRef,
}) => {
  const { camera } = useThree();
  const rainGeoRef = useRef<THREE.BufferGeometry>(null);
  const diyaFlameRefs = useRef<(THREE.Mesh | null)[]>([]);
  const groundGroupRef = useRef<THREE.Group>(null);
  const lookAtPointRef = useRef<THREE.Vector3>(
    new THREE.Vector3(
      environment.camera.lookAt[0],
      environment.camera.lookAt[1],
      environment.camera.lookAt[2]
    )
  );

  const rainCount = useMemo(() => {
    if (!weatherEffectsEnabled || !graphics.enableWeatherParticles) return 0;
    return Math.floor(weather.rainCount * graphics.particleMultiplier);
  }, [weather.rainCount, weatherEffectsEnabled, graphics]);

  const rainPositions = useMemo(() => {
    const count = 800;
    const arr = new Float32Array(count * 6); // 2 vertices per raindrop line segment
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 14;
      const y = Math.random() * 8;
      const z = (Math.random() - 0.5) * 8;
      const i6 = i * 6;
      arr[i6] = x;
      arr[i6 + 1] = y;
      arr[i6 + 2] = z;
      arr[i6 + 3] = x - 0.06;
      arr[i6 + 4] = y - 0.42;
      arr[i6 + 5] = z;
    }
    return arr;
  }, []);

  // Align camera, apply camera shake, and cinematic rocket-follow
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const [cx, cy, cz] = environment.camera.position;
    const [lx, ly, lz] = environment.camera.lookAt;

    let shakeX = 0;
    let shakeY = 0;
    if (cameraShakeRef.current > 0.005) {
      const s = cameraShakeRef.current;
      shakeX = (Math.random() - 0.5) * s * 0.28;
      shakeY = (Math.random() - 0.5) * s * 0.28;
      cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 1.4);
    }

    // Keep camera firmly grounded at spectator position, applying screen shake when active
    camera.position.set(cx + shakeX, cy + shakeY, cz);

    // --- Cinematic Rocket-Follow Camera Tilt ---
    const track = rocketTrackRef.current;
    // Decisively tilt all the way up into the open sky toward the ascending burst point,
    // so the character and ground completely exit below the viewport rather than staying half-way
    const targetLook = track.active
      ? new THREE.Vector3(
          THREE.MathUtils.lerp(lx, track.x, 0.65),
          Math.max(ly, track.y + 2.0),
          THREE.MathUtils.lerp(lz, track.z, 0.5)
        )
      : new THREE.Vector3(lx, ly, lz);

    // Delta-time based exponential smoothing: exact same crisp 6.0 speed both going up and returning down
    const lerpSpeed = 6.0;
    lookAtPointRef.current.lerp(targetLook, 1 - Math.exp(-lerpSpeed * dt));
    camera.lookAt(lookAtPointRef.current);

    // Compute live camera tilt progress (0 = firmly on street ground, 1 = sky burst peak)
    const maxLookDelta = Math.max(0.1, 7.4 - ly);
    const tiltProgress = THREE.MathUtils.clamp(
      (lookAtPointRef.current.y - ly) / maxLookDelta,
      0,
      1
    );
    track.cameraTiltProgress = tiltProgress;
    // Ground, diyas and street objects remain permanently stationary & visible in world space
    if (groundGroupRef.current) {
      groundGroupRef.current.visible = true;
    }
    if (!track.active && lookAtPointRef.current.distanceTo(targetLook) < 0.005) {
      lookAtPointRef.current.copy(targetLook);
      track.cameraTiltProgress = 0;
    }

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pCam = camera as THREE.PerspectiveCamera;
      if (Math.abs(pCam.fov - environment.camera.fov) > 0.1) {
        pCam.fov = THREE.MathUtils.lerp(pCam.fov, environment.camera.fov, 0.2);
        pCam.updateProjectionMatrix();
      }
    }

    // Flicker 3D perimeter clay diyas
    const t = state.clock.elapsedTime;
    diyaFlameRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const pulse = 0.88 + Math.sin(t * 14 + idx * 2.1) * 0.16;
      mesh.scale.set(pulse, 0.9 + Math.cos(t * 19 + idx) * 0.18, pulse);
    });

    // Update 3D Rain streaks
    if (rainCount > 0 && rainGeoRef.current) {
      const posAttr = rainGeoRef.current.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const speed = 11.5 * dt;
      for (let i = 0; i < rainCount; i++) {
        const i6 = i * 6;
        arr[i6 + 1] -= speed;
        arr[i6 + 4] -= speed;
        if (arr[i6 + 4] < environment.groundY) {
          const newY = 6.5 + Math.random() * 2.0;
          const newX = (Math.random() - 0.5) * 14;
          arr[i6] = newX;
          arr[i6 + 1] = newY;
          arr[i6 + 3] = newX - 0.06;
          arr[i6 + 4] = newY - 0.42;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  const checkWithinPlacementBounds = (x: number, z: number): boolean => {
    const b = environment.placementBounds;
    return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!selectedCrackerForPlacement) return;
    e.stopPropagation();
    const pt = e.point;
    const isValid = checkWithinPlacementBounds(pt.x, pt.z);
    onGroundHover([pt.x, environment.groundY, pt.z], isValid);
  };

  const handlePointerOut = () => {
    if (selectedCrackerForPlacement) {
      onGroundHover(null, false);
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedCrackerForPlacement) return;
    e.stopPropagation();
    const pt = e.point;
    const isValid = checkWithinPlacementBounds(pt.x, pt.z);
    onGroundClick([pt.x, environment.groundY, pt.z], isValid);
  };

  const b = environment.placementBounds;
  const boundsWidth = b.maxX - b.minX;
  const boundsDepth = b.maxZ - b.minZ;
  const boundsCenterX = (b.minX + b.maxX) / 2;
  const boundsCenterZ = (b.minZ + b.maxZ) / 2;

  const isWet = weatherEffectsEnabled && weather.id === 'rain';

  return (
    <group>
      {/* Dynamic Time-of-Day & Weather Lighting */}
      <ambientLight
        color={timeOfDay.ambientColor}
        intensity={timeOfDay.ambientIntensity * weather.ambientMultiplier}
      />

      <directionalLight
        position={timeOfDay.directionalPosition}
        color={timeOfDay.directionalColor}
        intensity={timeOfDay.directionalIntensity * weather.ambientMultiplier}
        castShadow={graphics.enableShadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Warm Festive Fill Lights simulating street & house diya illumination */}
      <pointLight
        position={[-3.5, 2.2, 0.5]}
        color={timeOfDay.festiveLightColor}
        intensity={timeOfDay.festiveLightIntensity * 1.4}
        distance={11}
      />
      <pointLight
        position={[3.5, 2.2, 0.5]}
        color={timeOfDay.festiveLightColor}
        intensity={timeOfDay.festiveLightIntensity * 1.4}
        distance={11}
      />

      {/* Optional Atmospheric Mist Fog in 3D Scene */}
      {weatherEffectsEnabled && weather.mistDensity > 0.01 && (
        <fogExp2
          attach="fog"
          args={[
            timeOfDay.id === 'day' ? '#cbd5e1' : '#1e1b4b',
            weather.mistDensity * 0.65,
          ]}
        />
      )}

      {/* Ground-Anchored Elements: firmly tied to image ground, cleanly hidden when camera points to sky */}
      <group ref={groundGroupRef}>
        {/* Raycastable Ground Plane Aligned to Background Horizon */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, environment.groundY, 0.5]}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          receiveShadow={graphics.enableShadows}
        >
          <planeGeometry args={[18, 12]} />
          <meshStandardMaterial
            color={environment.groundColor[timeOfDay.id]}
            roughness={isWet ? 0.18 : environment.groundRoughness}
            metalness={isWet ? 0.55 : 0.08}
            transparent
            opacity={isWet ? 0.34 : 0.16}
          />
        </mesh>

        {/* Valid Placement Zone Visual Guide when a Cracker is Selected */}
        {selectedCrackerForPlacement && (
          <group
            position={[boundsCenterX, environment.groundY + 0.005, boundsCenterZ]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[boundsWidth, boundsDepth]} />
              <meshBasicMaterial
                color={isValidHover ? '#fbbf24' : '#ef4444'}
                transparent
                opacity={0.09}
                depthWrite={false}
              />
            </mesh>
            <lineSegments position={[0, 0.004, 0]}>
              <edgesGeometry
                args={[new THREE.BoxGeometry(boundsWidth, 0.01, boundsDepth)]}
              />
              <lineBasicMaterial
                color={isValidHover ? '#fbbf24' : '#f87171'}
                transparent
                opacity={0.65}
              />
            </lineSegments>
          </group>
        )}

        {/* Live 3D Cracker Placement Preview Ghost */}
        {selectedCrackerForPlacement && hoverPosition && (
          <group position={hoverPosition}>
            <CrackerMeshVisual
              crackerId={selectedCrackerForPlacement}
              state="Selected"
              elapsedInState={0}
              isPreview
              isValidPlacement={isValidHover}
            />
          </group>
        )}

        {/* 3D Decorative Clay Diyas Anchored in Scene */}
        {environment.diyaAnchors.map((diya, idx) => {
          const s = diya.scale || 1;
          const isLit = timeOfDay.id !== 'day';
          return (
            <group
              key={idx}
              position={[diya.x, environment.groundY, diya.z]}
              scale={[s, s, s]}
            >
              {/* Terracotta Clay Bowl */}
              <mesh position={[0, 0.025, 0]}>
                <cylinderGeometry args={[0.075, 0.045, 0.05, 16]} />
                <meshStandardMaterial color="#9a3412" roughness={0.75} />
              </mesh>
              {/* Glowing Diya Flame */}
              {isLit && (
                <group position={[0, 0.065, 0]}>
                  <mesh
                    ref={(el) => {
                      diyaFlameRefs.current[idx] = el;
                    }}
                  >
                    <coneGeometry args={[0.024, 0.065, 10]} />
                    <meshBasicMaterial color="#fef08a" />
                  </mesh>
                  {/* Warm Ground Halo under Diya */}
                  <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, -0.06, 0]}
                  >
                    <circleGeometry args={[0.26, 16]} />
                    <meshBasicMaterial
                      color="#f59e0b"
                      transparent
                      opacity={0.28 * timeOfDay.festiveLightIntensity}
                      depthWrite={false}
                    />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}
      </group>

      {/* 3D Falling Rain Particles */}
      {rainCount > 0 && (
        <lineSegments frustumCulled={false}>
          <bufferGeometry ref={rainGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              args={[rainPositions.subarray(0, rainCount * 6), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#cbd5e1"
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
};
