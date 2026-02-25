import React from 'react';
import meow from 'meow';
import { render } from 'ink';
import { App } from './App.js';
import { AppProvider } from './state/AppContext.js';
import { loadConfig, getActiveProfile, setActiveProfile } from './core/config.js';
import { loadProfiles } from './core/profiles.js';
import { launchClaude } from './core/launcher.js';
import { checkAuthStatus } from './core/auth-status.js';
import { hasBackedUpCredential, restoreCredential } from './core/keychain.js';
import { pendingAction, type PendingAction } from './state/actions.js';
import type { ThemeName, Screen } from './state/types.js';

const cli = meow(`
  Usage
    $ ccm                      Open TUI
    $ ccm launch [name]        Launch Claude Code with profile
    $ ccm use <name>           Activate profile (swap credential for CLI)
    $ ccm whoami               Show active profile
    $ ccm list                 List profiles
    $ ccm status               Show credential status
    $ ccm login <name>         Run claude auth login for profile
    $ ccm add                  Add profile via TUI

  Options
    --theme   Theme: midnight, aura, minimal
    --help    Show help
`, {
  importMeta: import.meta,
  flags: {
    theme: { type: 'string' },
  },
});

async function main() {
  const [command, ...args] = cli.input;
  const config = await loadConfig();
  const profiles = await loadProfiles();

  if (cli.flags.theme) {
    config.theme = cli.flags.theme as ThemeName;
  }

  // Non-TUI commands
  if (command === 'whoami') {
    const active = await getActiveProfile();
    if (active) {
      const profile = profiles.find(p => p.id === active.profileId);
      console.log(profile?.name ?? active.profileName);
    } else {
      console.log('No active profile');
    }
    return;
  }

  if (command === 'list') {
    if (profiles.length === 0) {
      console.log('No profiles. Run `ccm` to create one.');
      return;
    }
    for (const p of profiles) {
      const status = await checkAuthStatus(p.id);
      const dot = status === 'authenticated' ? '●' : '○';
      console.log(`  ${dot} ${p.name.padEnd(20)} ${p.email}`);
    }
    return;
  }

  if (command === 'status') {
    if (profiles.length === 0) {
      console.log('No profiles.');
      return;
    }
    for (const p of profiles) {
      const hasCred = await hasBackedUpCredential(p.id);
      console.log(`  ${p.name.padEnd(20)} ${hasCred ? 'credential backed up' : 'no credential'}`);
    }
    return;
  }

  if (command === 'launch') {
    const name = args[0];
    let profile = name
      ? profiles.find(p => p.name.toLowerCase() === name.toLowerCase())
      : undefined;

    // Auto-detect from cwd via directoryProfileMap
    if (!profile && !name) {
      const cwd = process.cwd();
      for (const [dir, pid] of Object.entries(config.directoryProfileMap)) {
        if (cwd === dir || cwd.startsWith(dir + '/')) {
          profile = profiles.find(p => p.id === pid);
          if (profile) break;
        }
      }
    }

    // Fallback to default or first
    if (!profile && !name) {
      profile = config.defaultProfileId
        ? profiles.find(p => p.id === config.defaultProfileId)
        : profiles[0];
    }

    if (!profile) {
      console.error(name ? `Profile "${name}" not found.` : 'No profiles configured.');
      process.exit(1);
      return;
    }

    const code = await launchClaude({ profileId: profile.id, cwd: profile.defaultProjectDir });
    process.exit(code);
  }

  if (command === 'use') {
    const name = args[0];
    if (!name) {
      console.error('Usage: ccm use <profile-name>');
      process.exit(1);
      return;
    }
    const profile = profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!profile) {
      console.error(`Profile "${name}" not found.`);
      process.exit(1);
      return;
    }
    const ok = await restoreCredential(profile.id);
    if (ok) {
      await setActiveProfile(profile.id, profile.name);
      console.log(`Active profile: ${profile.name}`);
    } else {
      console.error(`No backed-up credential for ${profile.name}. Run \`ccm login ${profile.name}\` first.`);
      process.exit(1);
    }
    return;
  }

  if (command === 'login') {
    const name = args[0];
    if (!name) {
      console.error('Usage: ccm login <profile-name>');
      process.exit(1);
      return;
    }
    const profile = profiles.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!profile) {
      console.error(`Profile "${name}" not found.`);
      process.exit(1);
      return;
    }
    const { spawn } = await import('node:child_process');
    const { profileDir } = await import('./core/config.js');
    const { backupCredential } = await import('./core/keychain.js');
    const dir = profileDir(profile.id);

    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn('claude', ['auth', 'login'], {
        stdio: 'inherit',
        env: { ...process.env, HOME: dir },
      });
      child.on('error', reject);
      child.on('exit', (c: number | null) => resolve(c ?? 1));
    });

    if (code === 0) {
      const ok = await backupCredential(profile.id);
      console.log(ok ? `Credential backed up for ${profile.name}.` : 'Login done but no credential found to back up.');
    } else {
      console.error('Login cancelled or failed.');
      process.exit(1);
    }
    return;
  }

  // TUI mode — loop so we can suspend for launch/login and resume
  let initialScreen: Screen | undefined;
  if (command === 'add') {
    initialScreen = { name: 'profile-editor' };
  }

  while (true) {
    // Reset the pending action
    pendingAction.value = null;

    // Re-read profiles each loop iteration (may have changed)
    const freshProfiles = await loadProfiles();
    const freshConfig = await loadConfig();
    if (cli.flags.theme) freshConfig.theme = cli.flags.theme as ThemeName;

    const inst = render(
      <AppProvider initialConfig={freshConfig} initialProfiles={freshProfiles} initialScreen={initialScreen}>
        <App />
      </AppProvider>
    );

    await inst.waitUntilExit();

    // Check if there's a pending action to handle outside Ink
    const action = pendingAction.value as PendingAction | null;
    if (!action) break; // Normal quit

    if (action.type === 'launch') {
      try {
        await launchClaude({ profileId: action.profileId, cwd: action.cwd });
      } catch (err: unknown) {
        console.error(`Launch failed: ${err instanceof Error ? err.message : err}`);
      }
      initialScreen = undefined;
      continue;
    }

    if (action.type === 'activate') {
      const ok = await restoreCredential(action.profileId);
      if (ok) {
        await setActiveProfile(action.profileId, action.profileName);
        console.log(`\n  Active profile: ${action.profileName}\n  Credential swapped. Any CLI tool now uses this account.\n`);
      } else {
        console.error(`\n  No backed-up credential for ${action.profileName}. Run login first.\n`);
      }
      // Exit — user is now in their terminal with the right credential
      break;
    }

    if (action.type === 'login') {
      const { spawn } = await import('node:child_process');
      const { profileDir } = await import('./core/config.js');
      const { backupCredential } = await import('./core/keychain.js');
      const dir = profileDir(action.profileId);

      const code = await new Promise<number>((resolve, reject) => {
        const child = spawn('claude', ['auth', 'login'], {
          stdio: 'inherit',
          env: { ...process.env, HOME: dir },
        });
        child.on('error', reject);
        child.on('exit', (c: number | null) => resolve(c ?? 1));
      });

      if (code === 0) {
        const ok = await backupCredential(action.profileId);
        console.log(ok ? 'Credential backed up.' : 'No credential to back up.');
      }
      // Loop back to TUI
      initialScreen = undefined;
      continue;
    }

    break;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
