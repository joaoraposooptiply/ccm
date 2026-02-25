import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../state/ThemeContext.js';
import { StatusBadge } from './StatusBadge.js';
import { checkAuthStatus, type AuthStatus } from '../core/auth-status.js';
import type { Profile } from '../state/types.js';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProfileCard({ profile, selected }: { profile: Profile; selected: boolean }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<AuthStatus>('unknown');

  useEffect(() => {
    checkAuthStatus(profile.id).then(setStatus);
  }, [profile.id]);

  const statusLabel = status === 'authenticated' ? 'Logged in' : 'Not logged in';
  const lastUsed = profile.lastUsedAt ? `Last used ${timeAgo(profile.lastUsedAt)}` : 'Never used';

  return (
    <Box flexDirection="column" paddingX={2} paddingY={0}>
      <Box flexDirection="row" gap={1}>
        <Text color={selected ? colors.borderFocused : undefined}>
          {selected ? '▸' : ' '}
        </Text>
        <StatusBadge status={status} />
        <Text color={profile.color || colors.primary} bold>
          {profile.name}
        </Text>
        <Text color={colors.textMuted}>{profile.email}</Text>
      </Box>
      <Box paddingLeft={4}>
        <Text color={colors.textMuted} dimColor>
          {statusLabel} · {lastUsed}
        </Text>
      </Box>
    </Box>
  );
}
