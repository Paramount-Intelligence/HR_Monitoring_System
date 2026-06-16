import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, spacing } from '../../theme';

interface NotificationBellProps {
  count?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function NotificationBell({
  count = 0,
  onPress,
  accessibilityLabel = 'Notifications',
}: NotificationBellProps) {
  const badgeLabel = count > 99 ? '99+' : String(count);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `${accessibilityLabel}, ${count} unread` : accessibilityLabel
      }
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.primary} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.touchTargetMin,
    height: layout.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  pressed: {
    backgroundColor: colors.overlay,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
