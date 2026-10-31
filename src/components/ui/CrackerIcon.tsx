import React from 'react';
import { CrackerId } from '../../types/game';

interface CrackerIconProps {
  crackerId: CrackerId;
  className?: string;
}

export const CrackerIcon: React.FC<CrackerIconProps> = ({
  crackerId,
  className = 'w-10 h-10',
}) => {
  switch (crackerId) {
    case 'phuljhadi':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Stem */}
          <line
            x1="14"
            y1="52"
            x2="44"
            y2="22"
            stroke="#a1a1aa"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="22"
            y1="44"
            x2="44"
            y2="22"
            stroke="#71717a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Spark Starburst at tip */}
          <circle cx="44" cy="22" r="5" fill="#fef08a" />
          <path
            d="M44 6V38M28 22H60M33 11L55 33M55 11L33 33"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="44" cy="22" r="2.5" fill="#ffffff" />
        </svg>
      );

    case 'flower-pot':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Fountain sparks */}
          <path
            d="M32 24C26 12 18 10 14 14M32 24C38 12 46 10 50 14M32 24V8"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="12" r="2" fill="#fde047" />
          <circle cx="42" cy="12" r="2" fill="#fde047" />
          <circle cx="32" cy="7" r="2.5" fill="#ffffff" />
          {/* Cone body */}
          <polygon
            points="27,24 37,24 46,52 18,52"
            fill="#dc2626"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <polygon points="23,36 41,36 43,43 21,43" fill="#fbbf24" />
          <rect x="16" y="52" width="32" height="4" rx="2" fill="#d97706" />
        </svg>
      );

    case 'chakri':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Tangential sparks */}
          <path
            d="M46 16L56 22M18 48L8 42M48 46L42 56M16 18L22 8"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="32"
            cy="32"
            r="18"
            fill="#e11d48"
            stroke="#fbbf24"
            strokeWidth="2.5"
          />
          <circle
            cx="32"
            cy="32"
            r="12"
            fill="#10b981"
            stroke="#fde047"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <circle cx="32" cy="32" r="5" fill="#fbbf24" />
        </svg>
      );

    case 'rocket':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Guide stick */}
          <line
            x1="16"
            y1="56"
            x2="44"
            y2="28"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Rocket body */}
          <g transform="translate(38, 24) rotate(45)">
            <polygon points="0,-16 -7,-4 7,-4" fill="#fbbf24" />
            <rect x="-6" y="-4" width="12" height="20" rx="2" fill="#ef4444" />
            <rect x="-6" y="2" width="12" height="5" fill="#fde047" />
          </g>
          {/* Exhaust sparks */}
          <circle cx="24" cy="42" r="3" fill="#fde047" />
          <circle cx="18" cy="48" r="2" fill="#fb923c" />
        </svg>
      );

    case 'aerial-fireworks':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Aerial burst in sky */}
          <circle cx="32" cy="18" r="3" fill="#ffffff" />
          <path
            d="M32 6V30M20 18H44M23 9L41 27M41 9L23 27"
            stroke="#c084fc"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="32" cy="6" r="2" fill="#fde047" />
          <circle cx="44" cy="18" r="2" fill="#38bdf8" />
          <circle cx="20" cy="18" r="2" fill="#f43f5e" />
          {/* Mortar battery */}
          <rect
            x="18"
            y="36"
            width="28"
            height="18"
            rx="3"
            fill="#6b21a8"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <line x1="27" y1="36" x2="27" y2="54" stroke="#fbbf24" strokeWidth="1.5" />
          <line x1="37" y1="36" x2="37" y2="54" stroke="#fbbf24" strokeWidth="1.5" />
        </svg>
      );

    case 'garland-cracker':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Central fuse */}
          <path
            d="M14 48L50 16"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Braided red cylinders */}
          {[0, 1, 2, 3, 4].map((i) => {
            const cx = 20 + i * 6.5;
            const cy = 43 - i * 6.5;
            return (
              <g key={i}>
                <rect
                  x={cx - 8}
                  y={cy - 3}
                  width="12"
                  height="5"
                  rx="1.5"
                  fill="#dc2626"
                  stroke="#fbbf24"
                  strokeWidth="1"
                />
                <rect
                  x={cx - 2}
                  y={cy + 2}
                  width="12"
                  height="5"
                  rx="1.5"
                  fill="#ef4444"
                  stroke="#fbbf24"
                  strokeWidth="1"
                />
              </g>
            );
          })}
          <circle cx="51" cy="15" r="4" fill="#fef08a" />
        </svg>
      );

    case 'bijili':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Sharp crack flash */}
          <path
            d="M32 6L36 22L50 16L40 28L54 34L38 34L42 50L32 38L22 50L26 34L10 34L24 28L14 16L28 22Z"
            fill="#fde047"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
          {/* Crimson paper barrel */}
          <rect x="26" y="36" width="12" height="20" rx="2" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.5" />
          <rect x="26" y="42" width="12" height="4" fill="#f5f5f4" />
          <rect x="24" y="54" width="16" height="4" rx="1.5" fill="#d6d3d1" />
        </svg>
      );

    case 'small-ground':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Low horizontal flash fan */}
          <path
            d="M8 40L22 30L32 20L42 30L56 40"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="30" r="2" fill="#fbbf24" />
          <circle cx="42" cy="30" r="2" fill="#fbbf24" />
          <circle cx="32" cy="20" r="2.5" fill="#ffffff" />
          {/* Squat paper body */}
          <rect x="20" y="42" width="24" height="12" rx="3" fill="#f59e0b" stroke="#fde68a" strokeWidth="1.5" />
          <rect x="20" y="46" width="24" height="3" fill="#fef3c7" />
          <rect x="16" y="54" width="32" height="4" rx="2" fill="#b45309" />
        </svg>
      );

    case 'large-ground':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Big blast starburst */}
          <path
            d="M32 4V22M12 14L26 26M52 14L38 26M8 40H24M56 40H40"
            stroke="#fb923c"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="32" cy="14" r="4" fill="#fef08a" />
          <circle cx="32" cy="14" r="2" fill="#ffffff" />
          {/* Heavy greyboard block */}
          <rect x="18" y="34" width="28" height="20" rx="3" fill="#ea580c" stroke="#fbbf24" strokeWidth="2" />
          <rect x="18" y="34" width="28" height="5" fill="#fbbf24" />
          <rect x="14" y="52" width="36" height="5" rx="2" fill="#7c2d12" />
        </svg>
      );

    case 'paper-bomb':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Flying paper fragments */}
          <rect x="10" y="14" width="7" height="5" rx="1" fill="#fafaf9" transform="rotate(24 13 16)" />
          <rect x="46" y="12" width="8" height="5" rx="1" fill="#e7e5e4" transform="rotate(-18 50 14)" />
          <rect x="44" y="30" width="6" height="4" rx="1" fill="#fca5a5" transform="rotate(40 47 32)" />
          <rect x="12" y="30" width="6" height="4" rx="1" fill="#fbbf24" transform="rotate(-30 15 32)" />
          {/* Rounded paper parcel */}
          <circle cx="32" cy="38" r="13" fill="#fef3c7" stroke="#d6d3d1" strokeWidth="2" />
          {/* Jute twine wraps */}
          <path d="M19 38H45M25 27L39 49M39 27L25 49" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
          {/* Top knot + fuse */}
          <circle cx="32" cy="24" r="3" fill="#d6d3d1" />
          <path d="M32 22C32 18 36 16 35 12" stroke="#4d7c0f" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'lakshmi':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Golden shower */}
          <path
            d="M32 22C26 12 20 10 14 12M32 22C38 12 44 10 50 12M32 22V6"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="14" cy="12" r="2" fill="#4ade80" />
          <circle cx="50" cy="12" r="2" fill="#60a5fa" />
          <circle cx="32" cy="5" r="2.5" fill="#ffffff" />
          {/* Gold-foil collar */}
          <rect x="22" y="22" width="20" height="5" rx="2" fill="#fbbf24" />
          {/* Printed conical body */}
          <polygon points="26,27 38,27 46,52 18,52" fill="#eab308" stroke="#fde68a" strokeWidth="1.5" />
          <polygon points="24,38 40,38 42,45 22,45" fill="#fef3c7" />
          {/* Terracotta base */}
          <rect x="16" y="52" width="32" height="5" rx="2" fill="#b45309" />
        </svg>
      );

    case 'kuruvi':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Hopping arc */}
          <path d="M10 46C18 30 34 26 44 34" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4" />
          {/* Folded paper wings */}
          <path d="M30 34L14 26L30 28Z" fill="#22c55e" stroke="#86efac" strokeWidth="1.5" />
          <path d="M34 34L50 26L34 28Z" fill="#4ade80" stroke="#86efac" strokeWidth="1.5" />
          {/* Spinner hub */}
          <circle cx="32" cy="33" r="6" fill="#fde047" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="32" cy="33" r="2" fill="#ffffff" />
          {/* Whistle sparks */}
          <circle cx="48" cy="22" r="2" fill="#fde047" />
          <circle cx="18" cy="22" r="2" fill="#38bdf8" />
        </svg>
      );

    case 'single-shot':
      return (
        <svg viewBox="0 0 64 64" fill="none" className={className}>
          {/* Shell streaking up */}
          <path d="M34 30C36 20 34 12 32 4" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="4 3" />
          <circle cx="32" cy="6" r="4" fill="#fbbf24" />
          <circle cx="32" cy="6" r="2" fill="#ffffff" />
          {/* Gold-foil mortar tube */}
          <rect x="24" y="32" width="16" height="22" rx="3" fill="#eab308" stroke="#fde68a" strokeWidth="1.5" />
          <rect x="22" y="38" width="20" height="3" rx="1.5" fill="#fef3c7" />
          <rect x="22" y="46" width="20" height="3" rx="1.5" fill="#fef3c7" />
          {/* Braced square base */}
          <polygon points="20,54 44,54 48,60 16,60" fill="#a16207" />
        </svg>
      );
  }
};
