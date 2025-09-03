// Loading Screen Component
import React from 'react';
import LoomLogo from './LoomLogo';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--loom-bg))]">
      <div className="text-center">
        <div className="mb-4">
          <LoomLogo size="lg" />
        </div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--loom-primary))] mb-2">
          Loom
        </h1>
        <p className="text-[hsl(var(--loom-text-muted))] text-sm">
          weave your days together
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;