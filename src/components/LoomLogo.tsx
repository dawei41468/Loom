import React from 'react';

interface LoomLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoomLogo: React.FC<LoomLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Main circular background with gradient */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--loom-primary))] to-[hsl(var(--loom-secondary))]"></div>

      {/* Inner weaving pattern */}
      <div className="absolute inset-1 rounded-full bg-[hsl(var(--loom-surface))] flex items-center justify-center">
        {/* Weaving threads */}
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical threads (4), enlarged grid with padding (does not touch edge) */}
          <path
            d="M4.5 3v18M9.5 3v18M14.5 3v18M19.5 3v18"
            stroke="hsl(var(--loom-primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Horizontal weaving threads */}
          <path
            d="M0.5 7H23.5M0.5 12H23.5M0.5 17H23.5"
            stroke="hsl(var(--loom-secondary))"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Connecting nodes at intersections (patterned) */}
          <circle cx="4.5" cy="7" r="1" fill="hsl(var(--loom-accent))" />
          <circle cx="9.5" cy="12" r="1" fill="hsl(var(--loom-accent))" />
          <circle cx="14.5" cy="17" r="1" fill="hsl(var(--loom-accent))" />
          <circle cx="19.5" cy="7" r="1" fill="hsl(var(--loom-accent))" />
        </svg>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--loom-primary))]/20 to-[hsl(var(--loom-secondary))]/20 blur-sm"></div>
    </div>
  );
};

export default LoomLogo;