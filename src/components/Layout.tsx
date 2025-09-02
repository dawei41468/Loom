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
    <div className="min-h-screen flex flex-col">
      {/* Main content area */}
      <main className="flex-1 pb-20 safe-area-top">
        <Outlet />
      </main>
      
      {/* Bottom navigation */}
      {!hideBottomNav && <BottomNavigation />}
    </div>
  );
};

export default Layout;