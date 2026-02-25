import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../state/ThemeContext.js';

export function Header({ title }: { title?: string }) {
  const { colors } = useTheme();
  return (
    <Box flexDirection="row" justifyContent="center" marginBottom={1}>
      <Text color={colors.primary} bold>
        {title ?? 'CCM — Profile Manager'}
      </Text>
    </Box>
  );
}
