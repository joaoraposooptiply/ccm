import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../state/ThemeContext.js';

export function KeyCombo({ shortcut, label }: { shortcut: string; label: string }) {
  const { colors } = useTheme();
  return (
    <Box marginRight={2}>
      <Text color={colors.shortcutKey}>[{shortcut}]</Text>
      <Text color={colors.textMuted}> {label}</Text>
    </Box>
  );
}
