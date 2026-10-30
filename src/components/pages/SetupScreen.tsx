import React from 'react';
import {
  ArrowLeft,
  Cloud,
  CloudFog,
  CloudMoon,
  CloudRain,
  Cpu,
  EyeOff,
  MapPin,
  MoonStar,
  Play,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ENVIRONMENTS, ENVIRONMENT_LIST } from '../../config/environments';
import {
  GRAPHICS_LIST,
  TIME_OF_DAY_LIST,
  TIME_OF_DAY_PRESETS,
  WEATHER_LIST,
  WEATHER_PRESETS,
} from '../../config/timeAndWeather';
import {
  EnvironmentId,
  GraphicsQualityId,
  SimulationSettings,
  TimeOfDayId,
  WeatherId,
} from '../../types/game';
import { BackgroundStage } from '../game/BackgroundStage';

interface SetupScreenProps {
  settings: SimulationSettings;
  onUpdateSettings: (partial: Partial<SimulationSettings>) => void;
  onStartSimulation: () => void;
  onBackToLanding: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartSimulation,
  onBackToLanding,
}) => {
  const activeEnv = ENVIRONMENTS[settings.environment];
  const activeTime = TIME_OF_DAY_PRESETS[settings.timeOfDay];
  const activeWeather = WEATHER_PRESETS[settings.weather];

  const getTimeIcon = (id: TimeOfDayId) => {
    switch (id) {
      case 'day':
        return <Sun className="w-4 h-4" />;
      case 'sunset':
        return <Sunset className="w-4 h-4" />;
      case 'dusk':
        return <CloudMoon className="w-4 h-4" />;
      case 'night':
        return <MoonStar className="w-4 h-4" />;
    }
  };

  const getWeatherIcon = (id: WeatherId) => {
    switch (id) {
      case 'clear':
        return <Sparkles className="w-4 h-4" />;
      case 'cloudy':
        return <Cloud className="w-4 h-4" />;
      case 'rain':
        return <CloudRain className="w-4 h-4" />;
      case 'mist':
        return <CloudFog className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070612] text-amber-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-[#090818]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLanding}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-amber-100 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 font-black text-sm shadow-md shadow-amber-500/20">
                G
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-white">
                  GuessMe<span className="text-amber-400">.co</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs text-amber-300/70">
                  • Simulation Setup Studio
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onStartSimulation}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" /> Start Simulation
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Configuration Preview (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="sticky top-24 space-y-5">
            <div className="relative rounded-2xl overflow-hidden border border-amber-400/30 shadow-2xl aspect-[16/10] bg-slate-950">
              <BackgroundStage
                environment={activeEnv}
                timeOfDay={activeTime}
                weather={activeWeather}
                weatherEffectsEnabled={settings.weatherEffectsEnabled}
                isPreview
              />

              {/* Live Preview Overlay Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/30 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Scene Preview
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white">
                  {settings.graphicsQuality} Quality
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  {activeEnv.subtitle}
                </div>
                <h2 className="text-xl font-extrabold text-white mt-0.5">
                  {activeEnv.name}
                </h2>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {activeEnv.description}
                </p>
              </div>
            </div>

            {/* Active Configuration Summary Box */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Selected Scene Configuration
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Location</span>
                  <strong className="text-white font-semibold">
                    {activeEnv.name}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Time Preset</span>
                  <strong className="text-amber-300 font-semibold capitalize">
                    {activeTime.name}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Weather Condition</span>
                  <strong className="text-white font-semibold capitalize">
                    {settings.weatherEffectsEnabled
                      ? activeWeather.name
                      : 'Disabled (Clear)'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Audio & Flash</span>
                  <strong className="text-white font-semibold">
                    {settings.soundEnabled
                      ? `${Math.round(settings.soundVolume * 100)}% Vol`
                      : 'Muted'}{' '}
                    • {settings.reducedFlash ? 'Low Flash' : 'Full Glow'}
                  </strong>
                </div>
              </div>

              <ul className="space-y-1.5 pt-1">
                {activeEnv.features.map((feat, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={onStartSimulation}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Enter 3D Simulation Now
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Customization Controls (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-7">
          {/* 1. Environment Selection */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" /> 1. Choose Celebration Environment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each location has calibrated 3D ground bounds, camera perspective, and festive lighting
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {ENVIRONMENT_LIST.map((env) => {
                const isSelected = settings.environment === env.id;
                const previewSrc =
                  settings.timeOfDay === 'day' || settings.timeOfDay === 'sunset'
                    ? env.backgrounds.day
                    : env.backgrounds.night;

                return (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ environment: env.id as EnvironmentId })
                    }
                    className={`group text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/30'
                        : 'border-white/10 bg-black/30 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={previewSrc}
                        alt={env.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      {isSelected && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] uppercase">
                          Selected
                        </span>
                      )}
                      <div className="absolute bottom-2 left-3 right-3">
                        <div className="text-xs font-bold text-white">
                          {env.name}
                        </div>
                        <div className="text-[11px] text-amber-300/90">
                          {env.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-[11px] text-slate-300 line-clamp-2">
                        {env.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Time of Day Selection */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-amber-400" /> 2. Time of Day
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Updates dedicated Day/Night architectural plates, 3D sun direction, and diya illumination
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TIME_OF_DAY_LIST.map((t) => {
                const isSelected = settings.timeOfDay === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateSettings({ timeOfDay: t.id })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 text-white shadow-lg shadow-amber-500/10'
                        : 'border-white/10 bg-black/30 text-slate-300 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-white/5 text-amber-400'
                        }`}
                      >
                        {getTimeIcon(t.id)}
                      </span>
                    </div>
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {t.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Weather Selection */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-amber-400" /> 3. Weather Condition
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Combine any weather with any environment and time preset
                </p>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-amber-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.weatherEffectsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ weatherEffectsEnabled: e.target.checked })
                  }
                  className="rounded border-amber-400/40 bg-black/40 text-amber-400 focus:ring-amber-400"
                />
                Enable Weather Visuals
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {WEATHER_LIST.map((w) => {
                const isSelected = settings.weather === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        weather: w.id,
                        weatherEffectsEnabled: true,
                      })
                    }
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected && settings.weatherEffectsEnabled
                        ? 'border-amber-400 bg-amber-500/15 text-white shadow-lg shadow-amber-500/10'
                        : 'border-white/10 bg-black/30 text-slate-300 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`p-2 rounded-lg ${
                          isSelected && settings.weatherEffectsEnabled
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-white/5 text-amber-400'
                        }`}
                      >
                        {getWeatherIcon(w.id)}
                      </span>
                    </div>
                    <div className="font-bold text-sm">{w.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {w.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Graphics, Audio & Accessibility */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-amber-400" /> 4. Graphics Quality, Sound & Comfort
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Scale particle counts, dynamic firework lights, and flash intensity for your device
              </p>

              <div className="grid grid-cols-3 gap-3">
                {GRAPHICS_LIST.map((g) => {
                  const isSelected = settings.graphicsQuality === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          graphicsQuality: g.id as GraphicsQualityId,
                        })
                      }
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 text-white'
                          : 'border-white/10 bg-black/30 text-slate-300 hover:border-amber-400/40'
                      }`}
                    >
                      <div className="font-bold text-sm text-amber-300">
                        {g.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {g.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              {/* Audio Controls */}
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-2">
                    {settings.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-amber-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    Simulation Sound Effects
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ soundEnabled: !settings.soundEnabled })
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                      settings.soundEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {settings.soundEnabled ? 'Enabled' : 'Muted'}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.soundVolume}
                    onChange={(e) =>
                      onUpdateSettings({
                        soundVolume: parseFloat(e.target.value),
                        soundEnabled: true,
                      })
                    }
                    className="flex-1 accent-amber-400"
                  />
                  <span className="text-xs font-mono text-amber-300 w-9 text-right">
                    {Math.round(settings.soundVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* Reduced Flash Option */}
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-400" /> Reduced Flash Mode
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Softens intense light bursts and disables explosion camera shake
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ reducedFlash: !settings.reducedFlash })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                    settings.reducedFlash
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {settings.reducedFlash ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
