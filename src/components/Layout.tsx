// Main Layout with Bottom Navigation
import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

const Layout = React.memo(() => {
  const location = useLocation();

  // Memoize bottom nav visibility calculation
  const hideBottomNav = useMemo(() =>
    ['/onboarding', '/event'].some(path =>
      location.pathname.startsWith(path)
    ), [location.pathname]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--loom-bg))]">
      {/* Main content area with proper spacing and safe areas */}
      <main className="flex-1 pb-24 safe-area-top">
        <Outlet />
      </main>

      {/* Bottom navigation with backdrop */}
      {!hideBottomNav && (
        <React.Fragment>
          {/* Backdrop blur effect */}
          <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(var(--loom-bg))] via-[hsl(var(--loom-bg)/0.8)] to-transparent pointer-events-none z-40" />
          <BottomNavigation />
        </React.Fragment>
      )}
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;