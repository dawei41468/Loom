import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, User, LogOut, Globe, Sun, Moon } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '@/contexts/AuthContext';
import { useUIState, useUIActions } from '@/contexts/UIContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import LoomLogo from './LoomLogo';

const TopBar = React.memo(() => {
  const { user } = useAuthState();
  const dispatch = useAuthDispatch();
  const { theme, language } = useUIState();
  const { setTheme, setLanguage } = useUIActions();

  if (!user) return null;

  const initials = user.display_name
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 aspect-square">
                  <User className="h-5 w-5 text-[hsl(var(--loom-primary))]" strokeWidth={2.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-primary))]"></div>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.display_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[hsl(var(--loom-border))]" />
                <DropdownMenuItem asChild>
                  <NavLink
                    to="/settings"
                    className="flex items-center cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Globe className="mr-2 h-4 w-4" />
                    <span>Language</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]">
                    <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
                      English
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('zh')} className={language === 'zh' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
                      中文
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {theme === 'light' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]">
                    <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
                      Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
                      System
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator className="bg-[hsl(var(--loom-border))]" />
                <DropdownMenuItem onClick={() => dispatch({ type: 'LOGOUT' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;