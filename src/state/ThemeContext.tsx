import React, { createContext, useContext } from 'react';
import type { ThemeName, ThemeColors } from './types.js';
import { themes } from '../theme/presets.js';

interface ThemeContextValue {
  name: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  name: 'midnight',
  colors: themes.midnight,
  setTheme: () => {},
});

export function ThemeProvider({ name, setTheme, children }: {
  name: ThemeName;
  setTheme: (name: ThemeName) => void;
  children: React.ReactNode;
}) {
  return (
    <ThemeContext.Provider value={{ name, colors: themes[name], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
