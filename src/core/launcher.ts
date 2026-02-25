import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { profileDir, getActiveProfile } from './config.js';
import { swapKeychainToProfile } from './keychain.js';
import { touchProfile } from './profiles.js';

export interface LaunchOptions {
  profileId: string;
  args?: string[];
  cwd?: string;
}

export async function launchClaude({ profileId, args = [], cwd }: LaunchOptions): Promise<number> {
  // Swap keychain to target profile (auto-login if needed)
  const active = await getActiveProfile();
  await swapKeychainToProfile(profileId, {
    currentProfileId: active?.profileId !== profileId ? active?.profileId : undefined,
  });

  await touchProfile(profileId);

  const dir = profileDir(profileId);

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      cwd,
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: join(dir, '.claude'),
      },
    });

    child.on('error', reject);
    child.on('exit', (code: number | null) => resolve(code ?? 1));
  });
}
