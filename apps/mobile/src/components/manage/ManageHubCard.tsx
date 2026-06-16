import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radius, shadows, spacing, typography } from '../../theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ManageHubCardProps {
  title: string;
  subtitle: string;
  icon: IoniconName;
  badge?: number;
  onPress: () => void;
  index?: number;
  accentColor?: string;
}

export function ManageHubCard({
  title,
  subtitle,
  icon,
  badge,
  onPress,
  index = 0,
  accentColor = colors.primary,
}: ManageHubCardProps) {
  return (
    <FadeSlideIn index={index} translateY={10}>
      <AnimatedPressable accessibilityRole="button" onPress={onPress} style={styles.card}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.inner}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={22} color={accentColor} />
          </View>
          <View style={styles.content}>
            <Text style={[typography.titleMd, styles.title]}>{title}</Text>
            <Text style={[typography.bodySm, styles.subtitle]}>{subtitle}</Text>
          </View>
          {badge != null && badge > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          )}
        </View>
      </AnimatedPressable>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
    minHeight: 84,
    ...shadows.card,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});
