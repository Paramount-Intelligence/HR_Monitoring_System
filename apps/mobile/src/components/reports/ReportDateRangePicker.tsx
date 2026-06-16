import { StyleSheet, View } from 'react-native';
import { FilterChips } from '../ui/FilterChips';
import { REPORT_DATE_PRESETS, type ReportDatePreset } from '../../utils/report-dates';
import { spacing } from '../../theme';

interface ReportDateRangePickerProps {
  selected: ReportDatePreset;
  onSelect: (preset: ReportDatePreset) => void;
}

export function ReportDateRangePicker({ selected, onSelect }: ReportDateRangePickerProps) {
  return (
    <View style={styles.wrap}>
      <FilterChips
        options={REPORT_DATE_PRESETS.map((preset) => ({
          id: preset.key,
          label: preset.label,
        }))}
        selectedId={selected}
        onSelect={(id) => onSelect(id as ReportDatePreset)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
