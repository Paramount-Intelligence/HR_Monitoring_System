import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkMode } from '../../types/attendance';
import { colors, radius, spacing, typography } from '../../theme';

interface WorkModeSelectorProps {
  value: WorkMode;
  onChange: (mode: WorkMode) => void;
  disabled?: boolean;
}

const OPTIONS: { id: WorkMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'office', label: 'Office', icon: 'business-outline' },
  { id: 'wfh', label: 'WFH', icon: 'home-outline' },
];

export function WorkModeSelector({ value, onChange, disabled = false }: WorkModeSelectorProps) {
  return (
    <View style={styles.wrap}>
      <Text style={[typography.labelSm, styles.label]}>Work mode</Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const active = value === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.id)}
              style={[
                styles.chip,
                active ? styles.chipActive : styles.chipInactive,
                disabled && styles.chipDisabled,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={active ? colors.white : colors.primary}
              />
              <Text style={[typography.labelMd, active ? styles.textActive : styles.textInactive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    backgroundColor: colors.card,
    borderColor: colors.outlineVariant,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  textActive: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  textInactive: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
});
