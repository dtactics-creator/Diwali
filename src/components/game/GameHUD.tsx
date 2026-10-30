import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Cloud,
  CloudFog,
  CloudMoon,
  CloudRain,
  Compass,
  Cpu,
  FileBox,
  Flame,
  HelpCircle,
  Home,
  Layers,
  MoonStar,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import { CRACKERS, CRACKER_LIST } from '../../config/crackers';
import { ENVIRONMENTS, ENVIRONMENT_LIST } from '../../config/environments';
import {
  GRAPHICS_LIST,
  TIME_OF_DAY_LIST,
  WEATHER_LIST,
} from '../../config/timeAndWeather';
import {
  CharacterAnimationState,
  CrackerId,
  EnvironmentId,
  GraphicsQualityId,
  PlacedCrackerInstance,
  SimulationSettings,
  TimeOfDayId,
  WeatherId,
} from '../../types/game';
import { CharacterInputState } from '../3d/PlayerCharacter3D';
import { CrackerIcon } from '../ui/CrackerIcon';

interface GameHUDProps {
  settings: SimulationSettings;
  selectedCrackerForPlacement: CrackerId | null;
  placedCrackers: PlacedCrackerInstance[];
  nearestInteractableCracker: PlacedCrackerInstance | null;
  isValidHover: boolean;
  hasHoverPoint: boolean;
  characterAnimState: CharacterAnimationState;
  activeParticleCount: number;
  isPaused: boolean;
  environmentResetNotice: string | null;
  inputRef: React.MutableRefObject<CharacterInputState>;
  onSelectCrackerForPlacement: (id: CrackerId | null) => void;
  onIgniteCracker: (instanceId: string) => void;
  onIgniteAllPlaced: () => void;
  onUpdateSettings: (partial: Partial<SimulationSettings>) => void;
  onTogglePause: () => void;
  onRestartScene: () => void;
  onOpenCollection: () => void;
  onOpenDashboard: () => void;
  onOpenAssetManifest: () => void;
  onOpenSetupStudio: () => void;
  onBackToLanding: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  settings,
  selectedCrackerForPlacement,
  placedCrackers,
  nearestInteractableCracker,
  isValidHover,
  hasHoverPoint,
  characterAnimState,
  activeParticleCount,
  isPaused,
  environmentResetNotice,
  inputRef,
  onSelectCrackerForPlacement,
  onIgniteCracker,
  onIgniteAllPlaced,
  onUpdateSettings,
  onTogglePause,
  onRestartScene,
  onOpenCollection,
  onOpenDashboard,
  onOpenAssetManifest,
  onOpenSetupStudio,
  onBackToLanding,
}) => {
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [showQuickEnvMenu, setShowQuickEnvMenu] = useState(false);

  const activeEnv = ENVIRONMENTS[settings.environment];
  const placedReadyCrackers = placedCrackers.filter((c) => c.state === 'Placed');
  const activeShowCrackers = placedCrackers.filter(
    (c) => c.state === 'Igniting' || c.state === 'Active'
  );

  const getTimeIcon = (id: TimeOfDayId) => {
    switch (id) {
      case 'day':
        return <Sun className="w-3.5 h-3.5" />;
      case 'sunset':
        return <Sunset className="w-3.5 h-3.5" />;
      case 'dusk':
        return <CloudMoon className="w-3.5 h-3.5" />;
      case 'night':
        return <MoonStar className="w-3.5 h-3.5" />;
    }
  };

  const getWeatherIcon = (id: WeatherId) => {
    switch (id) {
      case 'clear':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'cloudy':
        return <Cloud className="w-3.5 h-3.5" />;
      case 'rain':
        return <CloudRain className="w-3.5 h-3.5" />;
      case 'mist':
        return <CloudFog className="w-3.5 h-3.5" />;
    }
  };

  const setTouchDirection = (dir: 'up' | 'down' | 'left' | 'right', active: boolean) => {
    if (dir === 'up') inputRef.current.forward = active;
    if (dir === 'down') inputRef.current.backward = active;
    if (dir === 'left') inputRef.current.left = active;
    if (dir === 'right') inputRef.current.right = active;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none z-20">
      {/* TOP BAR */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Brand + Location Pill */}
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/75 backdrop-blur-md border border-amber-500/25 rounded-2xl p-1.5 pr-3 shadow-xl">
            <button
              onClick={onBackToLanding}
              title="Back to Landing Page"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pr-2 border-r border-white/10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 font-black text-xs">
                G
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-extrabold text-white leading-none">
                  GuessMe<span className="text-amber-400">.co</span>
                </div>
                <div className="text-[10px] text-amber-300/80 font-medium">
                  3D Diwali Simulator
                </div>
              </div>
            </div>

            {/* Quick Location Switcher Button */}
            <div className="relative">
              <button
                onClick={() => setShowQuickEnvMenu((v) => !v)}
                className="px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-xs font-semibold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[130px] sm:max-w-[180px] truncate">
                  {activeEnv.name}
                </span>
              </button>

              {showQuickEnvMenu && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 p-2 shadow-2xl z-40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70 px-2.5 py-1">
                    Switch Environment (Resets Ground)
                  </div>
                  {ENVIRONMENT_LIST.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => {
                        onUpdateSettings({ environment: env.id as EnvironmentId });
                        setShowQuickEnvMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        settings.environment === env.id
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span>{env.name}</span>
                      {settings.environment === env.id && (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center Quick Time & Weather Switchers (Preserves character & inventory!) */}
          <div className="pointer-events-auto hidden xl:flex items-center gap-2 bg-slate-950/75 backdrop-blur-md border border-white/15 rounded-2xl p-1.5 shadow-xl">
            {/* Time Presets */}
            <div className="flex items-center gap-1 pr-2 border-r border-white/10">
              {TIME_OF_DAY_LIST.map((t) => {
                const active = settings.timeOfDay === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ timeOfDay: t.id })}
                    title={`Time: ${t.name}`}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {getTimeIcon(t.id)}
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Weather Presets */}
            <div className="flex items-center gap-1 pr-2 border-r border-white/10">
              {WEATHER_LIST.map((w) => {
                const active =
                  settings.weatherEffectsEnabled && settings.weather === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() =>
                      onUpdateSettings({
                        weather: w.id,
                        weatherEffectsEnabled: true,
                      })
                    }
                    title={`Weather: ${w.name}`}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-400 text-slate-950 shadow'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {getWeatherIcon(w.id)}
                    <span>{w.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Graphics Quality Preset */}
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-amber-400 ml-1" />
              {GRAPHICS_LIST.map((g) => {
                const active = settings.graphicsQuality === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      onUpdateSettings({
                        graphicsQuality: g.id as GraphicsQualityId,
                      })
                    }
                    title={`Graphics: ${g.name}`}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {g.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Utility Actions */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md border border-white/15 rounded-2xl p-1.5 shadow-xl">
            <button
              onClick={onOpenDashboard}
              title="Player Statistics Dashboard"
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Stats</span>
            </button>

            <button
              onClick={onOpenAssetManifest}
              title="Asset Manifest & Custom GLB Rig Loader"
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileBox className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Rig / Assets</span>
            </button>

            <button
              onClick={() =>
                onUpdateSettings({ soundEnabled: !settings.soundEnabled })
              }
              title={settings.soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
            </button>

            <button
              onClick={() => setShowControlsHelp((v) => !v)}
              title="Controls & How to Play"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                showControlsHelp
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white/5 hover:bg-white/15 text-amber-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenSetupStudio}
              title="Scene & Weather Settings"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onRestartScene}
              title="Clear Placed Crackers & Reset Character"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePause}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation (Esc)'}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compact Status & Prompt Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Character & Particle Telemetry Pill */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-full bg-slate-950/65 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
            <span>
              Character:{' '}
              <strong className="text-amber-300">{characterAnimState}</strong>
            </span>
            <span className="text-white/20">•</span>
            <span>
              Particles:{' '}
              <strong className="text-amber-300 font-mono">
                {activeParticleCount}
              </strong>
            </span>
            <span className="text-white/20">•</span>
            <span>
              Placed:{' '}
              <strong className="text-white">{placedCrackers.length}</strong>
            </span>
          </div>

          {/* Environment Reset Notice Toast */}
          {environmentResetNotice && (
            <div className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium animate-fadeIn">
              {environmentResetNotice}
            </div>
          )}

          {/* Contextual Placement / Ignition Prompt Banner */}
          <div className="pointer-events-auto mx-auto sm:mx-0">
            {selectedCrackerForPlacement ? (
              <div
                className={`px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2.5 shadow-lg ${
                  !hasHoverPoint
                    ? 'bg-slate-950/85 border-amber-400/40 text-amber-100'
                    : isValidHover
                    ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-200'
                    : 'bg-rose-950/85 border-rose-400/50 text-rose-200'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {!hasHoverPoint
                    ? `Placing ${CRACKERS[selectedCrackerForPlacement].name}: Click or tap on the ground`
                    : isValidHover
                    ? `Valid Placement Zone — Click or tap ground to place ${CRACKERS[selectedCrackerForPlacement].name}`
                    : 'Outside Valid Ground Area — Move cursor inside the golden boundary'}
                </span>
                <button
                  onClick={() => onSelectCrackerForPlacement(null)}
                  className="ml-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] text-white flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            ) : nearestInteractableCracker ? (
              <div className="px-4 py-1.5 rounded-full bg-amber-500/95 text-slate-950 font-extrabold text-xs flex items-center gap-3 shadow-xl shadow-amber-500/30 animate-bounce">
                <Flame className="w-4 h-4 fill-current" />
                <span>
                  Ready to Light:{' '}
                  {CRACKERS[nearestInteractableCracker.crackerId].name}
                </span>
                <button
                  onClick={() =>
                    onIgniteCracker(nearestInteractableCracker.instanceId)
                  }
                  className="px-3 py-0.5 rounded-full bg-slate-950 text-amber-300 hover:bg-slate-900 font-bold text-xs cursor-pointer"
                >
                  Press [E] or Click to Ignite!
                </button>
              </div>
            ) : placedReadyCrackers.length > 0 ? (
              <div className="px-4 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-400/40 text-xs text-amber-100 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {placedReadyCrackers.length} cracker
                  {placedReadyCrackers.length > 1 ? 's' : ''} placed on ground —
                  Walk close & press <strong>[E]</strong> or:
                </span>
                <button
                  onClick={onIgniteAllPlaced}
                  className="px-3 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer"
                >
                  Ignite Now ({placedReadyCrackers.length})
                </button>
              </div>
            ) : activeShowCrackers.length > 0 ? (
              <div className="px-4 py-1.5 rounded-full bg-indigo-950/85 backdrop-blur-md border border-amber-400/40 text-xs text-amber-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                <span>
                  Fireworks Active! Hold <strong>[G]</strong> or click Celebrate to cheer!
                </span>
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/10 text-xs text-slate-300 hidden md:flex items-center gap-2">
                <span>
                  Move: <strong className="text-white">WASD / Arrows</strong> •
                  Run: <strong className="text-white">Shift</strong> • Select a
                  cracker below to place & ignite!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTROLS HELP POPOVER */}
      {showControlsHelp && (
        <div className="pointer-events-auto self-end mr-2 max-w-sm rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-amber-400/30 p-4 text-xs text-slate-200 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-amber-300 uppercase tracking-wider">
              Controls & Gameplay Guide
            </span>
            <button
              onClick={() => setShowControlsHelp(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <strong className="text-white block">W, A, S, D / Arrows</strong>
              <span className="text-slate-400">Walk around scene</span>
            </div>
            <div>
              <strong className="text-white block">Hold Shift</strong>
              <span className="text-slate-400">Run / Jog</span>
            </div>
            <div>
              <strong className="text-white block">Keys 1 – 6</strong>
              <span className="text-slate-400">Select cracker type</span>
            </div>
            <div>
              <strong className="text-white block">Click / Tap Ground</strong>
              <span className="text-slate-400">Place selected cracker</span>
            </div>
            <div>
              <strong className="text-white block">Press E / Ignite Btn</strong>
              <span className="text-slate-400">Light nearby cracker</span>
            </div>
            <div>
              <strong className="text-white block">Hold C / Hold G</strong>
              <span className="text-slate-400">Crouch / Celebrate</span>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY MODAL */}
      {isPaused && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#110f24] border border-amber-400/30 p-6 text-center shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
              <Pause className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Simulation Paused
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeEnv.name} • {settings.timeOfDay.toUpperCase()} •{' '}
                {settings.weather.toUpperCase()}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={onTogglePause}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Resume Celebration
              </button>
              <button
                onClick={() => {
                  onTogglePause();
                  onOpenSetupStudio();
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" /> Customize Environment, Time & Weather
              </button>
              <button
                onClick={() => {
                  onRestartScene();
                  onTogglePause();
                }}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Clear Ground & Reset Character
              </button>
              <button
                onClick={onBackToLanding}
                className="w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" /> Return to Landing Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SECTION: Mobile Touch Controls + Cracker Inventory Dock */}
      <div className="flex flex-col gap-3">
        {/* Touch / Quick Action Controls Row */}
        <div className="flex items-end justify-between gap-2">
          {/* Directional D-Pad for Mobile & Touch */}
          <div className="pointer-events-auto grid grid-cols-3 gap-1 w-28 h-28 sm:w-32 sm:h-32 bg-slate-950/65 backdrop-blur-md border border-white/15 rounded-2xl p-1.5 shadow-xl">
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDirection('up', true)}
              onPointerUp={() => setTouchDirection('up', false)}
              onPointerLeave={() => setTouchDirection('up', false)}
              className="rounded-xl bg-white/10 active:bg-amber-400 active:text-slate-950 text-white font-bold text-xs flex items-center justify-center select-none"
              aria-label="Move Forward"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDirection('left', true)}
              onPointerUp={() => setTouchDirection('left', false)}
              onPointerLeave={() => setTouchDirection('left', false)}
              className="rounded-xl bg-white/10 active:bg-amber-400 active:text-slate-950 text-white font-bold text-xs flex items-center justify-center select-none"
              aria-label="Move Left"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => {
                inputRef.current.run = !inputRef.current.run;
              }}
              className={`rounded-xl font-bold text-[10px] flex items-center justify-center select-none ${
                inputRef.current.run
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white/5 text-amber-300'
              }`}
              title="Toggle Sprint"
            >
              RUN
            </button>
            <button
              type="button"
              onPointerDown={() => setTouchDirection('right', true)}
              onPointerUp={() => setTouchDirection('right', false)}
              onPointerLeave={() => setTouchDirection('right', false)}
              className="rounded-xl bg-white/10 active:bg-amber-400 active:text-slate-950 text-white font-bold text-xs flex items-center justify-center select-none"
              aria-label="Move Right"
            >
              ▶
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => setTouchDirection('down', true)}
              onPointerUp={() => setTouchDirection('down', false)}
              onPointerLeave={() => setTouchDirection('down', false)}
              className="rounded-xl bg-white/10 active:bg-amber-400 active:text-slate-950 text-white font-bold text-xs flex items-center justify-center select-none"
              aria-label="Move Backward"
            >
              ▼
            </button>
            <div />
          </div>

          {/* Right-side Action Buttons (Ignite, Celebrate, Crouch) */}
          <div className="pointer-events-auto flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <button
              type="button"
              onPointerDown={() => {
                inputRef.current.celebrate = true;
              }}
              onPointerUp={() => {
                inputRef.current.celebrate = false;
              }}
              onPointerLeave={() => {
                inputRef.current.celebrate = false;
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950/75 hover:bg-white/15 active:bg-amber-400 active:text-slate-950 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-200 flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" /> Celebrate [G]
            </button>

            {(nearestInteractableCracker || placedReadyCrackers.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  if (nearestInteractableCracker) {
                    onIgniteCracker(nearestInteractableCracker.instanceId);
                  } else {
                    onIgniteAllPlaced();
                  }
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-amber-500/30 cursor-pointer"
              >
                <Flame className="w-5 h-5 fill-current" />
                <span>
                  {nearestInteractableCracker
                    ? `Ignite ${CRACKERS[nearestInteractableCracker.crackerId].name} [E]`
                    : `Ignite Placed (${placedReadyCrackers.length}) [E]`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Cracker Inventory Dock */}
        <div className="pointer-events-auto mx-auto w-full max-w-4xl bg-slate-950/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-2 shadow-2xl flex items-center gap-2 overflow-x-auto">
          {CRACKER_LIST.map((cracker, idx) => {
            const isSelected = selectedCrackerForPlacement === cracker.id;
            return (
              <button
                key={cracker.id}
                type="button"
                onClick={() =>
                  onSelectCrackerForPlacement(isSelected ? null : cracker.id)
                }
                className={`group relative flex-1 min-w-[105px] sm:min-w-[120px] p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-amber-400/40'
                }`}
              >
                <span className="absolute top-1.5 right-2 text-[10px] font-mono text-slate-400">
                  {idx + 1}
                </span>
                <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                  <CrackerIcon crackerId={cracker.id} className="w-7 h-7" />
                </div>
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-white truncate">
                    {cracker.name}
                  </div>
                  <div className="text-[10px] text-amber-300/80 truncate">
                    {isSelected ? 'Click Ground' : cracker.category}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Open Full Cracker Collection Button */}
          <button
            type="button"
            onClick={onOpenCollection}
            className="shrink-0 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Full Cracker Collection"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-[10px]">Collection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
