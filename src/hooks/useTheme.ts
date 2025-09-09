import { useEffect } from 'react';
import { useTheme as useUITheme } from '../contexts/UIContext';

export const useTheme = () => {
  const theme = useUITheme();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme === 'dark');
    return undefined;
  }, [theme]);

  return theme;
};