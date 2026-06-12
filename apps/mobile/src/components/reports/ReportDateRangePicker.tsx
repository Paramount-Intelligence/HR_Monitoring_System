import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { REPORT_DATE_PRESETS, type ReportDatePreset } from '../../utils/report-dates';
import { colors, radii, spacing } from '../../constants/theme';

interface ReportDateRangePickerProps {
  selected: ReportDatePreset;
  onSelect: (preset: ReportDatePreset) => void;
}

export function ReportDateRangePicker({ selected, onSelect }: ReportDateRangePickerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {REPORT_DATE_PRESETS.map((preset) => {
        const active = preset.key === selected;
        return (
          <Pressable
            key={preset.key}
            accessibilityRole="button"
            onPress={() => onSelect(preset.key)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
  },
  chipTextActive: {
    color: colors.white,
  },
});
