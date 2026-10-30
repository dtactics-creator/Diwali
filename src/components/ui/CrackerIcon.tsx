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
  }
};
