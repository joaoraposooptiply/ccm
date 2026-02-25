import React, { useState } from 'react';
import { Box, Text, useInput, useApp as useInkApp } from 'ink';
import { useTheme } from '../state/ThemeContext.js';
import { useApp } from '../state/AppContext.js';
import { Header } from '../components/Header.js';
import { ProfileCard } from '../components/ProfileCard.js';
import { KeyCombo } from '../components/KeyCombo.js';
import { Modal } from '../components/Modal.js';
import { deleteProfile } from '../core/profiles.js';
import { pendingAction } from '../state/actions.js';

export function Dashboard() {
  const { colors } = useTheme();
  const { profiles, navigate, selectedIndex, setSelectedIndex, reloadProfiles } = useApp();
  const { exit } = useInkApp();
  const [showDelete, setShowDelete] = useState(false);

  const selectedProfile = profiles.length > 0 ? profiles[selectedIndex] : undefined;

  useInput((input, key) => {
    if (showDelete) return;

    if (input === 'q') {
      exit();
      return;
    }

    if (input === 'j' || key.downArrow) {
      setSelectedIndex(Math.min(selectedIndex + 1, profiles.length - 1));
    }
    if (input === 'k' || key.upArrow) {
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
    }

    if (input === 'n') {
      navigate({ name: 'profile-editor' });
    }

    if (input === 's') {
      navigate({ name: 'settings' });
    }

    if (selectedProfile) {
      if (key.return) {
        navigate({ name: 'profile-detail', profileId: selectedProfile.id });
      }
      if (input === 'e') {
        navigate({ name: 'profile-editor', profileId: selectedProfile.id });
      }
      if (input === 'l') {
        pendingAction.value = {
          type: 'launch',
          profileId: selectedProfile.id,
          cwd: selectedProfile.defaultProjectDir,
        };
        exit();
      }
      if (input === 'a') {
        pendingAction.value = {
          type: 'activate',
          profileId: selectedProfile.id,
          profileName: selectedProfile.name,
        };
        exit();
      }
      if (input === 'd') {
        setShowDelete(true);
      }
    }
  });

  if (showDelete && selectedProfile) {
    return (
      <Modal
        title="Delete Profile"
        message={`Delete "${selectedProfile.name}"? This removes all saved credentials and config.`}
        onConfirm={async () => {
          await deleteProfile(selectedProfile.id);
          await reloadProfiles();
          setSelectedIndex(Math.max(0, selectedIndex - 1));
          setShowDelete(false);
        }}
        onCancel={() => setShowDelete(false)}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.border}
        paddingX={1}
        paddingY={0}
      >
        <Header />
        {profiles.length === 0 ? (
          <Box paddingX={2} paddingY={1}>
            <Text color={colors.textMuted}>
              No profiles yet. Press [n] to create one.
            </Text>
          </Box>
        ) : (
          profiles.map((profile, i) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              selected={i === selectedIndex}
            />
          ))
        )}
        <Text> </Text>
      </Box>

      <Box flexDirection="row" marginTop={1} justifyContent="center">
        <KeyCombo shortcut="n" label="new" />
        {profiles.length > 0 && (
          <>
            <KeyCombo shortcut="a" label="activate" />
            <KeyCombo shortcut="l" label="launch" />
            <KeyCombo shortcut="Enter" label="open" />
            <KeyCombo shortcut="e" label="edit" />
            <KeyCombo shortcut="d" label="delete" />
          </>
        )}
        <KeyCombo shortcut="s" label="settings" />
        <KeyCombo shortcut="q" label="quit" />
      </Box>
    </Box>
  );
}
