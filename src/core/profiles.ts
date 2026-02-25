import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import { CCM_DIR, profileDir } from './config.js';
import { readJson, writeJson, ensureDir } from '../utils/fs.js';
import type { Profile } from '../state/types.js';

const PROFILES_PATH = join(CCM_DIR, 'profiles.json');

export async function loadProfiles(): Promise<Profile[]> {
  return (await readJson<Profile[]>(PROFILES_PATH)) ?? [];
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await writeJson(PROFILES_PATH, profiles);
}

export async function createProfile(data: Pick<Profile, 'name' | 'company' | 'email' | 'color' | 'defaultProjectDir'>): Promise<Profile> {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: uuid(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  // Create isolated config dir — CLAUDE_CONFIG_DIR will point here
  const dir = profileDir(profile.id);
  await ensureDir(dir);
  await ensureDir(join(dir, '.claude'));

  const profiles = await loadProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);

  return profile;
}

export async function updateProfile(id: string, data: Partial<Pick<Profile, 'name' | 'company' | 'email' | 'color' | 'defaultProjectDir'>>): Promise<Profile | null> {
  const profiles = await loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return null;

  profiles[idx] = {
    ...profiles[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await saveProfiles(profiles);
  return profiles[idx];
}

export async function deleteProfile(id: string): Promise<boolean> {
  const profiles = await loadProfiles();
  const filtered = profiles.filter(p => p.id !== id);
  if (filtered.length === profiles.length) return false;

  await saveProfiles(filtered);

  // Remove profile directory
  try {
    await rm(profileDir(id), { recursive: true, force: true });
  } catch {
    // Best effort
  }

  return true;
}

export async function touchProfile(id: string): Promise<void> {
  const profiles = await loadProfiles();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return;
  profiles[idx].lastUsedAt = new Date().toISOString();
  await saveProfiles(profiles);
}
