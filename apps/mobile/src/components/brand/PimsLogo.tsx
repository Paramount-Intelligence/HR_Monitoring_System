import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { spacing, typography, colors, radius } from '../../theme';

const LOGO_SOURCE = require('../../../assets/logo.png');

interface PimsLogoProps {
  size?: number;
  width?: number;
  height?: number;
  showWordmark?: boolean;
  variant?: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

export function PimsLogo({
  size = 40,
  width,
  height,
  showWordmark = false,
  variant = 'default',
  style,
  imageStyle,
  accessibilityLabel = 'PIMS',
}: PimsLogoProps) {
  const logoWidth = width ?? size;
  const logoHeight = height ?? size;

  const wordColor =
    variant === 'light'
      ? colors.white
      : variant === 'dark'
        ? colors.onPrimaryFixed
        : colors.primary;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={LOGO_SOURCE}
        style={[{ width: logoWidth, height: logoHeight }, styles.logo, imageStyle]}
        resizeMode="contain"
        accessible={false}
      />
      {showWordmark ? (
        <Text
          style={[styles.wordmark, typography.titleLg, { color: wordColor }]}
          accessibilityElementsHidden
        >
          PIMS
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    borderRadius: radius.md,
  },
  wordmark: {
    letterSpacing: 1.2,
  },
});
