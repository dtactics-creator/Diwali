import React, { useRef } from 'react';
import {
  CheckCircle2,
  Cpu,
  FileBox,
  FolderOpen,
  Info,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import { INITIAL_ASSET_MANIFEST } from '../../config/assetManifest';

interface AssetManifestModalProps {
  isOpen: boolean;
  customCharacterGlbUrl: string | null;
  customCharacterClipNames: string[];
  onUploadCustomCharacterGlb: (objectUrl: string, fileName: string) => void;
  onResetCharacterGlb: () => void;
  onClose: () => void;
}

export const AssetManifestModal: React.FC<AssetManifestModalProps> = ({
  isOpen,
  customCharacterGlbUrl,
  customCharacterClipNames,
  onUploadCustomCharacterGlb,
  onResetCharacterGlb,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUploadCustomCharacterGlb(url, file.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#131126] via-[#0f0d1e] to-[#090812] text-amber-50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-4 border-b border-amber-500/20 bg-white/[0.02]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <FileBox className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-amber-100">
                Asset Manifest & GLB Rig Inspector
              </h2>
              <p className="text-[10px] sm:text-xs text-amber-200/70">
                Transparent verification of bundled 2D plates, 3D rigs, fallback status & live GLB replacement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg text-amber-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Asset Manifest"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          {/* Live GLB Character Hot-Swap Panel */}
          <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-400/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" /> Replaceable 3D Character Rig (GLTFLoader)
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {customCharacterGlbUrl
                    ? `Custom GLB Model Active! Detected animation clips: ${
                        customCharacterClipNames.length > 0
                          ? customCharacterClipNames.join(', ')
                          : 'Static / Default Clip'
                      }`
                    : 'Currently running the built-in 17-bone articulated 3D skeletal human rig with THREE.AnimationMixer clips (Idle, Walk, Run, Turn, Crouch, Ignite, Celebrate). Upload any rigged .glb character to hot-swap immediately.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" /> Load Custom .GLB
                </button>
                {customCharacterGlbUrl && (
                  <button
                    onClick={onResetCharacterGlb}
                    className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Rig
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Asset Manifest Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300/80 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Canonical Asset Manifest Status
            </h3>

            <div className="space-y-2.5">
              {INITIAL_ASSET_MANIFEST.map((item) => {
                const isCustomChar =
                  item.id === 'char-indian-casual' && customCharacterGlbUrl;
                const effectiveStatus = isCustomChar
                  ? 'custom-loaded'
                  : item.status;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {item.name}
                        </span>
                        <code className="px-2 py-0.5 rounded bg-black/50 text-[11px] text-amber-300 font-mono">
                          {item.canonicalPath}
                        </code>
                      </div>
                      <p className="text-xs text-slate-300">
                        {item.fallbackDescription}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {effectiveStatus === 'bundled' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified & Bundled
                        </span>
                      )}
                      {effectiveStatus === 'custom-loaded' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Custom GLB Active
                        </span>
                      )}
                      {effectiveStatus === 'fallback-active' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Info className="w-3.5 h-3.5" /> Built-in 3D Rig / Synth Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-3.5 border-t border-amber-500/20 bg-black/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
