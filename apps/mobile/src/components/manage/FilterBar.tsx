import { StyleSheet, View } from 'react-native';
import { FilterChips } from '../ui/FilterChips';
import { spacing } from '../../theme';

interface FilterBarProps {
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}

export function FilterBar({ options, selected, onSelect }: FilterBarProps) {
  const chips = options.map((option) => ({
    id: option.key,
    label: option.label,
  }));

  return (
    <View style={styles.wrap}>
      <FilterChips options={chips} selectedId={selected} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.sm,
  },
});
