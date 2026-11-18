import React from 'react';

export type StampColor = 'purple' | 'emerald' | 'blue' | 'red' | 'gold';

interface StempelWICProps {
  imageUrl?: string;
  institutionName?: string;
  tagline?: string;
  statusText?: string;
  color?: StampColor;
  dateText?: string;
  size?: number; // in pixels, default 96
  rotation?: number; // in degrees, default -8
  opacity?: number; // 0 to 1, default 0.88
  className?: string;
  alt?: string;
}

const COLOR_MAP: Record<StampColor, {
  primary: string;
  border: string;
  badge: string;
  text: string;
  filter: string;
}> = {
  purple: {
    primary: '#6b21a8', // classic Indonesian administrative purple-violet ink
    border: '#7e22ce',
    badge: '#581c87',
    text: '#581c87',
    filter: 'hue-rotate(270deg)'
  },
  emerald: {
    primary: '#047857', // WIC official dark emerald
    border: '#059669',
    badge: '#064e3b',
    text: '#064e3b',
    filter: 'hue-rotate(140deg)'
  },
  blue: {
    primary: '#1d4ed8', // classic office royal blue
    border: '#2563eb',
    badge: '#1e3a8a',
    text: '#1e3a8a',
    filter: 'hue-rotate(210deg)'
  },
  red: {
    primary: '#b91c1c', // bold red "LUNAS / PAID"
    border: '#dc2626',
    badge: '#7f1d1d',
    text: '#991b1b',
    filter: 'hue-rotate(0deg)'
  },
  gold: {
    primary: '#b45309', // formal gold seal
    border: '#d97706',
    badge: '#78350f',
    text: '#78350f',
    filter: 'hue-rotate(40deg)'
  }
};

/**
 * High-fidelity Authentic Stamp / Cap Stempel Resmi WIC
 * If an image is provided and loads successfully, displays the image with realistic ink blend.
 * If image is missing, offline, or fails to load, gracefully renders an ultra-authentic vector
 * double-ring circular administrative seal with curved text, star emblems, and verification text.
 */
export default function StempelWIC({
  imageUrl,
  institutionName = 'WORTH IT COURSE (WIC)',
  tagline = 'LEMBAGA PENDIDIKAN & PELATIHAN',
  statusText = 'LUNAS / SAH',
  color = 'purple',
  dateText,
  size = 100,
  rotation = -8,
  opacity = 0.88,
  className = '',
  alt = 'Stempel Resmi Lembaga WIC'
}: StempelWICProps) {
  const [imageError, setImageError] = React.useState(false);
  const colorScheme = COLOR_MAP[color] || COLOR_MAP.purple;
  const todayFormatted = dateText || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  // Use SVG procedural stamp if no imageUrl or if image load failed
  const showVectorSeal = !imageUrl || imageError || imageUrl.trim() === '';

  return (
    <div 
      className={`relative inline-flex items-center justify-center select-none pointer-events-none transition-all ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${rotation}deg)`,
        opacity: opacity,
        mixBlendMode: 'multiply',
        filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.15))'
      }}
      title={alt}
    >
      {!showVectorSeal ? (
        <img
          src={imageUrl}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain"
          style={{
            filter: 'contrast(1.15) brightness(0.98)'
          }}
        />
      ) : (
        /* High-Definition Procedural Administrative Stamp (Cap Basah Bulat) */
        <svg 
          viewBox="0 0 200 200" 
          width={size} 
          height={size}
          className="overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Upper curved path for institution name */}
            <path
              id={`stamp-upper-arc-${size}`}
              d="M 30,100 A 70,70 0 1,1 170,100"
              fill="none"
            />
            {/* Lower curved path for tagline / location */}
            <path
              id={`stamp-lower-arc-${size}`}
              d="M 170,100 A 70,70 0 0,1 30,100"
              fill="none"
            />
            {/* Subtle ink grunge pattern */}
            <radialGradient id={`ink-grad-${color}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colorScheme.primary} stopOpacity="0.95" />
              <stop offset="85%" stopColor={colorScheme.primary} stopOpacity="0.88" />
              <stop offset="100%" stopColor={colorScheme.badge} stopOpacity="0.98" />
            </radialGradient>
          </defs>

          {/* Outer Serrated / Dotted decorative perimeter */}
          <circle 
            cx="100" 
            cy="100" 
            r="96" 
            fill="none" 
            stroke={colorScheme.primary} 
            strokeWidth="1.5" 
            strokeDasharray="2,3" 
            opacity="0.75"
          />

          {/* Outer Solid Ring */}
          <circle 
            cx="100" 
            cy="100" 
            r="92" 
            fill="none" 
            stroke={colorScheme.primary} 
            strokeWidth="3.5" 
          />

          {/* Second Fine Ring */}
          <circle 
            cx="100" 
            cy="100" 
            r="86" 
            fill="none" 
            stroke={colorScheme.primary} 
            strokeWidth="1.2" 
          />

          {/* Upper Text: INSTITUTION NAME */}
          <text 
            fill={colorScheme.primary} 
            fontSize="11.5" 
            fontFamily="Arial, sans-serif" 
            fontWeight="900" 
            letterSpacing="2.2"
          >
            <textPath 
              href={`#stamp-upper-arc-${size}`} 
              startOffset="50%" 
              textAnchor="middle"
            >
              ★ {institutionName.toUpperCase()} ★
            </textPath>
          </text>

          {/* Lower Text: TAGLINE & JABATAN RESMI */}
          <text 
            fill={colorScheme.primary} 
            fontSize="9" 
            fontFamily="Arial, sans-serif" 
            fontWeight="800" 
            letterSpacing="1.8"
          >
            <textPath 
              href={`#stamp-lower-arc-${size}`} 
              startOffset="50%" 
              textAnchor="middle"
            >
              • {tagline.toUpperCase()} •
            </textPath>
          </text>

          {/* Inner Inner Ring */}
          <circle 
            cx="100" 
            cy="100" 
            r="54" 
            fill="none" 
            stroke={colorScheme.primary} 
            strokeWidth="2" 
            strokeDasharray="4,2" 
          />

          {/* Center Box / Ribbon for STATUS */}
          <rect 
            x="32" 
            y="84" 
            width="136" 
            height="32" 
            rx="4"
            fill="white" 
            stroke={colorScheme.primary} 
            strokeWidth="2.5" 
          />
          <line 
            x1="36" 
            y1="87" 
            x2="164" 
            y2="87" 
            stroke={colorScheme.primary} 
            strokeWidth="0.8" 
          />
          <line 
            x1="36" 
            y1="113" 
            x2="164" 
            y2="113" 
            stroke={colorScheme.primary} 
            strokeWidth="0.8" 
          />

          {/* Center Text: LUNAS / SAH */}
          <text 
            x="100" 
            y="105" 
            textAnchor="middle" 
            fill={colorScheme.primary} 
            fontSize="14" 
            fontFamily="'Impact', 'Arial Black', sans-serif" 
            fontWeight="900" 
            letterSpacing="2"
          >
            {statusText.toUpperCase()}
          </text>

          {/* Top Star Emblem */}
          <path 
            d="M 100,58 L 102.5,64.5 L 109,64.5 L 104,68.5 L 106,75 L 100,71 L 94,75 L 96,68.5 L 91,64.5 L 97.5,64.5 Z" 
            fill={colorScheme.primary} 
          />

          {/* Bottom Verification Date Stamp */}
          <text 
            x="100" 
            y="134" 
            textAnchor="middle" 
            fill={colorScheme.primary} 
            fontSize="8.5" 
            fontFamily="monospace" 
            fontWeight="bold" 
            letterSpacing="1"
          >
            {todayFormatted.toUpperCase()}
          </text>
          <text 
            x="100" 
            y="144" 
            textAnchor="middle" 
            fill={colorScheme.primary} 
            fontSize="7" 
            fontFamily="sans-serif" 
            fontWeight="bold" 
            letterSpacing="0.8"
          >
            MANAGEMENT V2 SAH
          </text>
        </svg>
      )}
    </div>
  );
}
