import React from 'react';
import meow from 'meow';
import { render } from 'ink';
import { App } from './App.js';
import { AppProvider } from './state/AppContext.js';
import { loadConfig, getActiveProfile, setActiveProfile } from './core/config.js';
import { loadProfiles } from './core/profiles.js';
import { launchClaude } from './core/launcher.js';
import { checkAuthStatus } from './core/auth-status.js';
import { hasBackedUpCredential, swapKeychainToProfile, runClaudeAuthLogin, backupCredential, restoreCredential } from './core/keychain.js';
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
    $ ccm init                 Add prompt integration to ~/.zshrc

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
  if (command === 'init') {
    const { homedir } = await import('node:os');
    const { readFile, appendFile } = await import('node:fs/promises');
    const rcPath = `${homedir()}/.zshrc`;
    const marker = '# CCM prompt integration';

    let rc = '';
    try { rc = await readFile(rcPath, 'utf8'); } catch {}

    if (rc.includes(marker)) {
      console.log('CCM prompt integration already installed in ~/.zshrc');
      return;
    }

    const snippet = `
${marker} — per-terminal profile tracking
ccm() {
  if [[ "$1" == "use" || "$1" == "activate" ]]; then
    command ccm "$@"
    local code=$?
    if [[ $code -eq 0 && -f "$HOME/.ccm/active.json" ]]; then
      local name config_dir
      name=$(python3 -c "import json; print(json.load(open('$HOME/.ccm/active.json'))['profileName'])" 2>/dev/null)
      config_dir=$(python3 -c "import json; print(json.load(open('$HOME/.ccm/active.json')).get('configDir',''))" 2>/dev/null)
      [[ -n "$name" ]] && export CCM_PROFILE="$name"
      [[ -n "$config_dir" ]] && export CLAUDE_CONFIG_DIR="$config_dir"
    fi
    unset CLAUDE_CODE_OAUTH_TOKEN
    return $code
  else
    command ccm "$@"
    local code=$?
    if [[ -f "$HOME/.ccm/active.json" ]]; then
      local name config_dir
      name=$(python3 -c "import json; print(json.load(open('$HOME/.ccm/active.json'))['profileName'])" 2>/dev/null)
      config_dir=$(python3 -c "import json; print(json.load(open('$HOME/.ccm/active.json')).get('configDir',''))" 2>/dev/null)
      [[ -n "$name" ]] && export CCM_PROFILE="$name"
      [[ -n "$config_dir" ]] && export CLAUDE_CONFIG_DIR="$config_dir"
    fi
    unset CLAUDE_CODE_OAUTH_TOKEN
    return $code
  fi
}
ccm_prompt_info() {
  [[ -n "$CCM_PROFILE" ]] && echo "%F{magenta}[$CCM_PROFILE]%f "
}
if [[ -f "$HOME/.ccm/active.json" && -z "$CCM_PROFILE" ]]; then
  CCM_PROFILE=$(python3 -c "import json; d=json.load(open('$HOME/.ccm/active.json')); print(d['profileName'])" 2>/dev/null)
  CLAUDE_CONFIG_DIR=$(python3 -c "import json; d=json.load(open('$HOME/.ccm/active.json')); print(d.get('configDir',''))" 2>/dev/null)
  [[ -n "$CCM_PROFILE" ]] && export CCM_PROFILE
  [[ -n "$CLAUDE_CONFIG_DIR" ]] && export CLAUDE_CONFIG_DIR
fi
PROMPT='$(ccm_prompt_info)'"$PROMPT"
`;

    await appendFile(rcPath, snippet);
    console.log('Added CCM prompt integration to ~/.zshrc');
    console.log('Run `source ~/.zshrc` or open a new terminal tab to activate.');
    return;
  }

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
    const active = await getActiveProfile();
    await swapKeychainToProfile(profile.id, {
      currentProfileId: active?.profileId !== profile.id ? active?.profileId : undefined,
    });
    await setActiveProfile(profile.id, profile.name);
    console.log(`Active profile: ${profile.name}`);
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
    const code = await runClaudeAuthLogin(profile.id);
    if (code === 0) {
      const ok = await backupCredential(profile.id);
      if (ok) {
        await restoreCredential(profile.id);
        console.log(`Credential backed up for ${profile.name}.`);
      } else {
        console.log('Login done but no credential found to back up.');
      }
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
      try {
        const active = await getActiveProfile();
        await swapKeychainToProfile(action.profileId, {
          currentProfileId: active?.profileId !== action.profileId ? active?.profileId : undefined,
        });
        await setActiveProfile(action.profileId, action.profileName);
        console.log(`\n  Active profile: ${action.profileName}\n`);
      } catch (err: unknown) {
        console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
      }
      // Exit — shell function will pick up CLAUDE_CONFIG_DIR
      break;
    }

    if (action.type === 'login') {
      const code = await runClaudeAuthLogin(action.profileId);
      if (code === 0) {
        const ok = await backupCredential(action.profileId);
        if (ok) {
          await restoreCredential(action.profileId);
          console.log('Credential backed up and restored.');
        } else {
          console.log('No credential to back up.');
        }
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
