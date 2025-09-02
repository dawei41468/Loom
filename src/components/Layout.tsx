// Main Layout with Bottom Navigation
import { Outlet, useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

const Layout = () => {
  const location = useLocation();
  
  // Hide bottom nav on certain pages
  const hideBottomNav = ['/onboarding', '/event'].some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--loom-bg))]">
      {/* Main content area with proper spacing and safe areas */}
      <main className="flex-1 pb-24 safe-area-top">
        <Outlet />
      </main>
      
      {/* Bottom navigation with backdrop */}
      {!hideBottomNav && (
        <>
          {/* Backdrop blur effect */}
          <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(var(--loom-bg))] via-[hsl(var(--loom-bg)/0.8)] to-transparent pointer-events-none z-40" />
          <BottomNavigation />
        </>
      )}
    </div>
  );
};

export default Layout;