import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../state/ThemeContext.js';
import { useApp } from '../state/AppContext.js';
import { createProfile, updateProfile } from '../core/profiles.js';
import type { Profile } from '../state/types.js';

const PROFILE_COLORS = ['#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24', '#fb923c', '#60a5fa'];

const FIELDS = ['name', 'company', 'email', 'color', 'defaultProjectDir'] as const;
type FieldName = typeof FIELDS[number];

const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Profile Name',
  company: 'Company',
  email: 'Email',
  color: 'Color',
  defaultProjectDir: 'Project Dir (optional)',
};

export function ProfileEditor() {
  const { colors } = useTheme();
  const { screen, goBack, reloadProfiles, profiles } = useApp();
  const editId = screen.name === 'profile-editor' ? screen.profileId : undefined;
  const existing = editId ? profiles.find(p => p.id === editId) : undefined;

  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: existing?.name ?? '',
    company: existing?.company ?? '',
    email: existing?.email ?? '',
    color: existing?.color ?? PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
    defaultProjectDir: existing?.defaultProjectDir ?? '',
  });
  const [colorIndex, setColorIndex] = useState(
    PROFILE_COLORS.indexOf(existing?.color ?? PROFILE_COLORS[profiles.length % PROFILE_COLORS.length])
  );

  const currentField = FIELDS[fieldIndex];

  useInput((input, key) => {
    if (key.escape) {
      goBack();
      return;
    }

    if (currentField === 'color') {
      if (key.leftArrow || input === 'h') {
        const next = (colorIndex - 1 + PROFILE_COLORS.length) % PROFILE_COLORS.length;
        setColorIndex(next);
        setValues(v => ({ ...v, color: PROFILE_COLORS[next] }));
        return;
      }
      if (key.rightArrow || input === 'l') {
        const next = (colorIndex + 1) % PROFILE_COLORS.length;
        setColorIndex(next);
        setValues(v => ({ ...v, color: PROFILE_COLORS[next] }));
        return;
      }
    }

    if (key.return) {
      if (fieldIndex < FIELDS.length - 1) {
        setFieldIndex(fieldIndex + 1);
      } else {
        // Submit
        handleSubmit();
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (currentField !== 'color') {
        setValues(v => ({ ...v, [currentField]: v[currentField].slice(0, -1) }));
      }
      return;
    }

    if (currentField !== 'color' && input && !key.ctrl && !key.meta) {
      setValues(v => ({ ...v, [currentField]: v[currentField] + input }));
    }
  });

  async function handleSubmit() {
    if (!values.name || !values.email) return;

    if (editId) {
      await updateProfile(editId, values);
    } else {
      await createProfile(values);
    }
    await reloadProfiles();
    goBack();
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.border} paddingX={2} paddingY={1}>
      <Text color={colors.primary} bold>
        {editId ? 'Edit Profile' : 'New Profile'}
      </Text>
      <Text color={colors.textMuted} dimColor>Press Enter to advance, Esc to cancel</Text>
      <Box marginTop={1} flexDirection="column">
        {FIELDS.map((field, i) => {
          const active = i === fieldIndex;
          const done = i < fieldIndex;
          return (
            <Box key={field} flexDirection="row" gap={1}>
              <Text color={done ? colors.success : active ? colors.primary : colors.textMuted}>
                {done ? '✓' : active ? '▸' : ' '}
              </Text>
              <Text color={active ? colors.text : colors.textMuted}>
                {FIELD_LABELS[field]}:
              </Text>
              {field === 'color' ? (
                <Box gap={1}>
                  {PROFILE_COLORS.map((c, ci) => (
                    <Text key={c} color={c}>
                      {ci === colorIndex ? '●' : '○'}
                    </Text>
                  ))}
                </Box>
              ) : (
                <Text color={active ? colors.text : colors.textMuted}>
                  {values[field]}{active ? '█' : ''}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
