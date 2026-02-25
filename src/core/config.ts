import { join } from 'node:path';
import { homedir } from 'node:os';
import { readJson, writeJson, ensureDir } from '../utils/fs.js';
import type { CCMConfig } from '../state/types.js';

// Capture real HOME at startup before any overrides
export const REAL_HOME = homedir();
export const CCM_DIR = join(REAL_HOME, '.ccm');
export const CONFIG_PATH = join(CCM_DIR, 'config.json');
export const PROFILES_DIR = join(CCM_DIR, 'profiles');

const DEFAULT_CONFIG: CCMConfig = {
  theme: 'midnight',
  directoryProfileMap: {},
};

export async function loadConfig(): Promise<CCMConfig> {
  await ensureDir(CCM_DIR);
  const config = await readJson<CCMConfig>(CONFIG_PATH);
  return { ...DEFAULT_CONFIG, ...config };
}

export async function saveConfig(config: CCMConfig): Promise<void> {
  await writeJson(CONFIG_PATH, config);
}

export function profileDir(profileId: string): string {
  return join(PROFILES_DIR, profileId);
}

// Active profile tracking — written on activate/use, read by whoami + shell prompts

interface ActiveProfile {
  profileId: string;
  profileName: string;
  activatedAt: string;
}

const ACTIVE_PATH = join(CCM_DIR, 'active.json');

export async function getActiveProfile(): Promise<ActiveProfile | null> {
  return readJson<ActiveProfile>(ACTIVE_PATH);
}

export async function setActiveProfile(profileId: string, profileName: string): Promise<void> {
  await writeJson(ACTIVE_PATH, {
    profileId,
    profileName,
    activatedAt: new Date().toISOString(),
  });
}
