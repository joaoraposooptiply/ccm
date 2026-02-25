import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Screen, Profile, CCMConfig, ThemeName } from './types.js';
import { ThemeProvider } from './ThemeContext.js';
import { loadConfig, saveConfig } from '../core/config.js';
import { loadProfiles, saveProfiles } from '../core/profiles.js';

interface AppContextValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  goBack: () => void;
  profiles: Profile[];
  reloadProfiles: () => Promise<void>;
  config: CCMConfig;
  updateConfig: (patch: Partial<CCMConfig>) => Promise<void>;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
}

const AppContext = createContext<AppContextValue>(null!);

export function AppProvider({ children, initialConfig, initialProfiles, initialScreen }: {
  children: React.ReactNode;
  initialConfig: CCMConfig;
  initialProfiles: Profile[];
  initialScreen?: Screen;
}) {
  const [screenStack, setScreenStack] = useState<Screen[]>([initialScreen ?? { name: 'dashboard' }]);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [config, setConfig] = useState<CCMConfig>(initialConfig);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const screen = screenStack[screenStack.length - 1];

  const navigate = useCallback((s: Screen) => {
    setScreenStack(prev => [...prev, s]);
  }, []);

  const goBack = useCallback(() => {
    setScreenStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  const reloadProfiles = useCallback(async () => {
    const p = await loadProfiles();
    setProfiles(p);
  }, []);

  const updateConfig = useCallback(async (patch: Partial<CCMConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    await saveConfig(next);
  }, [config]);

  const setTheme = useCallback((name: ThemeName) => {
    updateConfig({ theme: name });
  }, [updateConfig]);

  return (
    <ThemeProvider name={config.theme} setTheme={setTheme}>
      <AppContext.Provider value={{
        screen, navigate, goBack,
        profiles, reloadProfiles,
        config, updateConfig,
        selectedIndex, setSelectedIndex,
      }}>
        {children}
      </AppContext.Provider>
    </ThemeProvider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
