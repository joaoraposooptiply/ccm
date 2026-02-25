import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp as useInkApp } from 'ink';
import { useTheme } from '../state/ThemeContext.js';
import { useApp } from '../state/AppContext.js';
import { deleteProfile } from '../core/profiles.js';
import { checkAuthStatus, type AuthStatus } from '../core/auth-status.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { KeyCombo } from '../components/KeyCombo.js';
import { Modal } from '../components/Modal.js';
import { pendingAction } from '../state/actions.js';

export function ProfileDetail() {
  const { colors } = useTheme();
  const { screen, goBack, navigate, profiles, reloadProfiles, setSelectedIndex } = useApp();
  const { exit } = useInkApp();
  const profileId = screen.name === 'profile-detail' ? screen.profileId : '';
  const profile = profiles.find(p => p.id === profileId);
  const [status, setStatus] = useState<AuthStatus>('unknown');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (profileId) {
      checkAuthStatus(profileId).then(setStatus);
    }
  }, [profileId]);

  useInput((input, key) => {
    if (showDelete) return; // Modal handles input

    if (key.escape) {
      goBack();
      return;
    }
    if (input === 'l') {
      pendingAction.value = { type: 'login', profileId };
      exit();
    }
    if (input === 'e') {
      navigate({ name: 'profile-editor', profileId });
    }
    if (input === 'd') {
      setShowDelete(true);
    }
  });

  if (!profile) {
    return <Text color={colors.error}>Profile not found</Text>;
  }

  if (showDelete) {
    return (
      <Modal
        title="Delete Profile"
        message={`Delete "${profile.name}"? This removes all saved credentials and config.`}
        onConfirm={async () => {
          await deleteProfile(profile.id);
          await reloadProfiles();
          setSelectedIndex(0);
          goBack();
        }}
        onCancel={() => setShowDelete(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={2} paddingY={1}>
      <Box flexDirection="row" gap={1} marginBottom={1}>
        <StatusBadge status={status} />
        <Text color={profile.color || colors.primary} bold>{profile.name}</Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Box><Text color={colors.textMuted}>Company  </Text><Text color={colors.text}>{profile.company}</Text></Box>
        <Box><Text color={colors.textMuted}>Email    </Text><Text color={colors.text}>{profile.email}</Text></Box>
        <Box><Text color={colors.textMuted}>Status   </Text><Text color={colors.text}>{status === 'authenticated' ? 'Logged in' : 'Not logged in'}</Text></Box>
        {profile.defaultProjectDir && (
          <Box><Text color={colors.textMuted}>Dir      </Text><Text color={colors.text}>{profile.defaultProjectDir}</Text></Box>
        )}
        <Box><Text color={colors.textMuted}>ID       </Text><Text color={colors.textMuted} dimColor>{profile.id}</Text></Box>
      </Box>

      <Box flexDirection="row" marginTop={1}>
        <KeyCombo shortcut="l" label="login" />
        <KeyCombo shortcut="e" label="edit" />
        <KeyCombo shortcut="d" label="delete" />
        <KeyCombo shortcut="Esc" label="back" />
      </Box>
    </Box>
  );
}
