import React from 'react';
import { useTheme } from '../hooks/useTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Apply theme to document root
  useTheme();

  return <>{children}</>;
};

export default ThemeProvider;