// iOS-style Bottom Navigation
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  CalendarDays, 
  Calendar, 
  Plus, 
  CheckSquare, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    to: '/',
    icon: CalendarDays,
    label: 'Today',
    exact: true,
  },
  {
    to: '/calendar',
    icon: Calendar,
    label: 'Calendar',
  },
  {
    to: '/add',
    icon: Plus,
    label: 'Add',
  },
  {
    to: '/tasks',
    icon: CheckSquare,
    label: 'Tasks',
  },
  {
    to: '/settings',
    icon: Settings,
    label: 'Settings',
  },
];

const BottomNavigation = () => {
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === to;
    }
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--loom-surface))] border-t border-[hsl(var(--loom-border))] safe-area-bottom">
      <div className="flex items-center justify-around px-1 sm:px-2 py-1 sm:py-2">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact);

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'mobile-nav-item flex flex-col items-center justify-center min-w-0 flex-1 py-1.5 sm:py-2 px-1 rounded-lg transition-all duration-200',
                active
                  ? 'text-[hsl(var(--loom-primary))]'
                  : 'text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]'
              )}
            >
              <Icon
                className="mobile-nav-icon w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1"
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  'mobile-nav-label text-[10px] sm:text-xs font-medium truncate',
                  active ? 'font-semibold' : 'font-normal'
                )}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;