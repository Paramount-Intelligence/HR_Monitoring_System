import { StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { colors, radii, spacing } from '../../constants/theme';

interface ExceptionHeatmapMobileProps {
  items: { employee_name: string; department_name: string; status: string; details: string }[];
}

export function ExceptionHeatmapMobile({ items }: ExceptionHeatmapMobileProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Attendance Exceptions</Text>
      {items.slice(0, 8).map((item, index) => (
        <View key={`${item.employee_name}-${index}`} style={styles.row}>
          <View style={styles.textWrap}>
            <Text style={styles.name}>{item.employee_name}</Text>
            <Text style={styles.type}>
              {item.department_name} · {item.details}
            </Text>
          </View>
          <AppBadge label={item.status.replace(/_/g, ' ')} variant="warning" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  type: {
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
    textTransform: 'capitalize',
  },
});
