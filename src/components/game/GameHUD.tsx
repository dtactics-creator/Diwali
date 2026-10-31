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
  CrackerInteractionState,
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
  interactionState: CrackerInteractionState;
  isValidHover: boolean;
  hasHoverPoint: boolean;
  characterAnimState: CharacterAnimationState;
  activeParticleCount: number;
  isPaused: boolean;
  environmentResetNotice: string | null;
  inputRef: React.MutableRefObject<CharacterInputState>;
  onSelectCrackerForPlacement: (id: CrackerId | null) => void;
  onIgniteCracker: (instanceId: string) => void;
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
  interactionState,
  isValidHover,
  hasHoverPoint,
  characterAnimState,
  activeParticleCount,
  isPaused,
  environmentResetNotice,
  inputRef,
  onSelectCrackerForPlacement,
  onIgniteCracker,
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
  const [showQuickSceneMenu, setShowQuickSceneMenu] = useState(false);

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
    <div
      className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3.5 select-none z-20"
      style={{
        paddingTop: 'max(0.4rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5">
          {/* Brand + Location Switcher Pill */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-amber-500/25 rounded-2xl p-1 pr-2 sm:pr-3 shadow-xl">
            <button
              onClick={onBackToLanding}
              title="Return to Landing Page"
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="flex items-center gap-1.5 pr-1.5 border-r border-white/10">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-md">
                G
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-black text-white leading-none">
                  GuessMe<span className="text-amber-400">.co</span>
                </div>
                <div className="text-[9px] text-amber-300/80 font-medium">
                  Diwali 3D
                </div>
              </div>
            </div>

            {/* Quick Location Switcher Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowQuickEnvMenu((v) => !v);
                  setShowQuickSceneMenu(false);
                }}
                className="px-2 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-[11px] sm:text-xs font-semibold text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="max-w-[95px] sm:max-w-[150px] truncate">
                  {activeEnv.name}
                </span>
              </button>

              {showQuickEnvMenu && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 p-2 shadow-2xl z-40 max-h-72 overflow-y-auto">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70 px-2.5 py-1">
                    Switch Environment
                  </div>
                  {ENVIRONMENT_LIST.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => {
                        onUpdateSettings({ environment: env.id as EnvironmentId });
                        setShowQuickEnvMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        settings.environment === env.id
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate pr-2">{env.name}</span>
                      {settings.environment === env.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Scene Popover Trigger (visible on smaller landscape screens) */}
            <div className="relative xl:hidden">
              <button
                onClick={() => {
                  setShowQuickSceneMenu((v) => !v);
                  setShowQuickEnvMenu(false);
                }}
                className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] sm:text-xs font-semibold text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Change Time, Weather & Quality"
              >
                {getTimeIcon(settings.timeOfDay)}
                <span className="capitalize">{settings.timeOfDay}</span>
              </button>

              {showQuickSceneMenu && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-amber-500/30 p-3 shadow-2xl z-40 space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70 mb-1.5">
                      Time of Day
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TIME_OF_DAY_LIST.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            onUpdateSettings({ timeOfDay: t.id });
                            setShowQuickSceneMenu(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            settings.timeOfDay === t.id
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {getTimeIcon(t.id)}
                          <span className="capitalize">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70 mb-1.5">
                      Weather Effects
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {WEATHER_LIST.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => {
                            onUpdateSettings({
                              weather: w.id,
                              weatherEffectsEnabled: true,
                            });
                            setShowQuickSceneMenu(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            settings.weather === w.id
                              ? 'bg-sky-400 text-slate-950'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {getWeatherIcon(w.id)}
                          <span className="capitalize">{w.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/70 mb-1.5">
                      Graphics Quality
                    </div>
                    <div className="flex items-center gap-1.5">
                      {GRAPHICS_LIST.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            onUpdateSettings({
                              graphicsQuality: g.id as GraphicsQualityId,
                            });
                            setShowQuickSceneMenu(false);
                          }}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                            settings.graphicsQuality === g.id
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {g.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Time & Weather Switcher Bar */}
          <div className="pointer-events-auto hidden xl:flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-white/15 rounded-2xl p-1 shadow-xl">
            {/* Time Presets */}
            <div className="flex items-center gap-1 pr-2 border-r border-white/10">
              {TIME_OF_DAY_LIST.map((t) => {
                const active = settings.timeOfDay === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ timeOfDay: t.id })}
                    title={`Time: ${t.name}`}
                    className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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
                    className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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

            {/* Graphics Quality */}
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
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
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

            {/* Audio Levels — master / effects / ambient */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              {(
                [
                  { key: 'soundVolume', label: 'M' },
                  { key: 'effectsVolume', label: 'FX' },
                  { key: 'ambientVolume', label: 'Amb' },
                ] as const
              ).map((s) => (
                <div key={s.key} className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-amber-300/80 w-6">{s.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings[s.key]}
                    onChange={(e) =>
                      onUpdateSettings({ [s.key]: parseFloat(e.target.value) })
                    }
                    className="w-16 accent-amber-400 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Utility Buttons */}
          <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-white/15 rounded-2xl p-1 shadow-xl">
            <button
              onClick={onOpenDashboard}
              title="Player Statistics"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden lg:inline text-[11px]">Stats</span>
            </button>

            <button
              onClick={onOpenAssetManifest}
              title="Rig & Assets"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileBox className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden lg:inline text-[11px]">Assets</span>
            </button>

            <button
              onClick={() =>
                onUpdateSettings({ soundEnabled: !settings.soundEnabled })
              }
              title={settings.soundEnabled ? 'Mute' : 'Unmute'}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
              )}
            </button>

            <button
              onClick={() => setShowControlsHelp((v) => !v)}
              title="Controls Help"
              className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer ${
                showControlsHelp
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white/5 hover:bg-white/15 text-amber-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={onOpenSetupStudio}
              title="Settings Studio"
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={onRestartScene}
              title="Clear Ground & Reset"
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={onTogglePause}
              title={isPaused ? 'Resume (Esc)' : 'Pause (Esc)'}
              className={`px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl font-bold text-[11px] sm:text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                isPaused
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Environment Reset Notice Toast */}
        {environmentResetNotice && (
          <div className="pointer-events-auto mx-auto px-3.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium animate-fadeIn">
            {environmentResetNotice}
          </div>
        )}

        {/* ── Status Prompt Toast (Centered, sleek, compact) ───────────────── */}
        <div className="pointer-events-auto mx-auto max-w-xl text-center flex flex-col items-center gap-1">
          {/* Optional Telemetry Sub-row */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-950/60 border border-white/10 text-[10px] text-slate-300">
            <span>Pose: <strong className="text-amber-300">{characterAnimState}</strong></span>
            <span>•</span>
            <span>Particles: <strong className="text-amber-300 font-mono">{activeParticleCount}</strong></span>
            {activeShowCrackers.length > 0 && (
              <>
                <span>•</span>
                <span className="text-orange-400 font-bold">{activeShowCrackers.length} active show</span>
              </>
            )}
          </div>
          {selectedCrackerForPlacement ? (
            <div
              className={`px-3 py-1 rounded-full backdrop-blur-md border text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-2 shadow-lg ${
                !hasHoverPoint
                  ? 'bg-slate-950/85 border-amber-400/40 text-amber-100'
                  : isValidHover
                  ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-200'
                  : 'bg-rose-950/85 border-rose-400/50 text-rose-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {!hasHoverPoint
                  ? `Placing ${CRACKERS[selectedCrackerForPlacement].name}: Tap on ground`
                  : isValidHover
                  ? `Valid Ground — Tap to place ${CRACKERS[selectedCrackerForPlacement].name}`
                  : 'Outside Ground Area — Tap inside golden line'}
              </span>
              <button
                onClick={() => onSelectCrackerForPlacement(null)}
                className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-white flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <XCircle className="w-3 h-3" /> Cancel
              </button>
            </div>
          ) : interactionState === 'approaching' ? (
            <div className="px-3.5 py-1 rounded-full bg-amber-500/90 text-slate-950 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span>Approaching cracker fuse...</span>
            </div>
          ) : interactionState === 'reaching_fuse' || interactionState === 'igniting' ? (
            <div className="px-3.5 py-1 rounded-full bg-orange-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span>Lighting fuse with incense stick...</span>
            </div>
          ) : interactionState === 'retreating' ? (
            <div className="px-3.5 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/40 animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span>Fuse Lit! Automatically retreating to safety...</span>
            </div>
          ) : interactionState === 'safe' ? (
            <div className="px-3.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Safe distance reached! Awaiting fireworks blast...</span>
            </div>
          ) : interactionState === 'celebrating' || interactionState === 'exploding' ? (
            <div className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-slate-950 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/40">
              <Sparkles className="w-3.5 h-3.5 fill-current animate-spin" />
              <span>Happy Diwali! Fireworks in progress — Celebrating!</span>
            </div>
          ) : nearestInteractableCracker ? (
            <div className="px-3.5 py-1 rounded-full bg-amber-500/95 text-slate-950 font-extrabold text-[11px] sm:text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>
                Near {CRACKERS[nearestInteractableCracker.crackerId].name}
              </span>
              <button
                onClick={() =>
                  onIgniteCracker(nearestInteractableCracker.instanceId)
                }
                className="px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-300 hover:bg-slate-900 font-bold text-[11px] cursor-pointer"
              >
                Approach & Light [E]
              </button>
            </div>
          ) : placedReadyCrackers.length > 0 ? (
            <div className="px-3.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/30 text-[11px] text-amber-100 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>
                Walk close to any placed cracker & press <strong>[E]</strong> to light safely!
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── CONTROLS HELP MODAL ────────────────────────────────────────────── */}
      {showControlsHelp && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-2xl bg-slate-950/95 border border-amber-400/30 p-4 text-xs text-slate-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-amber-300 uppercase tracking-wider">
                Controls & Gameplay Guide
              </span>
              <button
                onClick={() => setShowControlsHelp(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <strong className="text-white block">W, A, S, D / D-Pad</strong>
                <span className="text-slate-400">Walk around the 3D scene</span>
              </div>
              <div>
                <strong className="text-white block">Hold Shift / RUN</strong>
                <span className="text-slate-400">Jog / Sprint speed</span>
              </div>
              <div>
                <strong className="text-white block">Tap Cracker Icon</strong>
                <span className="text-slate-400">Select to place on ground</span>
              </div>
              <div>
                <strong className="text-white block">Tap Ground</strong>
                <span className="text-slate-400">Place selected cracker</span>
              </div>
              <div>
                <strong className="text-white block">Press E / Light Btn</strong>
                <span className="text-slate-400">Approach, ignite & retreat</span>
              </div>
              <div>
                <strong className="text-white block">Auto-Celebration</strong>
                <span className="text-slate-400">Runs & celebrates automatically!</span>
              </div>
            </div>
            <button
              onClick={() => setShowControlsHelp(false)}
              className="w-full py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Got it, Let&apos;s Play!
            </button>
          </div>
        </div>
      )}

      {/* ── PAUSE OVERLAY MODAL ────────────────────────────────────────────── */}
      {isPaused && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-[#110f24] border border-amber-400/30 p-5 text-center shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Simulation Paused
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeEnv.name} • {settings.timeOfDay.toUpperCase()} • {settings.weather.toUpperCase()}
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={onTogglePause}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Resume Celebration
              </button>
              <button
                onClick={() => {
                  onTogglePause();
                  onOpenSetupStudio();
                }}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" /> Customize Scene & Weather
              </button>
              <button
                onClick={() => {
                  onRestartScene();
                  onTogglePause();
                }}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Ground & Reset Character
              </button>
              <button
                onClick={onBackToLanding}
                className="w-full py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" /> Return to Landing Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM DOCK: Responsive Landscape Gamepad & Cracker Carousel ─── */}
      <div className="flex items-end justify-between gap-2 w-full">
        {/* Left: Directional D-Pad with touch-action: none */}
        <div
          className="pointer-events-auto grid grid-cols-3 gap-1 w-24 h-24 sm:w-28 sm:h-28 bg-slate-950/75 backdrop-blur-md border border-white/15 rounded-2xl p-1 shadow-2xl shrink-0"
          style={{ touchAction: 'none' }}
        >
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
            className={`rounded-xl font-black text-[9px] sm:text-[10px] flex items-center justify-center select-none ${
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

        {/* Center: Cracker Carousel Dock (Horizontal, touch scrollable) */}
        <div className="pointer-events-auto flex-1 min-w-0 max-w-2xl bg-slate-950/85 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {CRACKER_LIST.map((cracker, idx) => {
            const isSelected = selectedCrackerForPlacement === cracker.id;
            return (
              <button
                key={cracker.id}
                type="button"
                onClick={() =>
                  onSelectCrackerForPlacement(isSelected ? null : cracker.id)
                }
                className={`group relative h-12 sm:h-14 min-w-[86px] sm:min-w-[110px] p-1 sm:p-1.5 rounded-xl border text-left transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/25 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-amber-400/40'
                }`}
              >
                <span className="absolute top-1 right-1.5 text-[9px] font-mono text-slate-400">
                  {idx + 1}
                </span>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                  <CrackerIcon crackerId={cracker.id} className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 pr-1">
                  <div className="text-[10px] sm:text-xs font-bold text-white truncate">
                    {cracker.name}
                  </div>
                  <div className="text-[8px] sm:text-[9px] text-amber-300/80 truncate">
                    {isSelected ? 'Tap Ground' : cracker.category}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Collection Trigger Button */}
          <button
            type="button"
            onClick={onOpenCollection}
            className="h-12 sm:h-14 shrink-0 px-2.5 sm:px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer"
            title="Open Full Cracker Collection"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-[9px] sm:text-[10px]">Collection</span>
          </button>
        </div>

        {/* Right: Primary Context Action Button */}
        <div className="pointer-events-auto shrink-0 flex items-center gap-1.5">
          {(interactionState === 'celebrating' || interactionState === 'exploding') && (
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-md text-[11px] sm:text-xs font-extrabold text-amber-300 flex items-center gap-1.5 shadow-lg animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <span>Celebrating!</span>
            </div>
          )}

          {interactionState === 'idle' && nearestInteractableCracker && (
            <button
              type="button"
              onClick={() =>
                onIgniteCracker(nearestInteractableCracker.instanceId)
              }
              className="px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xl shadow-amber-500/30 cursor-pointer animate-pulse"
            >
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
              <span>
                Light {CRACKERS[nearestInteractableCracker.crackerId].name.split(' ')[0]} [E]
              </span>
            </button>
          )}

          {selectedCrackerForPlacement && (
            <button
              type="button"
              onClick={() => onSelectCrackerForPlacement(null)}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
