import type { ThemeName, ThemeColors } from '../state/types.js';
import { midnight, aura, minimal } from './colors.js';

export const themes: Record<ThemeName, ThemeColors> = {
  midnight,
  aura,
  minimal,
};
