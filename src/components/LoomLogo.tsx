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
          className="w-6 h-6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vertical threads */}
          <path
            d="M6 4v16M10 4v16M14 4v16M18 4v16"
            stroke="hsl(var(--loom-primary))"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Horizontal weaving threads */}
          <path
            d="M4 8h16M4 12h16M4 16h16"
            stroke="hsl(var(--loom-secondary))"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Connecting nodes */}
          <circle cx="6" cy="8" r="1" fill="hsl(var(--loom-accent))" />
          <circle cx="10" cy="12" r="1" fill="hsl(var(--loom-accent))" />
          <circle cx="14" cy="16" r="1" fill="hsl(var(--loom-accent))" />
          <circle cx="18" cy="8" r="1" fill="hsl(var(--loom-accent))" />
        </svg>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--loom-primary))]/20 to-[hsl(var(--loom-secondary))]/20 blur-sm"></div>
    </div>
  );
};

export default LoomLogo;