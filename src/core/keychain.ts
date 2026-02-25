import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { execFile } from '../utils/exec.js';
import { readJson, writeJson, fileExists } from '../utils/fs.js';
import { profileDir } from './config.js';
import type { KeychainCredential } from '../state/types.js';

const SERVICE = 'Claude Code-credentials';

export async function readKeychainCredential(): Promise<KeychainCredential | null> {
  try {
    const { stdout } = await execFile('security', [
      'find-generic-password',
      '-s', SERVICE,
      '-g',
    ]);
    // Account is in stdout, password in stderr (security outputs password to stderr)
    const accountMatch = stdout.match(/"acct"<blob>="([^"]+)"/);
    const account = accountMatch?.[1] ?? '';
    return { account, password: '' };
  } catch {
    return null;
  }
}

export async function readKeychainFull(): Promise<KeychainCredential | null> {
  try {
    // -g outputs password to stderr, -w outputs just the password to stdout
    const { stdout: password } = await execFile('security', [
      'find-generic-password',
      '-s', SERVICE,
      '-w',
    ]);

    // Get account name separately
    const result = await execFile('security', [
      'find-generic-password',
      '-s', SERVICE,
      '-g',
    ]).catch(() => null);

    let account = '';
    if (result) {
      const combined = result.stdout + result.stderr;
      const match = combined.match(/"acct"<blob>="([^"]+)"/);
      account = match?.[1] ?? '';
    }

    return { account, password: password.trim() };
  } catch {
    return null;
  }
}

export async function writeKeychainCredential(cred: KeychainCredential): Promise<void> {
  // Delete existing first (ignore errors if doesn't exist)
  try {
    await execFile('security', [
      'delete-generic-password',
      '-s', SERVICE,
    ]);
  } catch {
    // OK if not found
  }

  // Add new credential — use stdin to avoid password in ps output
  await execFile('security', [
    'add-generic-password',
    '-s', SERVICE,
    '-a', cred.account,
    '-w', cred.password,
    '-U',
  ]);
}

export async function backupCredential(profileId: string): Promise<boolean> {
  const cred = await readKeychainFull();
  if (!cred || !cred.password) return false;

  const credPath = join(profileDir(profileId), 'credential.json');
  await writeJson(credPath, cred, 0o600);
  return true;
}

export async function restoreCredential(profileId: string): Promise<boolean> {
  const credPath = join(profileDir(profileId), 'credential.json');
  if (!(await fileExists(credPath))) return false;

  const cred = await readJson<KeychainCredential>(credPath);
  if (!cred || !cred.password) return false;

  await writeKeychainCredential(cred);
  return true;
}

export async function hasBackedUpCredential(profileId: string): Promise<boolean> {
  const credPath = join(profileDir(profileId), 'credential.json');
  if (!(await fileExists(credPath))) return false;
  const cred = await readJson<KeychainCredential>(credPath);
  return cred !== null && !!cred.password;
}

/** Read the raw OAuth token JSON string from a profile's backed-up credential. */
export async function getOAuthToken(profileId: string): Promise<string | null> {
  const credPath = join(profileDir(profileId), 'credential.json');
  if (!(await fileExists(credPath))) return null;
  const cred = await readJson<KeychainCredential>(credPath);
  return cred?.password || null;
}

/** Spawn `claude auth login` with the correct CLAUDE_CONFIG_DIR for a profile. */
export function runClaudeAuthLogin(profileId: string): Promise<number> {
  const dir = profileDir(profileId);
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['auth', 'login'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: join(dir, '.claude'),
      },
    });
    child.on('error', reject);
    child.on('exit', (code: number | null) => resolve(code ?? 1));
  });
}

/**
 * Swap the macOS Keychain credential to the target profile.
 * 1. Backup current Keychain → outgoing profile's credential.json
 * 2. If target has no credential → auto-run `claude auth login` → backup result
 * 3. Restore target's credential.json → Keychain
 */
export async function swapKeychainToProfile(
  targetProfileId: string,
  opts?: { currentProfileId?: string },
): Promise<void> {
  // 1. Backup current keychain to outgoing profile (if known)
  if (opts?.currentProfileId) {
    await backupCredential(opts.currentProfileId);
  }

  // 2. If target has no backed-up credential, auto-login
  const hasCred = await hasBackedUpCredential(targetProfileId);
  if (!hasCred) {
    console.log('No credential found — launching claude auth login...');
    const code = await runClaudeAuthLogin(targetProfileId);
    if (code !== 0) {
      throw new Error('Login cancelled or failed.');
    }
    const ok = await backupCredential(targetProfileId);
    if (!ok) {
      throw new Error('Login completed but no credential found to back up.');
    }
  }

  // 3. Restore target credential to Keychain
  const restored = await restoreCredential(targetProfileId);
  if (!restored) {
    throw new Error(`Failed to restore credential for profile.`);
  }
}
