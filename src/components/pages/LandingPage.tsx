import React, { useState } from 'react';
import {
  BarChart3,
  Cloud,
  CloudFog,
  CloudMoon,
  CloudRain,
  Compass,
  FileBox,
  Flame,
  Gamepad2,
  Layers,
  MapPin,
  MoonStar,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  X,
} from 'lucide-react';
import { CRACKER_LIST } from '../../config/crackers';
import { ENVIRONMENTS, ENVIRONMENT_LIST } from '../../config/environments';
import {
  TIME_OF_DAY_LIST,
  TIME_OF_DAY_PRESETS,
  WEATHER_LIST,
  WEATHER_PRESETS,
} from '../../config/timeAndWeather';
import {
  CrackerId,
  EnvironmentId,
  PlayerStatistics,
  SimulationSettings,
  TimeOfDayId,
  WeatherId,
} from '../../types/game';
import { BackgroundStage } from '../game/BackgroundStage';
import { CrackerIcon } from '../ui/CrackerIcon';

interface LandingPageProps {
  settings: SimulationSettings;
  statistics: PlayerStatistics;
  onUpdateSettings: (partial: Partial<SimulationSettings>) => void;
  onPlayNow: (preselectedCracker?: CrackerId) => void;
  onOpenSetup: () => void;
  onOpenCollection: () => void;
  onOpenDashboard: () => void;
  onOpenAssetManifest: () => void;
}

type FooterModalType = 'about' | 'privacy' | 'safety' | 'contact' | null;

export const LandingPage: React.FC<LandingPageProps> = ({
  settings,
  statistics,
  onUpdateSettings,
  onPlayNow,
  onOpenSetup,
  onOpenCollection,
  onOpenDashboard,
  onOpenAssetManifest,
}) => {
  const [footerModal, setFooterModal] = useState<FooterModalType>(null);

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
    <div className="min-h-screen bg-[#070612] text-[#faf8f5] flex flex-col selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-amber-500/15 bg-[#070612]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-amber-500/20">
              G
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white">
                GuessMe<span className="text-amber-400">.co</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/25 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Diwali 3D Simulation
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a
              href="#environments-preview"
              className="hover:text-amber-300 transition-colors"
            >
              Environments & Weather
            </a>
            <a
              href="#crackers-showcase"
              className="hover:text-amber-300 transition-colors"
            >
              3D Crackers
            </a>
            <a
              href="#how-to-play"
              className="hover:text-amber-300 transition-colors"
            >
              How to Play
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDashboard}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Player Statistics Dashboard"
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">
                Stats ({statistics.totalCrackersIgnited})
              </span>
            </button>

            <button
              onClick={onOpenAssetManifest}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Asset Manifest & GLB Inspector"
            >
              <FileBox className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">Assets</span>
            </button>

            <button
              onClick={() => onPlayNow()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Play Now
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-amber-500/15">
        {/* Fast-loading 2D Cinematic Hero Backdrop */}
        <div className="absolute inset-0 opacity-50">
          <img
            src={ENVIRONMENTS['indian-street'].backgrounds.night}
            alt="Diwali Hero Backdrop"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070612] via-[#070612]/85 to-[#070612]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070612] via-transparent to-[#070612]/60" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Interactive Single-Player 3D Celebration
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
              Light Up the Night with{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                Virtual 3D Diwali Fireworks
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Step into four iconic Indian festive backdrops with a realistic animated 3D character. Place Phuljhadis, Flower Pots, spinning Chakris, Sky Rockets, and 12-Shot Aerial Repeaters—then ignite them across dynamic Day, Sunset, Dusk, Night, and Weather presets.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => onPlayNow()}
                className="px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base flex items-center gap-2.5 shadow-2xl shadow-amber-500/30 transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" /> Play Now
              </button>

              <button
                onClick={onOpenSetup}
                className="px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-amber-400/30 text-amber-100 font-bold text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer"
              >
                <Compass className="w-5 h-5 text-amber-400" /> Explore Environments
              </button>

              <button
                onClick={onOpenCollection}
                className="px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-amber-400" /> Cracker Collection
              </button>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-amber-400 font-extrabold text-lg">4 Scenes</div>
                <div className="text-xs text-slate-400">
                  Street, Park, Enclave & Courtyard
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-amber-400 font-extrabold text-lg">6 Crackers</div>
                <div className="text-xs text-slate-400">
                  Distinct 3D PBR Models & Physics
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-amber-400 font-extrabold text-lg">4×4 Atmos</div>
                <div className="text-xs text-slate-400">
                  Day/Sunset/Dusk/Night × Weather
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-amber-400 font-extrabold text-lg">3D Rig</div>
                <div className="text-xs text-slate-400">
                  Skeletal Character + GLB Swap
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Card: Interactive Quick Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl p-4 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-amber-400/30 shadow-2xl space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] border border-white/10">
                <BackgroundStage
                  environment={activeEnv}
                  timeOfDay={activeTime}
                  weather={activeWeather}
                  weatherEffectsEnabled={settings.weatherEffectsEnabled}
                  isPreview
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-400/30 text-[11px] font-bold text-amber-300">
                  {activeEnv.name} • {activeTime.name} • {activeWeather.name}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex items-end justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      Interactive Atmosphere Preview
                    </div>
                    <div className="text-[11px] text-amber-300/90">
                      Try switching Time or Weather below before launching
                    </div>
                  </div>
                  <button
                    onClick={() => onPlayNow()}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                  >
                    Launch Scene →
                  </button>
                </div>
              </div>

              {/* Mini Quick-Toggles inside Hero Card */}
              <div className="grid grid-cols-4 gap-1.5">
                {TIME_OF_DAY_LIST.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ timeOfDay: t.id })}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      settings.timeOfDay === t.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:border-amber-400/40'
                    }`}
                  >
                    {getTimeIcon(t.id)}
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {WEATHER_LIST.map((w) => (
                  <button
                    key={w.id}
                    onClick={() =>
                      onUpdateSettings({
                        weather: w.id,
                        weatherEffectsEnabled: true,
                      })
                    }
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      settings.weather === w.id && settings.weatherEffectsEnabled
                        ? 'bg-sky-400 text-slate-950 border-sky-300'
                        : 'bg-black/40 text-slate-300 border-white/10 hover:border-sky-400/40'
                    }`}
                  >
                    {getWeatherIcon(w.id)}
                    <span>{w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: EXPLORE THE 4 ENVIRONMENTS & WEATHER */}
      <section
        id="environments-preview"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Perspective-Aligned 2D Backdrops + 3D Stage
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Four Authentic Indian Celebration Environments
            </h2>
          </div>
          <button
            onClick={onOpenSetup}
            className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-amber-400" /> Open Full Setup Studio
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ENVIRONMENT_LIST.map((env) => {
            const isSelected = settings.environment === env.id;
            const imgSrc =
              settings.timeOfDay === 'day' || settings.timeOfDay === 'sunset'
                ? env.backgrounds.day
                : env.backgrounds.night;

            return (
              <div
                key={env.id}
                onClick={() =>
                  onUpdateSettings({ environment: env.id as EnvironmentId })
                }
                className={`group rounded-2xl overflow-hidden border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 shadow-xl shadow-amber-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-amber-400/40'
                }`}
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={env.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070612] via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-amber-300">
                      {env.subtitle}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="text-base font-bold text-white">
                      {env.name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {env.description}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-white/5">
                  <span className="text-[11px] font-semibold text-amber-300">
                    {isSelected ? '✓ Active Selection' : 'Click to Select'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSettings({ environment: env.id as EnvironmentId });
                      onPlayNow();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Play Here
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION: AVAILABLE 3D CRACKERS */}
      <section
        id="crackers-showcase"
        className="border-y border-white/10 bg-gradient-to-b from-[#0b091c] to-[#070612] py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Real-Time 3D Pyrotechnics
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                Interactive 3D Diwali Cracker Arsenal
              </h2>
            </div>
            <button
              onClick={onOpenCollection}
              className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-400" /> View Full Cracker Specs
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CRACKER_LIST.map((cracker) => (
              <div
                key={cracker.id}
                className="rounded-2xl p-5 bg-white/[0.03] border border-white/10 hover:border-amber-400/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center">
                      <CrackerIcon crackerId={cracker.id} className="w-10 h-10" />
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-[11px] font-bold border"
                      style={{
                        color: cracker.accentColor,
                        borderColor: `${cracker.accentColor}44`,
                        backgroundColor: `${cracker.accentColor}15`,
                      }}
                    >
                      {cracker.category} • {cracker.badgeText}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">{cracker.name}</h3>
                  <p className="text-xs text-amber-300/80 font-medium mb-2">
                    {cracker.hindiName}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {cracker.detailedDescription}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {cracker.effect.primaryColors.slice(0, 4).map((hex, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-black/50"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => onPlayNow(cracker.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 font-bold text-xs transition-all cursor-pointer"
                  >
                    Equip & Play →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION: HOW TO PLAY */}
      <section
        id="how-to-play"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-8"
      >
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Simple & Intuitive Controls
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            How to Play GuessMe.co
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Designed for both desktop keyboards/mice and mobile touchscreens with zero login barriers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-base">
              1
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" /> Customize Your Scene
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Select from 4 Indian festive locations, 4 times of day (Day, Sunset, Dusk, Night), and 4 weather presets (Clear, Cloudy, Rain, Mist). You can change time and weather live during gameplay without losing your placed crackers!
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-base">
              2
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-amber-400" /> Move & Place Crackers
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Move your 3D character using <strong>WASD / Arrow keys</strong> (or the mobile touch D-pad) and hold <strong>Shift</strong> to run. Pick any cracker from the bottom dock (keys <strong>1–6</strong>) and click/tap inside the valid ground zone to place it.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-base">
              3
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" /> Ignite & Celebrate
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Walk near a placed cracker and press <strong>E</strong> (or tap the Ignite button) to crouch and light the fuse with your glowing <em>agarbatti</em>. Watch the real-time 3D sparks, fountains, and sky bursts, and hold <strong>G</strong> to celebrate!
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/10 bg-[#05040d] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 font-black text-xs">
              G
            </div>
            <span className="text-sm font-bold text-white">
              GuessMe<span className="text-amber-400">.co</span>
            </span>
            <span className="text-xs text-slate-500">
              • Eco-Friendly Virtual 3D Diwali Fireworks Simulation
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-400">
            <button
              onClick={() => setFooterModal('about')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={() => setFooterModal('privacy')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              onClick={() => setFooterModal('safety')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Safety
            </button>
            <button
              onClick={() => setFooterModal('contact')}
              className="hover:text-amber-300 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>

      {/* FOOTER INFORMATIONAL MODAL */}
      {footerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-[#121024] border border-amber-400/30 p-6 text-amber-50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2 capitalize">
                <ShieldCheck className="w-5 h-5" /> {footerModal} — GuessMe.co
              </h3>
              <button
                onClick={() => setFooterModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {footerModal === 'about' && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                <strong>GuessMe.co</strong> is an interactive single-player 3D virtual Diwali fireworks simulation combining perspective-aligned Indian architectural backdrops with real-time Three.js character animation, 3D cracker placement, and custom buffer-geometry pyrotechnic particle physics.
              </p>
            )}

            {footerModal === 'privacy' && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Your privacy comes first. GuessMe.co runs 100% locally in your browser with no mandatory account sign-up or external tracking. Your preferred environment, graphics settings, and cracker ignition statistics are saved exclusively in your browser&apos;s local storage and can be reset anytime from the Player Dashboard.
              </p>
            )}

            {footerModal === 'safety' && (
              <div className="space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  <strong>Real-World Firework Safety & Visual Comfort:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>
                    For photosensitive players, enable <strong>Reduced Flash Mode</strong> in the Setup Studio to soften light flashes and disable camera shake.
                  </li>
                  <li>
                    In real-world celebrations, always light crackers outdoors in open areas using a long incense stick (<em>agarbatti</em>) at arm&apos;s length, keep water nearby, and never relight dud crackers.
                  </li>
                </ul>
              </div>
            )}

            {footerModal === 'contact' && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Have feedback, custom <code>.glb</code> character rigs to test, or new Diwali cracker ideas? Use the in-app <strong>Asset Manifest & GLB Inspector</strong> to test custom 3D models directly in the simulation or reach the GuessMe.co team at <span className="text-amber-300 font-mono">support@guessme.co</span>.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setFooterModal(null)}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
