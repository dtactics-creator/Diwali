import React, { useEffect, useState } from 'react';
import { Maximize2, RotateCw, Sparkles } from 'lucide-react';

export const RotateDeviceOverlay: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      Math.max(window.innerWidth, window.innerHeight) <= 1024
    );
  });

  useEffect(() => {
    const handleOrientationCheck = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      setIsTouchDevice(
        window.matchMedia('(pointer: coarse)').matches ||
          Math.max(window.innerWidth, window.innerHeight) <= 1024
      );

      // If switched to landscape, attempt silent orientation lock
      if (!portrait) {
        tryLockLandscape();
      }
    };

    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);

    // Initial attempt on mount
    tryLockLandscape();

    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
    };
  }, []);

  const tryLockLandscape = async () => {
    try {
      const orientationApi = screen.orientation as any;
      if (orientationApi && typeof orientationApi.lock === 'function') {
        await orientationApi.lock('landscape');
      } else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation('landscape');
      } else if ((screen as any).mozLockOrientation) {
        (screen as any).mozLockOrientation('landscape');
      } else if ((screen as any).msLockOrientation) {
        (screen as any).msLockOrientation('landscape');
      }
    } catch {
      // Browser doesn't support programmatic locking without user-gesture/fullscreen,
      // which is why the visual rotation overlay fallback is displayed.
    }
  };

  const handleRequestFullscreenAndLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      await tryLockLandscape();
    } catch {
      // Fallback: user physically rotates phone
    }
  };

  // Only display overlay if currently in portrait orientation on a touch/mobile device
  if (!isPortrait || !isTouchDevice) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl text-center select-none"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* Decorative Diwali Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card Container */}
      <div className="relative w-full max-w-sm rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#18132d] via-[#110f22] to-[#090814] p-7 shadow-2xl flex flex-col items-center gap-6">
        {/* Animated Phone Rotation Graphic */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Pulsing Outer Ring */}
          <div className="absolute inset-0 rounded-full border border-amber-400/20 animate-ping opacity-35" />
          <div className="absolute inset-2 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center" />

          {/* Rotating Phone SVG */}
          <svg
            className="w-16 h-16 text-amber-400 animate-phoneRotate drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Phone Body */}
            <rect
              x="12"
              y="6"
              width="24"
              height="36"
              rx="4"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            {/* Screen */}
            <rect
              x="15"
              y="11"
              width="18"
              height="26"
              rx="1.5"
              fill="currentColor"
              fillOpacity="0.18"
            />
            {/* Home / Speaker Indicator */}
            <line
              x1="20"
              y1="9"
              x2="28"
              y2="9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="24" cy="39" r="1.5" fill="currentColor" />
          </svg>

          {/* Rotation Arrow Badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-bold">
            <RotateCw className="w-4 h-4 animate-spin" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Landscape Mode</span>
          </div>

          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Please Rotate Your Device
          </h2>

          <p className="text-xs leading-relaxed text-amber-100/80">
            GuessMe<span className="text-amber-400 font-bold">.co</span> 3D
            Diwali Simulator is optimized for horizontal landscape viewing. Turn
            your phone sideways to enter the courtyard!
          </p>
        </div>

        {/* Action Button: Fullscreen + Landscape Lock */}
        <div className="w-full space-y-2">
          <button
            type="button"
            onClick={handleRequestFullscreenAndLandscape}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Enter Landscape & Fullscreen</span>
          </button>

          <p className="text-[10px] text-slate-400">
            Your placed crackers & simulation state will remain intact.
          </p>
        </div>
      </div>
    </div>
  );
};
