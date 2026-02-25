import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../state/ThemeContext.js';
import { useApp } from '../state/AppContext.js';
import type { ThemeName } from '../state/types.js';

const THEME_NAMES: ThemeName[] = ['midnight', 'aura', 'minimal'];

export function Settings() {
  const { colors, name: currentTheme, setTheme } = useTheme();
  const { goBack, config, profiles, updateConfig } = useApp();
  const [section, setSection] = useState<'theme' | 'default'>('theme');
  const [themeIdx, setThemeIdx] = useState(THEME_NAMES.indexOf(currentTheme));
  const [defaultIdx, setDefaultIdx] = useState(
    profiles.findIndex(p => p.id === config.defaultProfileId)
  );

  useInput((input, key) => {
    if (key.escape) {
      goBack();
      return;
    }

    if (key.tab) {
      setSection(s => s === 'theme' ? 'default' : 'theme');
      return;
    }

    if (section === 'theme') {
      if (key.leftArrow || input === 'h') {
        const next = (themeIdx - 1 + THEME_NAMES.length) % THEME_NAMES.length;
        setThemeIdx(next);
        setTheme(THEME_NAMES[next]);
      }
      if (key.rightArrow || input === 'l') {
        const next = (themeIdx + 1) % THEME_NAMES.length;
        setThemeIdx(next);
        setTheme(THEME_NAMES[next]);
      }
    }

    if (section === 'default' && profiles.length > 0) {
      if (key.leftArrow || input === 'h') {
        const next = (defaultIdx - 1 + profiles.length) % profiles.length;
        setDefaultIdx(next);
        updateConfig({ defaultProfileId: profiles[next].id });
      }
      if (key.rightArrow || input === 'l') {
        const next = (defaultIdx + 1) % profiles.length;
        setDefaultIdx(next);
        updateConfig({ defaultProfileId: profiles[next].id });
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={2} paddingY={1}>
      <Text color={colors.primary} bold>Settings</Text>
      <Text color={colors.textMuted} dimColor>Use ←/→ to change, Tab to switch section, Esc to go back</Text>

      <Box marginTop={1} flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1}>
          <Text color={section === 'theme' ? colors.primary : colors.textMuted}>▸ Theme:</Text>
          <Box gap={1}>
            {THEME_NAMES.map((t, i) => (
              <Text key={t} color={i === themeIdx ? colors.primary : colors.textMuted} bold={i === themeIdx}>
                {i === themeIdx ? `[${t}]` : t}
              </Text>
            ))}
          </Box>
        </Box>

        <Box flexDirection="row" gap={1}>
          <Text color={section === 'default' ? colors.primary : colors.textMuted}>▸ Default Profile:</Text>
          {profiles.length === 0 ? (
            <Text color={colors.textMuted}>No profiles</Text>
          ) : (
            <Box gap={1}>
              {profiles.map((p, i) => (
                <Text key={p.id} color={i === defaultIdx ? colors.primary : colors.textMuted} bold={i === defaultIdx}>
                  {i === defaultIdx ? `[${p.name}]` : p.name}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
