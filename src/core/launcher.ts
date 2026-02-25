import { spawn } from 'node:child_process';
import { profileDir } from './config.js';
import { restoreCredential } from './keychain.js';
import { touchProfile } from './profiles.js';

export interface LaunchOptions {
  profileId: string;
  args?: string[];
  cwd?: string;
}

export async function launchClaude({ profileId, args = [], cwd }: LaunchOptions): Promise<number> {
  // Restore this profile's credential into the Keychain
  const restored = await restoreCredential(profileId);
  if (!restored) {
    throw new Error('No backed-up credential found. Run login first.');
  }

  await touchProfile(profileId);

  const dir = profileDir(profileId);

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      stdio: 'inherit',
      cwd,
      env: {
        ...process.env,
        HOME: dir,
      },
    });

    child.on('error', reject);
    child.on('exit', (code: number | null) => resolve(code ?? 1));
  });
}
