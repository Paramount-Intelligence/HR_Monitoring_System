import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radii, spacing } from '../../constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ManageHubCardProps {
  title: string;
  subtitle: string;
  icon: IoniconName;
  badge?: number;
  onPress: () => void;
  index?: number;
}

export function ManageHubCard({
  title,
  subtitle,
  icon,
  badge,
  onPress,
  index = 0,
}: ManageHubCardProps) {
  return (
    <FadeSlideIn index={index} translateY={10}>
      <AnimatedPressable accessibilityRole="button" onPress={onPress} style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {badge != null && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
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
    gap: spacing.md,
    minHeight: 84,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
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
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  chevron: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '300',
  },
});
