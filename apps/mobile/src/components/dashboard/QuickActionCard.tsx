import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface QuickActionCardProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
  index?: number;
}

export function QuickActionCard({
  title,
  subtitle,
  onPress,
  disabled = false,
  index = 0,
}: QuickActionCardProps) {
  return (
    <FadeSlideIn index={index} translateY={8}>
      <AnimatedPressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.card, disabled && styles.disabled]}
      >
        <View style={styles.copy}>
          <Text style={[typography.titleMd, styles.title]}>{title}</Text>
          <Text style={[typography.bodySm, styles.subtitle]}>{subtitle}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </AnimatedPressable>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  disabled: {
    opacity: 0.5,
  },
  copy: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '300',
  },
});
