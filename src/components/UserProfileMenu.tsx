import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, User, LogOut, Globe, Sun, Moon } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '@/contexts/AuthContext';
import { useUIState, useUIActions } from '@/contexts/UIContext';
import { useTranslation } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const UserProfileMenu = React.memo(() => {
  const { user } = useAuthState();
  const dispatch = useAuthDispatch();
  const { theme, language } = useUIState();
  const { setTheme, setLanguage } = useUIActions();
  const { t } = useTranslation();

  if (!user) return null;

  const initials = user.display_name
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Resolve 'user' | 'partner' | '#RRGGBB' to a CSS color
  const resolveColor = (token?: string): string => {
    if (!token || token === 'user') return 'hsl(var(--loom-user))';
    if (token === 'partner') return 'hsl(var(--loom-partner))';
    return token; // assume hex
  };
  const selfColor = resolveColor(user.ui_self_color);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-8 w-8 min-h-8 min-w-8 rounded-full items-center justify-center shrink-0 overflow-hidden focus:outline-none focus:ring-0 border"
          style={{ borderColor: selfColor }}
        >
          <User className="h-5 w-5" strokeWidth={2.5} style={{ color: selfColor }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selfColor }}></div>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-[hsl(var(--loom-text))]">
                {user.display_name}
              </p>
              <p className="text-xs leading-none text-[hsl(var(--loom-text-muted))]">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[hsl(var(--loom-border))]" />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === 'light' ? <Sun className="mr-2 h-4 w-4 text-[hsl(var(--loom-text))]" /> : <Moon className="mr-2 h-4 w-4 text-[hsl(var(--loom-text))]" />}
            <span className="text-[hsl(var(--loom-text))]">{t('theme')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]">
            <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
              <span className="text-[hsl(var(--loom-text))]">{t('light')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
              <span className="text-[hsl(var(--loom-text))]">{t('dark')}</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4 text-[hsl(var(--loom-text))]" />
            <span className="text-[hsl(var(--loom-text))]">{t('language')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]">
            <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
              <span className="text-[hsl(var(--loom-text))]">{t('english')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('zh')} className={language === 'zh' ? 'bg-[hsl(var(--loom-accent))]' : ''}>
              <span className="text-[hsl(var(--loom-text))]">{t('chinese')}</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <NavLink
            to="/settings"
            className="flex items-center cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4 text-[hsl(var(--loom-text))]" />
            <span className="text-[hsl(var(--loom-text))]">{t('settings')}</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[hsl(var(--loom-border))]" />
        <DropdownMenuItem onClick={() => dispatch({ type: 'LOGOUT' })}>
          <LogOut className="mr-2 h-4 w-4 text-[hsl(var(--loom-danger))]" />
          <span className="text-[hsl(var(--loom-danger))]">{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserProfileMenu.displayName = 'UserProfileMenu';

export default UserProfileMenu;