import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { colors, radii, spacing } from '../../constants/theme';

export interface ReportFilterOption {
  key: string;
  label: string;
}

interface ReportFilterSheetProps {
  visible: boolean;
  title?: string;
  options: ReportFilterOption[];
  selected: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function ReportFilterSheet({
  visible,
  title = 'Filters',
  options,
  selected,
  onSelect,
  onClose,
}: ReportFilterSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView>
            {options.map((option) => {
              const active = option.key === selected;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  onPress={() => onSelect(option.key)}
                  style={[styles.option, active && styles.optionActive]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <AppButton title="Apply" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '70%',
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  option: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.overlay,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
