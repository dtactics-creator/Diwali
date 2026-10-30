import React from 'react';
import {
  Award,
  BarChart3,
  Clock,
  Flame,
  MapPin,
  RotateCcw,
  Settings,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { CRACKERS, CRACKER_LIST } from '../../config/crackers';
import { ENVIRONMENTS } from '../../config/environments';
import {
  PlayerStatistics,
  SimulationSettings,
} from '../../types/game';
import { CrackerIcon } from '../ui/CrackerIcon';

interface PlayerDashboardModalProps {
  isOpen: boolean;
  statistics: PlayerStatistics;
  settings: SimulationSettings;
  sessionIgnitedCount: number;
  onResetStatistics: () => void;
  onClose: () => void;
}

export const PlayerDashboardModal: React.FC<PlayerDashboardModalProps> = ({
  isOpen,
  statistics,
  settings,
  sessionIgnitedCount,
  onResetStatistics,
  onClose,
}) => {
  if (!isOpen) return null;

  const favoriteCracker = statistics.favoriteCracker
    ? CRACKERS[statistics.favoriteCracker]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#131126] via-[#0f0d1e] to-[#090812] text-amber-50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-amber-100">
                Player Celebration Dashboard
              </h2>
              <p className="text-xs text-amber-200/70">
                Local profile statistics & saved preferences (No account required)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-amber-200/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close Dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <Flame className="w-4 h-4" /> Total Crackers Lit
              </div>
              <div className="text-3xl font-extrabold text-white">
                {statistics.totalCrackersIgnited}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                All-time local history
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <Sparkles className="w-4 h-4" /> Current Session
              </div>
              <div className="text-3xl font-extrabold text-white">
                {sessionIgnitedCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Ignited during this visit
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <Award className="w-4 h-4" /> Favorite Cracker
              </div>
              <div className="text-lg font-bold text-white truncate">
                {favoriteCracker ? favoriteCracker.name : 'None Yet'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {favoriteCracker
                  ? `Lit ${statistics.countsByCracker[favoriteCracker.id]} times`
                  : 'Light your first cracker!'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                <MapPin className="w-4 h-4" /> Locations Explored
              </div>
              <div className="text-3xl font-extrabold text-white">
                {statistics.environmentsVisited.length} / 4
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Diwali scenes visited
              </div>
            </div>
          </div>

          {/* Breakdown by Cracker Type */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
            <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-amber-400" /> Ignition Breakdown by Cracker Type
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CRACKER_LIST.map((cracker) => {
                const count = statistics.countsByCracker[cracker.id] || 0;
                const maxVal = Math.max(
                  1,
                  ...Object.values(statistics.countsByCracker)
                );
                const pct = Math.round((count / maxVal) * 100);

                return (
                  <div
                    key={cracker.id}
                    className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <CrackerIcon crackerId={cracker.id} className="w-8 h-8" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                        <span className="truncate">{cracker.name}</span>
                        <span className="text-amber-400">{count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cracker.accentColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recently Used & Saved Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-400" /> Recently Ignited Crackers
              </h3>
              {statistics.recentCrackers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {statistics.recentCrackers.map((cId, idx) => {
                    const c = CRACKERS[cId];
                    if (!c) return null;
                    return (
                      <span
                        key={`${cId}-${idx}`}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/25 text-xs font-medium text-amber-100 flex items-center gap-2"
                      >
                        <CrackerIcon crackerId={cId} className="w-4 h-4" />
                        {c.name}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No crackers ignited yet. Select a cracker from the dock, place it on the ground, and press Ignite!
                </p>
              )}

              {statistics.lastPlayedAt && (
                <p className="text-[11px] text-slate-400 mt-4">
                  Last ignition recorded:{' '}
                  {new Date(statistics.lastPlayedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-amber-400" /> Saved Local Configuration
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Environment</span>
                  <strong className="text-white">
                    {ENVIRONMENTS[settings.environment].name}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Time & Weather</span>
                  <strong className="text-white capitalize">
                    {settings.timeOfDay} • {settings.weather}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Graphics Quality</span>
                  <strong className="text-amber-300">{settings.graphicsQuality}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-black/30 border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Accessibility</span>
                  <strong className="text-white">
                    {settings.reducedFlash ? 'Reduced Flash ON' : 'Standard Glow'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-amber-500/20 bg-black/40">
          <button
            onClick={onResetStatistics}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/15 border border-rose-500/20 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Local Statistics
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
