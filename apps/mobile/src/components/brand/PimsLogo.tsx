import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../../constants/theme';

const LOGO_SOURCE = require('../../../assets/logo.png');

interface PimsLogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export function PimsLogo({
  size = 40,
  showWordmark = false,
  variant = 'light',
  style,
  imageStyle,
}: PimsLogoProps) {
  const wordColor = variant === 'light' ? colors.white : colors.primaryDark;

  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel="PIMS">
      <Image
        source={LOGO_SOURCE}
        style={[{ width: size, height: size }, styles.logo, imageStyle]}
        resizeMode="contain"
        accessible={false}
      />
      {showWordmark ? (
        <Text style={[styles.wordmark, { color: wordColor }]} accessibilityElementsHidden>
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
    borderRadius: 8,
  },
  wordmark: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
