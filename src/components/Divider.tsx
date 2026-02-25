import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../state/ThemeContext.js';

export function Divider() {
  const { colors } = useTheme();
  return (
    <Box marginY={0}>
      <Text color={colors.border}>{'─'.repeat(56)}</Text>
    </Box>
  );
}
