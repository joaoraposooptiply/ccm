import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../state/ThemeContext.js';

interface ModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Modal({ title, message, onConfirm, onCancel }: ModalProps) {
  const { colors } = useTheme();

  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onConfirm();
    if (input === 'n' || input === 'N' || key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.warning} paddingX={2} paddingY={1}>
      <Text color={colors.warning} bold>{title}</Text>
      <Text color={colors.text}>{message}</Text>
      <Box marginTop={1}>
        <Text color={colors.textMuted}>[y] confirm  [n] cancel</Text>
      </Box>
    </Box>
  );
}
