import React, { useEffect, useRef, useState } from 'react';
import {
  EnvironmentConfig,
  RocketTrackData,
  TimeOfDayConfig,
  WeatherConfig,
} from '../../types/game';

interface BackgroundStageProps {
  environment: EnvironmentConfig;
  timeOfDay: TimeOfDayConfig;
  weather: WeatherConfig;
  weatherEffectsEnabled: boolean;
  isPreview?: boolean;
  /** Shared ref written by FireworksSystem3D; drives background pan when rockets fire */
  rocketTrackRef?: React.MutableRefObject<RocketTrackData>;
}

export const BackgroundStage: React.FC<BackgroundStageProps> = ({
  environment,
  timeOfDay,
  weather,
  weatherEffectsEnabled,
  isPreview = false,
  rocketTrackRef,
}) => {
  const [dayImgError, setDayImgError]   = useState(false);
  const [nightImgError, setNightImgError] = useState(false);

  const dayImgRef   = useRef<HTMLImageElement>(null);
  const nightImgRef = useRef<HTMLImageElement>(null);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const track = rocketTrackRef?.current;
      // Slaved directly to 3D camera tilt progress: 0 = street floor (baseY), 1 = pure high sky (skyY)
      const tilt = track?.cameraTiltProgress ?? 0;
      const baseY = environment.backgroundBaseY ?? 60;
      const skyY = environment.backgroundSkyY ?? 8;
      const posY = (baseY - tilt * (baseY - skyY)).toFixed(2);
      const posStr = `center ${posY}%`;

      if (dayImgRef.current)   dayImgRef.current.style.objectPosition   = posStr;
      if (nightImgRef.current) nightImgRef.current.style.objectPosition = posStr;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [rocketTrackRef, environment.backgroundBaseY, environment.backgroundSkyY]);

  const showCloudLayer =
    weatherEffectsEnabled && (weather.id === 'cloudy' || weather.id === 'rain');
  const showMistLayer =
    weatherEffectsEnabled && (weather.id === 'mist' || weather.id === 'rain');
  const showRainOverlay = weatherEffectsEnabled && weather.id === 'rain';

  return (
    <div
      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
      style={{
        filter: weatherEffectsEnabled
          ? `${timeOfDay.filterCss} ${
              weather.backdropFilterCss !== 'none' ? weather.backdropFilterCss : ''
            }`
          : timeOfDay.filterCss,
        transition: 'filter 600ms ease',
      }}
    >
      {/* 1. Base Daylight Plate */}
      {!dayImgError ? (
        <img
          ref={dayImgRef}
          src={environment.backgrounds.day}
          alt={`${environment.name} Daylight`}
          onError={() => setDayImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{
            objectPosition: environment.backgroundPosition || 'center 60%',
            opacity: 1,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-amber-100 to-stone-700 flex items-center justify-center">
          <span className="px-3 py-1.5 rounded bg-black/70 text-amber-300 text-xs font-mono">
            Missing Daylight Asset: {environment.publicPaths.day}
          </span>
        </div>
      )}

      {/* 2. Dedicated Festive Night Plate (Cross-fades smoothly for Sunset / Dusk / Night) */}
      {!nightImgError ? (
        <img
          ref={nightImgRef}
          src={environment.backgrounds.night}
          alt={`${environment.name} Night`}
          onError={() => setNightImgError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{
            objectPosition: environment.backgroundPosition || 'center 60%',
            opacity: timeOfDay.nightPlateOpacity,
          }}
        />
      ) : (
        timeOfDay.nightPlateOpacity > 0 && (
          <div
            className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950 to-stone-900 flex items-center justify-center"
            style={{ opacity: timeOfDay.nightPlateOpacity }}
          >
            <span className="px-3 py-1.5 rounded bg-black/70 text-amber-300 text-xs font-mono">
              Missing Night Asset: {environment.publicPaths.night}
            </span>
          </div>
        )
      )}

      {/* 3. Sunset Golden-Hour Sky & Horizon Shader Gradient */}
      {timeOfDay.id === 'sunset' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background:
              'linear-gradient(180deg, rgba(136, 19, 55, 0.38) 0%, rgba(249, 115, 22, 0.44) 34%, rgba(251, 191, 36, 0.24) 58%, rgba(30, 20, 35, 0.22) 100%)',
            mixBlendMode: 'soft-light',
          }}
        />
      )}

      {/* 4. Dusk Blue-Purple Twilight Atmospheric Gradient */}
      {timeOfDay.id === 'dusk' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background:
              'linear-gradient(180deg, rgba(30, 27, 75, 0.48) 0%, rgba(76, 29, 149, 0.36) 38%, rgba(234, 88, 12, 0.16) 62%, rgba(15, 23, 42, 0.28) 100%)',
          }}
        />
      )}

      {/* 5. Weather: Cloudy Sky Overcast Layer */}
      {showCloudLayer && (
        <div
          className="absolute inset-x-0 top-0 h-3/5 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: weather.cloudOpacity,
            background:
              timeOfDay.id === 'day'
                ? 'radial-gradient(ellipse at 30% 15%, rgba(148, 163, 184, 0.65) 0%, transparent 65%), radial-gradient(ellipse at 75% 20%, rgba(100, 116, 139, 0.55) 0%, transparent 65%), linear-gradient(180deg, rgba(100, 116, 139, 0.45) 0%, transparent 100%)'
                : 'radial-gradient(ellipse at 30% 15%, rgba(51, 65, 85, 0.65) 0%, transparent 65%), radial-gradient(ellipse at 75% 20%, rgba(30, 41, 59, 0.65) 0%, transparent 65%), linear-gradient(180deg, rgba(15, 23, 42, 0.52) 0%, transparent 100%)',
          }}
        />
      )}

      {/* 6. Weather: Atmospheric Mist / Winter Diwali Haze */}
      {showMistLayer && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            opacity: weather.id === 'mist' ? 0.85 : 0.35,
            background:
              timeOfDay.id === 'day'
                ? 'linear-gradient(180deg, rgba(226, 232, 240, 0.42) 0%, rgba(241, 245, 249, 0.55) 48%, rgba(203, 213, 225, 0.18) 78%, transparent 100%)'
                : 'linear-gradient(180deg, rgba(30, 41, 59, 0.32) 0%, rgba(71, 85, 105, 0.42) 48%, rgba(30, 27, 75, 0.18) 80%, transparent 100%)',
          }}
        />
      )}

      {/* 7. Weather: 2D Screen-Space Rain Streaks & Wet Ground Sheen */}
      {showRainOverlay && (
        <>
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              backgroundImage:
                'repeating-linear-gradient(102deg, transparent 0px, transparent 18px, rgba(203, 213, 225, 0.26) 19px, transparent 20px)',
              backgroundSize: '120px 120px',
            }}
          />
          {/* Wet Ground Specular Reflection Glow along bottom 38% */}
          <div
            className="absolute inset-x-0 bottom-0 h-[38%] pointer-events-none"
            style={{
              background:
                timeOfDay.id === 'day'
                  ? 'linear-gradient(180deg, transparent 0%, rgba(186, 230, 253, 0.14) 50%, rgba(56, 189, 248, 0.12) 100%)'
                  : 'linear-gradient(180deg, transparent 0%, rgba(251, 191, 36, 0.12) 45%, rgba(249, 115, 22, 0.18) 100%)',
            }}
          />
        </>
      )}

      {/* 8. Subtle Vignette for HUD Readability */}
      {!isPreview && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, transparent 58%, rgba(6, 7, 18, 0.48) 100%)',
          }}
        />
      )}
    </div>
  );
};
