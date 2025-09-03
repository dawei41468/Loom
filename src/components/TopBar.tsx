import React from 'react';
import { NavLink } from 'react-router-dom';
import LoomLogo from './LoomLogo';
import UserProfileMenu from './UserProfileMenu';

const TopBar = React.memo(() => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] safe-area-top">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        {/* Loom Header */}
        <div className="mr-4 flex">
          <NavLink to="/" className="mr-6 flex items-center space-x-2">
            <LoomLogo size="sm" />
            <span className="font-bold loom-heading-3 text-[hsl(var(--loom-text))]">
              Loom
            </span>
          </NavLink>
        </div>

        {/* Spacer */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Future: Search or other topbar items */}
          </div>

          {/* User Profile Menu */}
          <nav className="flex items-center">
            <UserProfileMenu />
          </nav>
        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;