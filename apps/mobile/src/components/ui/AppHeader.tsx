import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, spacing } from '../../constants/theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  style?: ViewStyle;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  style,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: spacing.md },
        style,
      ]}
    >
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    marginHorizontal: -spacing.md,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.touchTargetMin,
    marginBottom: spacing.xs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchTargetMin,
    paddingRight: spacing.sm,
  },
  backText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 2,
  },
  rightAction: {
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: `rgba(255,255,255,${layout.headerSubtitleOpacity})`,
    fontSize: 14,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});
