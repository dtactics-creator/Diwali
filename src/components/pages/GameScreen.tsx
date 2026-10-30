import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CRACKERS, CRACKER_LIST } from '../../config/crackers';
import { ENVIRONMENTS } from '../../config/environments';
import {
  GRAPHICS_PRESETS,
  TIME_OF_DAY_PRESETS,
  WEATHER_PRESETS,
} from '../../config/timeAndWeather';
import { audioSystem } from '../../systems/AudioSystem';
import {
  CharacterAnimationState,
  CrackerId,
  CrackerInteractionState,
  EnvironmentId,
  PlacedCrackerInstance,
  PlayableBounds,
  SimulationSettings,
} from '../../types/game';
import {
  getCrackerWorldFusePosition,
  PlacedCrackersManager3D,
} from '../3d/CrackerModels3D';
import { FireworksSystem3D } from '../3d/FireworksSystem3D';
import {
  CharacterInputState,
  PlayerCharacter3D,
} from '../3d/PlayerCharacter3D';
import { SceneEnvironment3D } from '../3d/SceneEnvironment3D';
import { BackgroundStage } from '../game/BackgroundStage';
import { GameHUD } from '../game/GameHUD';

interface GameScreenProps {
  settings: SimulationSettings;
  selectedCrackerId: CrackerId | null;
  onSelectCrackerId: (id: CrackerId | null) => void;
  onUpdateSettings: (partial: Partial<SimulationSettings>) => void;
  onCrackerIgnited: (crackerId: CrackerId, envId: EnvironmentId) => void;
  onOpenCollection: () => void;
  onOpenDashboard: () => void;
  onOpenAssetManifest: () => void;
  onOpenSetupStudio: () => void;
  onBackToLanding: () => void;
  customCharacterGlbUrl: string | null;
  onCharacterAssetStatusChange: (loadedCustom: boolean, clips: string[]) => void;
}

/**
 * Calculates a safe retreat destination point away from the cracker,
 * ensuring it stays within playable bounds and maintains at least safeRadius distance.
 */
function findSafeRetreatPoint(
  crackerPos: [number, number, number],
  charPos: [number, number, number],
  safeRadius: number,
  bounds: PlayableBounds,
  groundY: number
): [number, number, number] {
  const dx = charPos[0] - crackerPos[0];
  const dz = charPos[2] - crackerPos[2];
  const baseAngle = Math.atan2(dz, dx);
  const desiredDist = safeRadius + 0.85;
  const padding = 0.35;

  // Try straight retreat angle first, then outward angular cones to navigate boundaries safely
  const angleOffsets = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, Math.PI];
  let bestPoint: [number, number, number] | null = null;
  let bestDist = -1;

  for (const offset of angleOffsets) {
    const ang = baseAngle + offset;
    const rawX = crackerPos[0] + Math.cos(ang) * desiredDist;
    const rawZ = crackerPos[2] + Math.sin(ang) * desiredDist;
    const clampedX = THREE.MathUtils.clamp(rawX, bounds.minX + padding, bounds.maxX - padding);
    const clampedZ = THREE.MathUtils.clamp(rawZ, bounds.minZ + padding, bounds.maxZ - padding);
    const distFromCracker = Math.hypot(clampedX - crackerPos[0], clampedZ - crackerPos[2]);

    if (distFromCracker >= safeRadius) {
      return [clampedX, groundY, clampedZ];
    }
    if (distFromCracker > bestDist) {
      bestDist = distFromCracker;
      bestPoint = [clampedX, groundY, clampedZ];
    }
  }

  return bestPoint || [charPos[0], groundY, charPos[2]];
}

export const GameScreen: React.FC<GameScreenProps> = ({
  settings,
  selectedCrackerId,
  onSelectCrackerId,
  onUpdateSettings,
  onCrackerIgnited,
  onOpenCollection,
  onOpenDashboard,
  onOpenAssetManifest,
  onOpenSetupStudio,
  onBackToLanding,
  customCharacterGlbUrl,
  onCharacterAssetStatusChange,
}) => {
  const environment = ENVIRONMENTS[settings.environment];
  const timeOfDay = TIME_OF_DAY_PRESETS[settings.timeOfDay];
  const weather = WEATHER_PRESETS[settings.weather];
  const graphics = GRAPHICS_PRESETS[settings.graphicsQuality];

  const [placedCrackers, setPlacedCrackers] = useState<PlacedCrackerInstance[]>([]);
  const [hoverPosition, setHoverPosition] = useState<[number, number, number] | null>(
    null
  );
  const [isValidHover, setIsValidHover] = useState<boolean>(false);

  const [characterPos, setCharacterPos] = useState<[number, number, number]>(
    environment.characterSpawn
  );
  const [characterAnimState, setCharacterAnimState] =
    useState<CharacterAnimationState>('Idle');
  const [forcedCharState, setForcedCharState] =
    useState<CharacterAnimationState | null>(null);
  const [igniteTargetPos, setIgniteTargetPos] = useState<
    [number, number, number] | null
  >(null);

  // Clear interaction state machine
  const [interactionState, setInteractionState] =
    useState<CrackerInteractionState>('idle');
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [autoMoveTarget, setAutoMoveTarget] = useState<
    [number, number, number] | null
  >(null);
  const [autoMoveMode, setAutoMoveMode] = useState<
    'approach' | 'retreat' | null
  >(null);

  const interactionStateRef = useRef<CrackerInteractionState>('idle');
  interactionStateRef.current = interactionState;

  const activeInstanceIdRef = useRef<string | null>(null);
  activeInstanceIdRef.current = activeInstanceId;

  const characterPosRef = useRef<[number, number, number]>(characterPos);
  characterPosRef.current = characterPos;

  const reachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeParticleCount, setActiveParticleCount] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => performance.now());
  const [envResetNotice, setEnvResetNotice] = useState<string | null>(null);

  const prevEnvIdRef = useRef<EnvironmentId>(settings.environment);
  const cameraShakeRef = useRef<number>(0);

  const inputRef = useRef<CharacterInputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    crouch: false,
    celebrate: false,
    celebrateTrigger: 0,
    joyX: 0,
    joyY: 0,
  });

  // Sync Audio System with settings and Rain ambience
  useEffect(() => {
    audioSystem.setSettings(settings.soundEnabled, settings.soundVolume);
    const isRaining =
      settings.weatherEffectsEnabled &&
      settings.weather === 'rain' &&
      !isPaused;
    audioSystem.updateRainAmbience(isRaining);
    return () => {
      audioSystem.stopRainAmbience();
    };
  }, [
    settings.soundEnabled,
    settings.soundVolume,
    settings.weather,
    settings.weatherEffectsEnabled,
    isPaused,
  ]);

  // Handle Environment Change deliberately (reposition character & clear ground bounds)
  useEffect(() => {
    if (prevEnvIdRef.current !== settings.environment) {
      prevEnvIdRef.current = settings.environment;
      if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
      if (lightTimerRef.current) clearTimeout(lightTimerRef.current);
      setPlacedCrackers([]);
      setHoverPosition(null);
      setForcedCharState(null);
      setIgniteTargetPos(null);
      setAutoMoveTarget(null);
      setAutoMoveMode(null);
      setInteractionState('idle');
      setActiveInstanceId(null);
      setEnvResetNotice(
        `Switched to ${ENVIRONMENTS[settings.environment].name} — Character & placement zone aligned.`
      );
      const timer = setTimeout(() => setEnvResetNotice(null), 3600);
      return () => clearTimeout(timer);
    }
  }, [settings.environment]);

  // Find nearest placed cracker within strict physical interaction range
  const nearestInteractableCracker = useMemo(() => {
    const readyList = placedCrackers.filter((c) => c.state === 'Placed');
    if (readyList.length === 0) return null;

    let closest: PlacedCrackerInstance | null = null;
    let minDist = Infinity;

    for (const item of readyList) {
      const fusePos = getCrackerWorldFusePosition(item);
      const distToFuse = Math.hypot(
        fusePos[0] - characterPos[0],
        fusePos[2] - characterPos[2]
      );
      const distToBase = Math.hypot(
        item.position[0] - characterPos[0],
        item.position[2] - characterPos[2]
      );
      const effectiveDist = Math.min(distToFuse, distToBase);
      const maxRange = CRACKERS[item.crackerId].interactionDistance;

      if (effectiveDist <= maxRange && effectiveDist < minDist) {
        minDist = effectiveDist;
        closest = item;
      }
    }
    return closest;
  }, [placedCrackers, characterPos]);

  // Initiate Sequential Cracker Interaction Flow (Approach -> Reach Fuse -> Ignite -> Retreat -> Safe -> Celebrate)
  const handleIgniteCracker = useCallback(
    (instanceId: string) => {
      // 1. Never allow ignition when another cracker interaction is already in progress
      if (interactionStateRef.current !== 'idle' || isPaused) return;

      const target = placedCrackers.find((c) => c.instanceId === instanceId);
      if (!target || target.state !== 'Placed') return;

      // 2. Strict Proximity Check: verify physical distance to cracker fuse / base
      const fusePos = getCrackerWorldFusePosition(target);
      const distToFuse = Math.hypot(
        characterPosRef.current[0] - fusePos[0],
        characterPosRef.current[2] - fusePos[2]
      );
      const distToBase = Math.hypot(
        characterPosRef.current[0] - target.position[0],
        characterPosRef.current[2] - target.position[2]
      );
      const effectiveDist = Math.min(distToFuse, distToBase);
      const maxRange = CRACKERS[target.crackerId].interactionDistance;

      if (effectiveDist > maxRange) {
        // Outside interaction range: do absolutely nothing (no remote ignition!)
        return;
      }

      // 3. Initiate Approach Phase
      setActiveInstanceId(instanceId);
      setInteractionState('approaching');

      // Calculate natural standing position near the actual fuse
      const dx = characterPosRef.current[0] - fusePos[0];
      const dz = characterPosRef.current[2] - fusePos[2];
      const len = Math.hypot(dx, dz);
      const dirX = len > 0.01 ? dx / len : 0;
      const dirZ = len > 0.01 ? dz / len : 1;
      const standX = THREE.MathUtils.clamp(
        fusePos[0] + dirX * 0.48,
        environment.movementBounds.minX + 0.25,
        environment.movementBounds.maxX - 0.25
      );
      const standZ = THREE.MathUtils.clamp(
        fusePos[2] + dirZ * 0.48,
        environment.movementBounds.minZ + 0.25,
        environment.movementBounds.maxZ - 0.25
      );

      setIgniteTargetPos(fusePos);
      setAutoMoveTarget([standX, environment.groundY, standZ]);
      setAutoMoveMode('approach');
      setForcedCharState(null); // Natural walking animation during approach
    },
    [isPaused, placedCrackers, environment.movementBounds, environment.groundY]
  );

  // Handle Character Auto-Movement Waypoint Completion
  const handleAutoMoveComplete = useCallback(() => {
    const currentState = interactionStateRef.current;
    const currentActiveId = activeInstanceIdRef.current;

    if (currentState === 'approaching') {
      // Step: Approach completed -> Character reaches near fuse
      setAutoMoveTarget(null);
      setAutoMoveMode(null);

      const target = placedCrackers.find((c) => c.instanceId === currentActiveId);
      if (!target) {
        setInteractionState('idle');
        setActiveInstanceId(null);
        return;
      }

      const fusePos = getCrackerWorldFusePosition(target);
      setIgniteTargetPos(fusePos);
      setInteractionState('reaching_fuse');
      setForcedCharState('Ignite'); // Crouch down and reach glowing agarbatti to actual fuse

      if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
      reachTimerRef.current = setTimeout(() => {
        setInteractionState('igniting');

        // Cracker state transitions to 'Igniting'
        const ignTs = performance.now();
        setPlacedCrackers((prev) =>
          prev.map((item) =>
            item.instanceId === currentActiveId
              ? { ...item, state: 'Igniting', ignitedAt: ignTs }
              : item
          )
        );

        const cfg = CRACKERS[target.crackerId];
        audioSystem.playFuseIgnite(cfg.ignitionDuration);

        // Maintain reaching-lighting posture for 700ms so fuse visibly catches fire with sparks
        if (lightTimerRef.current) clearTimeout(lightTimerRef.current);
        lightTimerRef.current = setTimeout(() => {
          // Immediately switch into MANDATORY RETREAT
          setInteractionState('retreating');
          setForcedCharState(null);

          const safeRadius = Math.max(cfg.safetyRadius + 1.2, 2.6);
          const retreatPos = findSafeRetreatPoint(
            target.position,
            characterPosRef.current,
            safeRadius,
            environment.movementBounds,
            environment.groundY
          );

          setAutoMoveTarget(retreatPos);
          setAutoMoveMode('retreat');
          // Face the cracker upon completing retreat
          setIgniteTargetPos(target.position);
        }, 700);
      }, 350);
    } else if (currentState === 'retreating') {
      // Step: Retreat completed -> Verify safe distance
      const target = placedCrackers.find((c) => c.instanceId === currentActiveId);
      const safeRadius = target
        ? Math.max(CRACKERS[target.crackerId].safetyRadius + 1.2, 2.6)
        : 2.6;
      const currentDist = target
        ? Math.hypot(
            characterPosRef.current[0] - target.position[0],
            characterPosRef.current[2] - target.position[2]
          )
        : Infinity;

      if (currentDist >= safeRadius) {
        setAutoMoveTarget(null);
        setAutoMoveMode(null);
        setInteractionState('safe');
        // Restore controls & automatically trigger Diwali celebration
        setForcedCharState('Celebrate');
        setInteractionState('celebrating');
      }
    }
  }, [placedCrackers, environment.movementBounds, environment.groundY]);

  // Synchronized Simulation Ticker: Safe Distance Validation & Lifecycle State Management
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const currentTs = performance.now();
      setNowMs(currentTs);

      // Continuous safe-distance validation during retreat
      if (
        interactionStateRef.current === 'retreating' &&
        activeInstanceIdRef.current
      ) {
        const target = placedCrackers.find(
          (c) => c.instanceId === activeInstanceIdRef.current
        );
        if (target) {
          const cfg = CRACKERS[target.crackerId];
          const safeRadius = Math.max(cfg.safetyRadius + 1.2, 2.6);
          const currentDist = Math.hypot(
            characterPosRef.current[0] - target.position[0],
            characterPosRef.current[2] - target.position[2]
          );

          if (currentDist >= safeRadius) {
            setAutoMoveTarget(null);
            setAutoMoveMode(null);
            setInteractionState('safe');
            setForcedCharState('Celebrate');
            setInteractionState('celebrating');
            setIgniteTargetPos(target.position);
          }
        }
      }

      setPlacedCrackers((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const cfg = CRACKERS[item.crackerId];

          if (item.state === 'Igniting' && item.ignitedAt) {
            const elapsedSec = (currentTs - item.ignitedAt) / 1000;
            const fuseDone = elapsedSec >= cfg.ignitionDuration;

            // Physical safety validation: cracker must NOT explode while character is inside safe radius
            const charDist = Math.hypot(
              characterPosRef.current[0] - item.position[0],
              characterPosRef.current[2] - item.position[2]
            );
            const safeRadiusThreshold = Math.max(cfg.safetyRadius + 1.2, 2.6);
            const isPhysicallySafe = charDist >= safeRadiusThreshold;

            if (fuseDone && isPhysicallySafe) {
              changed = true;

              // Play active audio & record statistics
              if (
                item.crackerId === 'phuljhadi' ||
                item.crackerId === 'flower-pot'
              ) {
                audioSystem.playSparkleFountain(cfg.activeDuration);
              } else if (item.crackerId === 'chakri') {
                audioSystem.playChakriSpin(cfg.activeDuration);
              }
              onCrackerIgnited(item.crackerId, settings.environment);

              // Maintain joyful celebration throughout active show and explosion
              setForcedCharState('Celebrate');
              setInteractionState('celebrating');
              setIgniteTargetPos(item.position);

              return {
                ...item,
                state: 'Active' as const,
                activeStartedAt: currentTs,
              };
            }
          } else if (item.state === 'Active' && item.activeStartedAt) {
            const elapsedSec = (currentTs - item.activeStartedAt) / 1000;
            // Total effect sequence: active duration + visual blast and aftermath settling (+1.2s)
            const fullShowDuration = cfg.activeDuration + 1.2;
            if (elapsedSec >= fullShowDuration) {
              changed = true;
              return {
                ...item,
                state: 'Completed' as const,
                completedAt: currentTs,
              };
            }
          }
          return item;
        });

        // Check if active cracker interaction completed
        if (activeInstanceIdRef.current) {
          const activeCracker = next.find(
            (c) => c.instanceId === activeInstanceIdRef.current
          );
          if (activeCracker && activeCracker.state === 'Completed') {
            // Once full effect sequence completes, smoothly transition back to Idle
            setForcedCharState(null);
            setIgniteTargetPos(null);
            setInteractionState('idle');
            setActiveInstanceId(null);
          }
        }

        // Clean up old completed crackers if more than 14 accumulate on the ground
        const completedCount = next.filter((c) => c.state === 'Completed').length;
        if (completedCount > 14) {
          changed = true;
          let removed = false;
          return next.filter((c) => {
            if (!removed && c.state === 'Completed') {
              removed = true;
              return false;
            }
            return true;
          });
        }

        return changed ? next : prev;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [isPaused, onCrackerIgnited, settings.environment, placedCrackers]);

  // Keyboard Controls Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never hijack typing in form fields
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (selectedCrackerId) {
          onSelectCrackerId(null);
          setHoverPosition(null);
        } else {
          setIsPaused((p) => !p);
        }
        return;
      }

      if (isPaused) return;

      // Movement — allow browser key-repeat for held movement keys
      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.forward = true;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.backward = true;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = true;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = true;

      // Shift = Run
      if (e.key === 'Shift' && !e.repeat) inputRef.current.run = true;

      // Crouch — hold
      if (key === 'c' && !e.repeat) inputRef.current.crouch = true;

      // Number keys 1-6 select crackers
      if (!e.repeat && ['1', '2', '3', '4', '5', '6'].includes(key)) {
        const idx = parseInt(key, 10) - 1;
        if (CRACKER_LIST[idx]) {
          audioSystem.playUIClick();
          onSelectCrackerId(CRACKER_LIST[idx].id);
        }
      }

      // Strict Proximity E key: ONLY lights nearest interactable cracker when within range and idle
      if (key === 'e' && !e.repeat) {
        if (nearestInteractableCracker && interactionStateRef.current === 'idle') {
          handleIgniteCracker(nearestInteractableCracker.instanceId);
        }
        // If outside interaction range: do absolutely nothing. No remote ignition fallback.
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.forward = false;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.backward = false;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = false;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = false;
      if (e.key === 'Shift') inputRef.current.run = false;
      if (key === 'c') inputRef.current.crouch = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isPaused,
    selectedCrackerId,
    nearestInteractableCracker,
    handleIgniteCracker,
    onSelectCrackerId,
  ]);

  const handleGroundHover = useCallback(
    (pos: [number, number, number] | null, isValid: boolean) => {
      setHoverPosition(pos);
      setIsValidHover(isValid);
    },
    []
  );

  const handleGroundClick = useCallback(
    (pos: [number, number, number], isValid: boolean) => {
      if (!selectedCrackerId || !isValid || isPaused) return;

      audioSystem.playPlaceCracker();

      const newInstance: PlacedCrackerInstance = {
        instanceId: `cracker-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        crackerId: selectedCrackerId,
        position: [pos[0], environment.groundY, pos[2]],
        rotationY: Math.random() * Math.PI * 2,
        state: 'Placed',
        placedAt: performance.now(),
      };

      setPlacedCrackers((prev) => [...prev, newInstance]);
      onSelectCrackerId(null);
      setHoverPosition(null);
    },
    [selectedCrackerId, isPaused, environment.groundY, onSelectCrackerId]
  );

  const handleCharacterPositionChange = useCallback(
    (pos: [number, number, number], animState: CharacterAnimationState) => {
      setCharacterPos(pos);
      setCharacterAnimState(animState);
    },
    []
  );

  const handleCameraShake = useCallback(
    (intensity: number) => {
      if (!settings.reducedFlash) {
        cameraShakeRef.current = Math.max(cameraShakeRef.current, intensity);
      }
    },
    [settings.reducedFlash]
  );

  const handleRestartScene = useCallback(() => {
    if (reachTimerRef.current) clearTimeout(reachTimerRef.current);
    if (lightTimerRef.current) clearTimeout(lightTimerRef.current);
    setPlacedCrackers([]);
    setHoverPosition(null);
    onSelectCrackerId(null);
    setForcedCharState(null);
    setIgniteTargetPos(null);
    setAutoMoveTarget(null);
    setAutoMoveMode(null);
    setInteractionState('idle');
    setActiveInstanceId(null);
    setCharacterPos([...environment.characterSpawn]);
  }, [environment.characterSpawn, onSelectCrackerId]);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 touch-none"
      onContextMenu={(e) => {
        if (selectedCrackerId) {
          e.preventDefault();
          onSelectCrackerId(null);
          setHoverPosition(null);
        }
      }}
    >
      {/* 1. Multi-Layered 2D Background Stage */}
      <BackgroundStage
        environment={environment}
        timeOfDay={timeOfDay}
        weather={weather}
        weatherEffectsEnabled={settings.weatherEffectsEnabled}
      />

      {/* 2. Real-Time 3D WebGL Viewport */}
      <div className="absolute inset-0 z-10">
        <Canvas
          shadows={graphics.enableShadows}
          dpr={graphics.dpr}
          gl={{
            alpha: true,
            antialias: settings.graphicsQuality !== 'LOW',
            powerPreference: 'high-performance',
          }}
          camera={{
            position: environment.camera.position,
            fov: environment.camera.fov,
            near: 0.1,
            far: 100,
          }}
        >
          <SceneEnvironment3D
            environment={environment}
            timeOfDay={timeOfDay}
            weather={weather}
            weatherEffectsEnabled={settings.weatherEffectsEnabled}
            graphics={graphics}
            selectedCrackerForPlacement={selectedCrackerId}
            hoverPosition={hoverPosition}
            isValidHover={isValidHover}
            onGroundHover={handleGroundHover}
            onGroundClick={handleGroundClick}
            cameraShakeRef={cameraShakeRef}
          />

          <PlayerCharacter3D
            spawnPosition={environment.characterSpawn}
            groundY={environment.groundY}
            movementBounds={environment.movementBounds}
            inputRef={inputRef}
            autoMoveTarget={autoMoveTarget}
            autoMoveMode={autoMoveMode}
            onAutoMoveComplete={handleAutoMoveComplete}
            forcedState={forcedCharState}
            igniteTargetPosition={igniteTargetPos}
            onPositionChange={handleCharacterPositionChange}
            customGlbUrl={customCharacterGlbUrl}
            onAssetStatusChange={onCharacterAssetStatusChange}
            enableShadows={graphics.enableShadows}
          />

          <PlacedCrackersManager3D
            placedCrackers={placedCrackers}
            nearestInteractableId={
              interactionState === 'idle'
                ? nearestInteractableCracker?.instanceId || null
                : null
            }
            currentTimeMs={nowMs}
            onSelectPlacedCracker={handleIgniteCracker}
          />

          <FireworksSystem3D
            placedCrackers={placedCrackers}
            graphics={graphics}
            reducedFlash={settings.reducedFlash}
            groundY={environment.groundY}
            contrastBoost={timeOfDay.fireworkContrastBoost}
            onCameraShake={handleCameraShake}
            onActiveParticleCountChange={setActiveParticleCount}
          />
        </Canvas>
      </div>

      {/* 3. Unobtrusive Glassmorphic Game HUD */}
      <GameHUD
        settings={settings}
        selectedCrackerForPlacement={selectedCrackerId}
        placedCrackers={placedCrackers}
        nearestInteractableCracker={
          interactionState === 'idle' ? nearestInteractableCracker : null
        }
        interactionState={interactionState}
        isValidHover={isValidHover}
        hasHoverPoint={hoverPosition !== null}
        characterAnimState={characterAnimState}
        activeParticleCount={activeParticleCount}
        isPaused={isPaused}
        environmentResetNotice={envResetNotice}
        inputRef={inputRef}
        onSelectCrackerForPlacement={(id) => {
          audioSystem.playUIClick();
          onSelectCrackerId(id);
          if (!id) setHoverPosition(null);
        }}
        onIgniteCracker={handleIgniteCracker}
        onUpdateSettings={onUpdateSettings}
        onTogglePause={() => setIsPaused((p) => !p)}
        onRestartScene={handleRestartScene}
        onOpenCollection={onOpenCollection}
        onOpenDashboard={onOpenDashboard}
        onOpenAssetManifest={onOpenAssetManifest}
        onOpenSetupStudio={onOpenSetupStudio}
        onBackToLanding={onBackToLanding}
      />
    </div>
  );
};
