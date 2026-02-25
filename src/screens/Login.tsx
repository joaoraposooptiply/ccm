import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { useTheme } from '../state/ThemeContext.js';
import { useApp } from '../state/AppContext.js';
import { profileDir } from '../core/config.js';
import { backupCredential } from '../core/keychain.js';

export function Login() {
  const { colors } = useTheme();
  const { screen, goBack, profiles } = useApp();
  const profileId = screen.name === 'login' ? screen.profileId : '';
  const profile = profiles.find(p => p.id === profileId);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    const dir = profileDir(profileId);

    const child = spawn('claude', ['auth', 'login'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: join(dir, '.claude'),
      },
    });

    child.on('error', (err: Error) => {
      setMessage(err.message);
      setDone(true);
    });

    child.on('exit', async (code: number | null) => {
      if (code === 0) {
        setMessage('Backing up credential...');
        const ok = await backupCredential(profileId);
        setMessage(ok ? 'Credential backed up successfully.' : 'Login done, no credential found to back up.');
      } else {
        setMessage(`Login cancelled or failed (exit code ${code}).`);
      }
      setDone(true);
    });

    return () => {
      if (child.exitCode === null) {
        child.kill();
      }
    };
  }, [profileId]);

  // Auto-return once done — Ink can't reclaim stdin after stdio:inherit child
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => goBack(), 1500);
    return () => clearTimeout(timer);
  }, [done, goBack]);

  if (!profile) {
    return <Text color={colors.error}>Profile not found</Text>;
  }

  if (!done) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={colors.primary}>Logging in as {profile.name}...</Text>
        <Text color={colors.textMuted}>Complete the login in the browser window.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color={colors.success}>{message}</Text>
      <Text color={colors.textMuted}>Returning to dashboard...</Text>
    </Box>
  );
}
