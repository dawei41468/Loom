import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings, User, LogOut, Globe, Sun, Moon, ChevronDown } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, userQueries } from '@/api/queries';
import { useUIState, useUIActions } from '@/contexts/UIContext';
import { useTranslation } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const UserProfileMenu = React.memo(() => {
  const { user } = useAuthState();
  const { data: meData } = useQuery({ queryKey: queryKeys.user, queryFn: userQueries.getMe, staleTime: 30000 });
  const meUser = meData?.data || user;
  const dispatch = useAuthDispatch();
  // Always call hooks in same order - React requirement
  const uiState = useUIState();
  const uiActions = useUIActions();

  // Provide fallbacks in case context is not available
  const theme = uiState?.theme || 'light';
  const language = uiState?.language || 'en';
  const setTheme = uiActions?.setTheme || (() => {});
  const setLanguage = uiActions?.setLanguage || (() => {});
  const { t } = useTranslation();
  const [isThemeOpen, setIsThemeOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);

  if (!meUser) return null;

  const initials = meUser.display_name
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
  const selfColor = resolveColor(meUser.ui_self_color);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 min-h-10 min-w-10 rounded-full items-center justify-center shrink-0 overflow-hidden focus:outline-none focus:ring-0 border"
          style={{ borderColor: selfColor }}
        >
          <User className="h-6 w-6" strokeWidth={2.5} style={{ color: selfColor }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-1.5 text-[0.95rem] bg-[hsl(var(--loom-surface))] border-[hsl(var(--loom-border))]" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center space-x-2">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selfColor }}></div>
            <div className="flex flex-col space-y-1">
              <p className="text-base font-medium leading-none text-[hsl(var(--loom-text))]">
                {meUser.display_name}
              </p>
              <p className="text-sm leading-none text-[hsl(var(--loom-text-muted))]">
                {meUser.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[hsl(var(--loom-border))]" />
        {/* Theme collapsible */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setIsThemeOpen((v) => !v);
          }}
          aria-expanded={isThemeOpen}
          className="text-base flex items-center justify-between"
        >
          <span className="flex items-center">
            {theme === 'light' ? (
              <Sun className="mr-2 h-5 w-5 text-[hsl(var(--loom-text))]" />
            ) : (
              <Moon className="mr-2 h-5 w-5 text-[hsl(var(--loom-text))]" />
            )}
            <span className="text-[hsl(var(--loom-text))]">{t('theme')}</span>
          </span>
          <ChevronDown
            className={`ml-2 h-4 w-4 text-[hsl(var(--loom-text-muted))] transition-transform ${isThemeOpen ? 'rotate-180' : ''}`}
          />
        </DropdownMenuItem>
        {isThemeOpen && (
          <div className="pl-8 py-1">
            <DropdownMenuItem onClick={() => setTheme('light')} className={`${theme === 'light' ? 'bg-[hsl(var(--loom-accent))]' : ''} text-base`}>
              <span className="text-[hsl(var(--loom-text))]">{t('light')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className={`${theme === 'dark' ? 'bg-[hsl(var(--loom-accent))]' : ''} text-base`}>
              <span className="text-[hsl(var(--loom-text))]">{t('dark')}</span>
            </DropdownMenuItem>
          </div>
        )}

        {/* Language collapsible */}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setIsLanguageOpen((v) => !v);
          }}
          aria-expanded={isLanguageOpen}
          className="text-base flex items-center justify-between"
        >
          <span className="flex items-center">
            <Globe className="mr-2 h-5 w-5 text-[hsl(var(--loom-text))]" />
            <span className="text-[hsl(var(--loom-text))]">{t('language')}</span>
          </span>
          <ChevronDown
            className={`ml-2 h-4 w-4 text-[hsl(var(--loom-text-muted))] transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`}
          />
        </DropdownMenuItem>
        {isLanguageOpen && (
          <div className="pl-8 py-1">
            <DropdownMenuItem onClick={() => setLanguage('en')} className={`${language === 'en' ? 'bg-[hsl(var(--loom-accent))]' : ''} text-base`}>
              <span className="text-[hsl(var(--loom-text))]">{t('english')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('zh')} className={`${language === 'zh' ? 'bg-[hsl(var(--loom-accent))]' : ''} text-base`}>
              <span className="text-[hsl(var(--loom-text))]">{t('chinese')}</span>
            </DropdownMenuItem>
          </div>
        )}
        <DropdownMenuItem asChild>
          <NavLink
            to="/settings"
            className="flex items-center cursor-pointer text-base"
          >
            <Settings className="mr-2 h-5 w-5 text-[hsl(var(--loom-text))]" />
            <span className="text-[hsl(var(--loom-text))]">{t('settings')}</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[hsl(var(--loom-border))]" />
        <DropdownMenuItem onClick={() => dispatch({ type: 'LOGOUT' })} className="px-3 py-2 text-base">
          <LogOut className="mr-2 h-5 w-5 text-[hsl(var(--loom-danger))]" />
          <span className="text-[hsl(var(--loom-danger))]">{t('logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserProfileMenu.displayName = 'UserProfileMenu';

export default UserProfileMenu;