import React from 'react';
import { Text } from 'ink';
import { useTheme } from '../state/ThemeContext.js';
import type { AuthStatus } from '../core/auth-status.js';

const STATUS_MAP: Record<AuthStatus, { symbol: string; colorKey: 'success' | 'error' | 'textMuted' | 'warning' }> = {
  'authenticated': { symbol: '●', colorKey: 'success' },
  'no-credential': { symbol: '○', colorKey: 'textMuted' },
  'unknown': { symbol: '?', colorKey: 'warning' },
};

export function StatusBadge({ status }: { status: AuthStatus }) {
  const { colors } = useTheme();
  const { symbol, colorKey } = STATUS_MAP[status];
  return <Text color={colors[colorKey]}>{symbol}</Text>;
}
