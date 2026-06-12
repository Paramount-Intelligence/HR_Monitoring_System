import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radii, spacing } from '../../constants/theme';

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
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </AnimatedPressable>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
  chevron: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
});
