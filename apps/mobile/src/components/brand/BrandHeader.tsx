import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, spacing, typography, shadows, radius } from '../../theme';
import { NotificationBell } from '../ui/NotificationBell';
import { AppIconButton } from '../ui/AppIconButton';

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  centerTitle?: boolean;
  left?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  notificationCount?: number;
  onNotificationPress?: () => void;
  showNotificationBell?: boolean;
  style?: ViewStyle;
}

export function BrandHeader({
  title,
  subtitle,
  centerTitle = false,
  left,
  onBack,
  right,
  notificationCount = 0,
  onNotificationPress,
  showNotificationBell = false,
  style,
}: BrandHeaderProps) {
  const insets = useSafeAreaInsets();

  const leftSlot =
    left ??
    (onBack ? (
      <AppIconButton
        icon="arrow-back"
        onPress={onBack}
        accessibilityLabel="Go back"
        variant="default"
      />
    ) : (
      <View style={styles.sideSlot} />
    ));

  const rightSlot =
    right ??
    (showNotificationBell ? (
      <NotificationBell count={notificationCount} onPress={onNotificationPress} />
    ) : (
      <View style={styles.sideSlot} />
    ));

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          backgroundColor: Platform.OS === 'android' ? colors.surfaceElevated : 'rgba(255,255,255,0.92)',
        },
        style,
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.side}>{leftSlot}</View>

        <View style={[styles.center, centerTitle ? styles.centerAligned : undefined]}>
          {title ? (
            <Text style={[typography.headlineMd, styles.title]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[typography.caption, styles.subtitle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.side}>{rightSlot}</View>
      </View>
    </View>
  );
}

/** Compact variant with avatar on left and optional bell on right — matches Stitch dashboard top bar. */
export function BrandHeaderWithAvatar({
  avatar,
  title = 'PIMS Intelligence',
  notificationCount = 0,
  onNotificationPress,
}: {
  avatar: ReactNode;
  title?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        styles.avatarHeader,
        {
          paddingTop: insets.top,
          backgroundColor: Platform.OS === 'android' ? colors.surfaceElevated : 'rgba(255,255,255,0.92)',
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.avatarLeft}>{avatar}</View>
        <Text style={[typography.headlineMd, styles.intelligenceTitle]} numberOfLines={1}>
          {title}
        </Text>
        <NotificationBell count={notificationCount} onPress={onNotificationPress} />
      </View>
    </View>
  );
}

const SIDE = 44;

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...shadows.tabBar,
  },
  bar: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  side: {
    width: SIDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSlot: {
    width: SIDE,
    height: SIDE,
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  centerAligned: {
    alignItems: 'center',
  },
  title: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  avatarHeader: {},
  avatarLeft: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  intelligenceTitle: {
    flex: 1,
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
});
