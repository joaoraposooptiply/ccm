export interface Profile {
  id: string;
  name: string;
  company: string;
  email: string;
  color: string;
  defaultProjectDir?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface CCMConfig {
  defaultProfileId?: string;
  theme: ThemeName;
  directoryProfileMap: Record<string, string>; // dir -> profileId
}

export type ThemeName = 'midnight' | 'aura' | 'minimal';

export interface ThemeColors {
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  borderFocused: string;
  selection: string;
  shortcutKey: string;
}

export type Screen =
  | { name: 'dashboard' }
  | { name: 'profile-detail'; profileId: string }
  | { name: 'profile-editor'; profileId?: string }
  | { name: 'settings' }
  | { name: 'login'; profileId: string };

export interface AppState {
  screen: Screen;
  profiles: Profile[];
  config: CCMConfig;
  selectedIndex: number;
}

export interface KeychainCredential {
  account: string;
  password: string;
}
