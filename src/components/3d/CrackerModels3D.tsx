import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CRACKERS } from '../../config/crackers';
import { CrackerId, PlacedCrackerInstance } from '../../types/game';

function createFoilLabelTexture(
  primaryBg: string,
  accentGold: string,
  stripeColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryBg;
  ctx.fillRect(0, 0, 256, 128);

  // Decorative gold top and bottom borders
  ctx.fillStyle = accentGold;
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 112, 256, 16);

  // Festive diamond pattern
  ctx.fillStyle = stripeColor;
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 16, 26);
    ctx.lineTo(x + 28, 64);
    ctx.lineTo(x + 16, 102);
    ctx.lineTo(x + 4, 64);
    ctx.closePath();
    ctx.fill();
  }

  // Center gold star band
  ctx.strokeStyle = accentGold;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 22, 240, 84);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

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
  const fuseSparkRef = useRef<THREE.Mesh>(null);

  const anarTexture = useMemo(
    () => createFoilLabelTexture('#991b1b', '#fbbf24', '#d97706'),
    []
  );
  const rocketTexture = useMemo(
    () => createFoilLabelTexture('#b91c1c', '#fde047', '#1d4ed8'),
    []
  );
  const aerialTexture = useMemo(
    () => createFoilLabelTexture('#581c87', '#fbbf24', '#e11d48'),
    []
  );

  const isCompleted = state === 'Completed';
  const isIgniting = state === 'Igniting';
  const isActive = state === 'Active';

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Spin Chakri when Active
    if (crackerId === 'chakri' && spinGroupRef.current) {
      if (isActive) {
        spinGroupRef.current.rotation.y += dt * 28;
      } else if (isIgniting) {
        spinGroupRef.current.rotation.y += dt * 2.5;
      }
    }

    // Launch Rocket body upward when Active
    if (crackerId === 'rocket' && rocketBodyRef.current) {
      if (isActive) {
        const flightProgress = Math.min(1, elapsedInState / 1.05);
        const altitude = Math.pow(flightProgress, 1.85) * 6.2;
        rocketBodyRef.current.position.y = altitude;
        rocketBodyRef.current.visible = flightProgress < 0.96;
      } else if (isCompleted) {
        rocketBodyRef.current.visible = false;
      } else {
        rocketBodyRef.current.position.y = 0;
        rocketBodyRef.current.visible = true;
      }
    }

    // Pulse fuse spark
    if (fuseSparkRef.current && (isIgniting || isActive)) {
      const s = 0.85 + Math.random() * 0.55;
      fuseSparkRef.current.scale.setScalar(s);
    }
  });

  const opacity = isPreview ? 0.72 : 1;
  const charFactor = isCompleted ? 0.35 : 1;

  return (
    <group>
      {/* 1. PHULJHADI (Sparkler Rod in Festive Brass Holder Stand) */}
      {crackerId === 'phuljhadi' && (
        <group>
          {/* Ornate Brass Holder Base */}
          <mesh position={[0, 0.03, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.06, 0.09, 0.06, 20]} />
            <meshStandardMaterial
              color={isCompleted ? '#52525b' : '#d97706'}
              metalness={0.75}
              roughness={0.28}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Metallic Wire Stem */}
          <mesh position={[0, 0.28, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.006, 0.006, 0.48, 10]} />
            <meshStandardMaterial
              color="#a1a1aa"
              metalness={0.85}
              roughness={0.3}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Grey Pyrotechnic Chemical Coating */}
          <mesh position={[0, 0.34, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.018, 0.018, 0.34, 14]} />
            <meshStandardMaterial
              color={isCompleted ? '#27272a' : '#71717a'}
              roughness={0.9}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Glowing Ember Point traveling down the rod */}
          {(isIgniting || isActive) && (
            <mesh
              ref={fuseSparkRef}
              position={[
                0,
                isActive
                  ? Math.max(0.18, 0.51 - (elapsedInState / 7.5) * 0.33)
                  : 0.51,
                0,
              ]}
            >
              <sphereGeometry args={[0.035, 12, 12]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          )}
        </group>
      )}

      {/* 2. FLOWER POT / ANAR (Conical Foil & Terracotta Fountain) */}
      {crackerId === 'flower-pot' && (
        <group>
          {/* Decorative Base Rim */}
          <mesh position={[0, 0.02, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.145, 0.155, 0.04, 24]} />
            <meshStandardMaterial
              color={isCompleted ? '#3f3f46' : '#fbbf24'}
              metalness={0.5}
              roughness={0.35}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Conical Body with Indian Foil Label */}
          <mesh position={[0, 0.16, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.042, 0.14, 0.28, 28]} />
            <meshStandardMaterial
              map={anarTexture}
              color={isCompleted ? '#52525b' : '#ffffff'}
              roughness={0.45}
              metalness={0.25}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Top Clay Nozzle Ring */}
          <mesh position={[0, 0.305, 0]}>
            <cylinderGeometry args={[0.044, 0.044, 0.02, 20]} />
            <meshStandardMaterial
              color={isActive ? '#fef08a' : '#d6d3d1'}
              emissive={isActive ? '#f97316' : '#000000'}
              emissiveIntensity={isActive ? 2.5 : 0}
            />
          </mesh>
          {/* Top Paper Fuse Wick */}
          {!isCompleted && (
            <mesh position={[0, 0.34, 0]} rotation={[0, 0, 0.18]}>
              <cylinderGeometry args={[0.008, 0.01, 0.06, 8]} />
              <meshStandardMaterial color="#fde047" roughness={0.7} />
            </mesh>
          )}
          {(isIgniting || isActive) && (
            <mesh ref={fuseSparkRef} position={[0, 0.34, 0]}>
              <sphereGeometry args={[0.036, 12, 12]} />
              <meshBasicMaterial color="#fffbeb" />
            </mesh>
          )}
        </group>
      )}

      {/* 3. ZAMEEN CHAKRI (Coiled Spinning Ground Disc) */}
      {crackerId === 'chakri' && (
        <group ref={spinGroupRef} position={[0, 0.032, 0]}>
          {/* Outer Crimson Foil Rim */}
          <mesh castShadow={!isPreview}>
            <cylinderGeometry args={[0.16, 0.16, 0.042, 28]} />
            <meshStandardMaterial
              color={isCompleted ? '#3f3f46' : '#e11d48'}
              metalness={0.35}
              roughness={0.4}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Coiled Green/Gold Pyrotechnic Tube Ring */}
          <mesh position={[0, 0.006, 0]}>
            <cylinderGeometry args={[0.125, 0.125, 0.045, 24]} />
            <meshStandardMaterial
              color={isCompleted ? '#27272a' : '#10b981'}
              roughness={0.5}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Inner Gold Pivot Cap */}
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.05, 20]} />
            <meshStandardMaterial
              color={isCompleted ? '#52525b' : '#fbbf24'}
              metalness={0.7}
              roughness={0.25}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>
          {/* Side Tangential Ignition Fuse */}
          {!isCompleted && (
            <mesh position={[0.16, 0, 0.04]} rotation={[0, 0.4, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.06, 8]} />
              <meshStandardMaterial color="#fef08a" />
            </mesh>
          )}
          {(isIgniting || isActive) && (
            <mesh ref={fuseSparkRef} position={[0.17, 0.02, 0.02]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          )}
        </group>
      )}

      {/* 4. SKY ROCKET (Glass Launch Bottle + Stabilizer Stick + Rocket Body) */}
      {crackerId === 'rocket' && (
        <group>
          {/* Weighted Amber Glass Launch Bottle (stays on ground) */}
          <group>
            <mesh position={[0, 0.11, 0]} castShadow={!isPreview}>
              <cylinderGeometry args={[0.055, 0.062, 0.22, 20]} />
              <meshStandardMaterial
                color="#78350f"
                roughness={0.18}
                metalness={0.15}
                transparent
                opacity={isPreview ? 0.55 : 0.86}
              />
            </mesh>
            {/* Bottle Neck */}
            <mesh position={[0, 0.26, 0]} castShadow={!isPreview}>
              <cylinderGeometry args={[0.024, 0.05, 0.09, 16]} />
              <meshStandardMaterial
                color="#92400e"
                roughness={0.2}
                transparent
                opacity={isPreview ? 0.55 : 0.86}
              />
            </mesh>
            {/* Brass Bottle Rim */}
            <mesh position={[0, 0.31, 0]}>
              <cylinderGeometry args={[0.028, 0.028, 0.018, 16]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
            </mesh>
          </group>

          {/* Launchable Rocket Assembly */}
          <group ref={rocketBodyRef}>
            {/* Long Bamboo Guide Stick */}
            <mesh position={[0.012, 0.34, 0]} castShadow={!isPreview}>
              <cylinderGeometry args={[0.006, 0.006, 0.58, 8]} />
              <meshStandardMaterial color="#d97706" roughness={0.8} />
            </mesh>
            {/* Rocket Motor Cylinder with Festive Foil */}
            <mesh position={[0, 0.48, 0]} castShadow={!isPreview}>
              <cylinderGeometry args={[0.036, 0.036, 0.22, 20]} />
              <meshStandardMaterial
                map={rocketTexture}
                roughness={0.4}
                metalness={0.3}
                transparent={isPreview}
                opacity={opacity}
              />
            </mesh>
            {/* Aerodynamic Gold/Crimson Nose Cone */}
            <mesh position={[0, 0.64, 0]} castShadow={!isPreview}>
              <coneGeometry args={[0.04, 0.11, 20]} />
              <meshStandardMaterial
                color="#fbbf24"
                metalness={0.65}
                roughness={0.25}
                transparent={isPreview}
                opacity={opacity}
              />
            </mesh>
            {/* Bottom Fuse Wick */}
            <mesh position={[0, 0.34, 0]} rotation={[0, 0, -0.15]}>
              <cylinderGeometry args={[0.006, 0.006, 0.07, 8]} />
              <meshStandardMaterial color="#fef08a" />
            </mesh>
            {(isIgniting || isActive) && (
              <mesh ref={fuseSparkRef} position={[0, 0.34, 0]}>
                <sphereGeometry args={[0.04, 12, 12]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            )}
          </group>
        </group>
      )}

      {/* 5. AERIAL FIREWORKS (Hexagonal 7-Tube Mortar Repeater Cake) */}
      {crackerId === 'aerial-fireworks' && (
        <group>
          {/* Heavy Hexagonal Base Platform */}
          <mesh position={[0, 0.02, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.2, 0.21, 0.04, 6]} />
            <meshStandardMaterial
              color={isCompleted ? '#27272a' : '#b91c1c'}
              roughness={0.6}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>

          {/* Outer Decorative Foil Jacket */}
          <mesh position={[0, 0.16, 0]} castShadow={!isPreview}>
            <cylinderGeometry args={[0.175, 0.175, 0.26, 6]} />
            <meshStandardMaterial
              map={aerialTexture}
              color={isCompleted ? '#52525b' : '#ffffff'}
              roughness={0.42}
              metalness={0.3}
              transparent={isPreview}
              opacity={opacity}
            />
          </mesh>

          {/* 7 Individual Mortar Launch Tubes Inside */}
          {[
            [0, 0],
            [0.095, 0],
            [-0.095, 0],
            [0.048, 0.082],
            [-0.048, 0.082],
            [0.048, -0.082],
            [-0.048, -0.082],
          ].map(([tx, tz], idx) => (
            <group key={idx} position={[tx, 0.17, tz]}>
              <mesh castShadow={!isPreview}>
                <cylinderGeometry args={[0.042, 0.042, 0.28, 16]} />
                <meshStandardMaterial
                  color={isCompleted ? '#3f3f46' : '#fbbf24'}
                  metalness={0.5}
                  roughness={0.35}
                />
              </mesh>
              <mesh position={[0, 0.141, 0]}>
                <cylinderGeometry args={[0.034, 0.034, 0.01, 14]} />
                <meshBasicMaterial color={isActive ? '#fde047' : '#18181b'} />
              </mesh>
            </group>
          ))}

          {/* Side Ignition Fuse */}
          {!isCompleted && (
            <mesh position={[0.18, 0.08, 0]} rotation={[0, 0, -0.6]}>
              <cylinderGeometry args={[0.008, 0.008, 0.09, 8]} />
              <meshStandardMaterial color="#fde047" />
            </mesh>
          )}
          {(isIgniting || isActive) && (
            <mesh
              ref={fuseSparkRef}
              position={isActive ? [0, 0.32, 0] : [0.21, 0.1, 0]}
            >
              <sphereGeometry args={[0.042, 12, 12]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          )}
        </group>
      )}

      {/* 6. 100-WALA GARLAND CRACKER (Braided Crimson Firecracker Strip) */}
      {crackerId === 'garland-cracker' && (
        <group position={[0, 0.025, 0]}>
          {/* Central Braided Spine Fuse */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.56, 10]} />
            <meshStandardMaterial
              color={isCompleted ? '#27272a' : '#fde047'}
              roughness={0.8}
            />
          </mesh>

          {/* 14 Alternating Crimson & Gold Firecracker Cylinders */}
          {Array.from({ length: 14 }).map((_, i) => {
            const zOffset = -0.24 + i * 0.037;
            const side = i % 2 === 0 ? 1 : -1;
            const popped =
              isCompleted ||
              (isActive && elapsedInState / 5.2 > i / 14);

            return (
              <group
                key={i}
                position={[side * 0.055, popped ? -0.008 : 0, zOffset]}
                rotation={[0, side * 0.25, Math.PI / 2]}
              >
                <mesh castShadow={!isPreview}>
                  <cylinderGeometry args={[0.018, 0.018, 0.095, 12]} />
                  <meshStandardMaterial
                    color={
                      popped
                        ? `rgb(${Math.floor(45 * charFactor)}, 38, 42)`
                        : '#dc2626'
                    }
                    roughness={0.65}
                    transparent={isPreview}
                    opacity={opacity}
                  />
                </mesh>
                {/* Gold Foil Band on each cylinder */}
                {!popped && (
                  <mesh position={[0, 0.025, 0]}>
                    <cylinderGeometry args={[0.019, 0.019, 0.018, 12]} />
                    <meshStandardMaterial
                      color="#fbbf24"
                      metalness={0.6}
                      roughness={0.3}
                    />
                  </mesh>
                )}
              </group>
            );
          })}

          {(isIgniting || isActive) && (
            <mesh
              ref={fuseSparkRef}
              position={[
                0,
                0.025,
                isActive
                  ? -0.25 + Math.min(1, elapsedInState / 5.2) * 0.5
                  : -0.27,
              ]}
            >
              <sphereGeometry args={[0.038, 12, 12]} />
              <meshBasicMaterial color="#fffbeb" />
            </mesh>
          )}
        </group>
      )}

      {/* Placement Preview Ring Indicator */}
      {isPreview && (
        <group position={[0, 0.006, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.26, 0.33, 36]} />
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
      )}
    </group>
  );
};

interface PlacedCrackersManager3DProps {
  placedCrackers: PlacedCrackerInstance[];
  nearestInteractableId: string | null;
  currentTimeMs: number;
  onSelectPlacedCracker: (instanceId: string) => void;
}

export const PlacedCrackersManager3D: React.FC<PlacedCrackersManager3DProps> = ({
  placedCrackers,
  nearestInteractableId,
  currentTimeMs,
  onSelectPlacedCracker,
}) => {
  return (
    <group>
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
              if (item.state === 'Placed') {
                onSelectPlacedCracker(item.instanceId);
              }
            }}
          >
            {/* Ground shadow under cracker */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
              <circleGeometry args={[0.2, 20]} />
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={item.state === 'Completed' ? 0.25 : 0.45}
                depthWrite={false}
              />
            </mesh>

            {/* Interactive Highlight Ring when Placed and ready to ignite */}
            {item.state === 'Placed' && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
                <ringGeometry
                  args={isNearest ? [0.24, 0.31, 32] : [0.22, 0.25, 32]}
                />
                <meshBasicMaterial
                  color={isNearest ? '#fbbf24' : config.accentColor}
                  transparent
                  opacity={isNearest ? 0.92 : 0.55}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}

            {/* Safety Warning Pulse Ring during Igniting */}
            {item.state === 'Igniting' && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
                <ringGeometry args={[0.26, 0.34, 32]} />
                <meshBasicMaterial
                  color="#f97316"
                  transparent
                  opacity={0.85}
                  side={THREE.DoubleSide}
                />
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
