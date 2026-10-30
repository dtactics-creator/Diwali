import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
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
  EnvironmentId,
  PlacedCrackerInstance,
  SimulationSettings,
} from '../../types/game';
import { PlacedCrackersManager3D } from '../3d/CrackerModels3D';
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
      setPlacedCrackers([]);
      setHoverPosition(null);
      setEnvResetNotice(
        `Switched to ${ENVIRONMENTS[settings.environment].name} — Character & placement zone aligned.`
      );
      const timer = setTimeout(() => setEnvResetNotice(null), 3600);
      return () => clearTimeout(timer);
    }
  }, [settings.environment]);

  // Find nearest placed cracker within interaction range (or fallback to closest placed cracker)
  const nearestInteractableCracker = useMemo(() => {
    const readyList = placedCrackers.filter((c) => c.state === 'Placed');
    if (readyList.length === 0) return null;

    let closest: PlacedCrackerInstance | null = null;
    let minDist = Infinity;

    for (const item of readyList) {
      const dx = item.position[0] - characterPos[0];
      const dz = item.position[2] - characterPos[2];
      const dist = Math.hypot(dx, dz);
      const maxRange = CRACKERS[item.crackerId].interactionDistance;
      if (dist <= maxRange && dist < minDist) {
        minDist = dist;
        closest = item;
      }
    }
    return closest;
  }, [placedCrackers, characterPos]);

  // Trigger ignition on a placed cracker instance
  const handleIgniteCracker = useCallback(
    (instanceId: string) => {
      setPlacedCrackers((prev) => {
        const target = prev.find((c) => c.instanceId === instanceId);
        if (!target || target.state !== 'Placed') return prev;

        const cfg = CRACKERS[target.crackerId];
        audioSystem.playFuseIgnite(cfg.ignitionDuration);

        // Trigger character Ignite crouch-and-reach animation
        setIgniteTargetPos(target.position);
        setForcedCharState('Ignite');
        setTimeout(() => {
          setForcedCharState((curr) => (curr === 'Ignite' ? null : curr));
          setIgniteTargetPos(null);
        }, 1150);

        return prev.map((item) =>
          item.instanceId === instanceId
            ? {
                ...item,
                state: 'Igniting',
                ignitedAt: performance.now(),
              }
            : item
        );
      });
    },
    []
  );

  // Ignite all placed crackers simultaneously
  const handleIgniteAllPlaced = useCallback(() => {
    const ready = placedCrackers.filter((c) => c.state === 'Placed');
    if (ready.length === 0) return;

    audioSystem.playFuseIgnite(1.4);
    setIgniteTargetPos(ready[0].position);
    setForcedCharState('Ignite');
    setTimeout(() => {
      setForcedCharState((curr) => (curr === 'Ignite' ? null : curr));
      setIgniteTargetPos(null);
    }, 1150);

    const ts = performance.now();
    setPlacedCrackers((prev) =>
      prev.map((item) =>
        item.state === 'Placed'
          ? {
              ...item,
              state: 'Igniting',
              ignitedAt: ts,
            }
          : item
      )
    );
  }, [placedCrackers]);

  // State Machine Ticker: transitions Igniting -> Active -> Completed
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const currentTs = performance.now();
      setNowMs(currentTs);

      setPlacedCrackers((prev) => {
        let changed = false;
        const next = prev.map((item) => {
          const cfg = CRACKERS[item.crackerId];

          if (item.state === 'Igniting' && item.ignitedAt) {
            const elapsedSec = (currentTs - item.ignitedAt) / 1000;
            if (elapsedSec >= cfg.ignitionDuration) {
              changed = true;
              // Play active firework sound and record stats
              if (
                item.crackerId === 'phuljhadi' ||
                item.crackerId === 'flower-pot'
              ) {
                audioSystem.playSparkleFountain(cfg.activeDuration);
              } else if (item.crackerId === 'chakri') {
                audioSystem.playChakriSpin(cfg.activeDuration);
              }
              onCrackerIgnited(item.crackerId, settings.environment);

              return {
                ...item,
                state: 'Active' as const,
                activeStartedAt: currentTs,
              };
            }
          } else if (item.state === 'Active' && item.activeStartedAt) {
            const elapsedSec = (currentTs - item.activeStartedAt) / 1000;
            if (elapsedSec >= cfg.activeDuration) {
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
  }, [isPaused, onCrackerIgnited, settings.environment]);

  // Keyboard Controls Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.forward = true;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.backward = true;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = true;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = true;
      if (e.key === 'Shift') inputRef.current.run = true;
      if (key === 'c') inputRef.current.crouch = true;
      if (key === 'g' || e.key === ' ') inputRef.current.celebrate = true;

      // Number keys 1-6 select crackers
      if (['1', '2', '3', '4', '5', '6'].includes(key)) {
        const idx = parseInt(key, 10) - 1;
        if (CRACKER_LIST[idx]) {
          audioSystem.playUIClick();
          onSelectCrackerId(CRACKER_LIST[idx].id);
        }
      }

      // E key ignites nearest or all placed crackers
      if (key === 'e') {
        if (nearestInteractableCracker) {
          handleIgniteCracker(nearestInteractableCracker.instanceId);
        } else {
          handleIgniteAllPlaced();
        }
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
      if (key === 'g' || e.key === ' ') inputRef.current.celebrate = false;
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
    handleIgniteAllPlaced,
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
    setPlacedCrackers([]);
    setHoverPosition(null);
    onSelectCrackerId(null);
    setForcedCharState(null);
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

      {/* 2. Real-Time 3D WebGL Viewport (Transparent Canvas Aligned to Background) */}
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
            forcedState={forcedCharState}
            igniteTargetPosition={igniteTargetPos}
            onPositionChange={handleCharacterPositionChange}
            customGlbUrl={customCharacterGlbUrl}
            onAssetStatusChange={onCharacterAssetStatusChange}
            enableShadows={graphics.enableShadows}
          />

          <PlacedCrackersManager3D
            placedCrackers={placedCrackers}
            nearestInteractableId={nearestInteractableCracker?.instanceId || null}
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
        nearestInteractableCracker={nearestInteractableCracker}
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
        onIgniteAllPlaced={handleIgniteAllPlaced}
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
