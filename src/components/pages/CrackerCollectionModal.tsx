import React from 'react';
import { Check, Flame, ShieldAlert, Sparkles, Timer, X } from 'lucide-react';
import { CRACKER_LIST } from '../../config/crackers';
import { CrackerId } from '../../types/game';
import { CrackerIcon } from '../ui/CrackerIcon';

interface CrackerCollectionModalProps {
  isOpen: boolean;
  selectedCrackerId: CrackerId | null;
  onSelectCracker: (id: CrackerId) => void;
  onClose: () => void;
  ignitionCounts: Record<CrackerId, number>;
}

export const CrackerCollectionModal: React.FC<CrackerCollectionModalProps> = ({
  isOpen,
  selectedCrackerId,
  onSelectCracker,
  onClose,
  ignitionCounts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#131126] via-[#0f0d1e] to-[#090812] text-amber-50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 border-b border-amber-500/20 bg-white/[0.02]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-amber-100">
                Diwali Cracker Collection
              </h2>
              <p className="text-[10px] sm:text-xs text-amber-200/70">
                Select a 3D pyrotechnic cracker to place and ignite in the simulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-amber-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Cracker Collection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cracker Grid */}
        <div className="p-3 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {CRACKER_LIST.map((cracker) => {
            const isSelected = selectedCrackerId === cracker.id;
            const timesUsed = ignitionCounts[cracker.id] || 0;

            return (
              <div
                key={cracker.id}
                className={`group relative flex flex-col justify-between rounded-xl p-5 border transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_25px_rgba(251,191,36,0.16)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40 hover:bg-white/[0.06]'
                }`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border"
                      style={{
                        color: cracker.accentColor,
                        borderColor: `${cracker.accentColor}44`,
                        backgroundColor: `${cracker.accentColor}15`,
                      }}
                    >
                      {cracker.category} • {cracker.badgeText}
                    </span>

                    {timesUsed > 0 && (
                      <span className="text-[11px] text-amber-300/80 font-medium">
                        Lit {timesUsed}×
                      </span>
                    )}
                  </div>

                  {/* Preview Box */}
                  <div className="relative h-28 mb-4 rounded-xl bg-gradient-to-br from-slate-900/90 via-indigo-950/60 to-slate-900/90 border border-white/10 flex items-center justify-center overflow-hidden">
                    <div
                      className="absolute w-24 h-24 rounded-full blur-2xl opacity-30"
                      style={{ backgroundColor: cracker.accentColor }}
                    />
                    <CrackerIcon
                      crackerId={cracker.id}
                      className="w-16 h-16 relative z-10 transform group-hover:scale-110 transition-transform"
                    />
                    {/* Color Swatch Dots */}
                    <div className="absolute bottom-2 right-2.5 flex items-center gap-1">
                      {cracker.effect.primaryColors.slice(0, 4).map((hex, i) => (
                        <span
                          key={i}
                          className="w-2.5 h-2.5 rounded-full border border-black/40"
                          style={{ backgroundColor: hex }}
                          title={`Spark Color ${hex}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-base font-bold text-white flex items-center justify-between">
                    <span>{cracker.name}</span>
                    {isSelected && (
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Equipped
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-amber-300/80 font-medium mb-2">
                    {cracker.hindiName}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {cracker.shortDescription}
                  </p>
                </div>

                <div>
                  {/* Specs Bar */}
                  <div className="grid grid-cols-2 gap-2 py-2.5 px-3 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Show: <strong className="text-white">{cracker.activeDuration}s</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Fuse: <strong className="text-white">{cracker.ignitionDuration}s</strong>
                      </span>
                    </div>
                  </div>

                  {/* Select Action Button */}
                  <button
                    onClick={() => {
                      onSelectCracker(cracker.id);
                      onClose();
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-amber-100'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4" /> Selected for Placement
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" /> Select Cracker
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
