// iOS-style Bottom Navigation
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
    <nav className="bottom-nav">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact);
          
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors duration-200 tap-scale',
                active 
                  ? 'text-[hsl(var(--loom-primary))]' 
                  : 'text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]'
              )}
            >
              <Icon 
                className={cn(
                  'w-6 h-6 mb-1',
                  active && 'fill-current'
                )} 
              />
              <span 
                className={cn(
                  'text-xs font-medium truncate',
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