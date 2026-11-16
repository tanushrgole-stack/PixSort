import React from 'react';

interface LogoProps {
  /** 'full' includes mark + wordmark 'Pixsort'; 'icon' is just the polaroid smiley mark */
  variant?: 'full' | 'icon';
  /** Size of the mark (height in px, default 36) */
  size?: number;
  className?: string;
  /** Whether wordmark color should adapt to dark mode or force dark/light */
  theme?: 'auto' | 'light' | 'dark';
}

export function LogoIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  // Aspect ratio is 1:1.18 (classic polaroid proportions)
  const width = size;
  const height = size * 1.18;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Pixsort logo"
    >
      {/* Outer Polaroid Frame */}
      <rect
        x="0"
        y="0"
        width="100"
        height="118"
        rx="24"
        fill="#FF6442"
      />

      {/* Inner Photo Window (Polaroid cutout) */}
      <rect
        x="12"
        y="12"
        width="76"
        height="76"
        rx="16"
        fill="#FFFDF8"
      />

      {/* Yellow Smiley Face Circle */}
      <circle
        cx="50"
        cy="50"
        r="27"
        fill="#FFB500"
      />

      {/* Eyes */}
      <circle cx="41.5" cy="45" r="4.2" fill="#2B2118" />
      <circle cx="58.5" cy="45" r="4.2" fill="#2B2118" />

      {/* Smile Arc */}
      <path
        d="M 40 54.5 C 43 62, 57 62, 60 54.5"
        stroke="#2B2118"
        strokeWidth="4.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  variant = 'full',
  size = 36,
  className = '',
  theme = 'auto',
}: LogoProps) {
  const textColor =
    theme === 'dark'
      ? '#FFF1E6'
      : theme === 'light'
      ? '#2B2118'
      : 'var(--text, #2B2118)';

  if (variant === 'icon') {
    return <LogoIcon size={size} className={className} />;
  }

  // Calculate proportional font size based on icon size
  const fontSize = Math.round(size * 0.95);

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <LogoIcon size={size} />
      <span
        style={{
          fontFamily: 'var(--font-heading, "Fraunces", Georgia, serif)',
          fontSize: `${fontSize}px`,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: textColor,
        }}
      >
        Pixsort
      </span>
    </div>
  );
}

export default Logo;
