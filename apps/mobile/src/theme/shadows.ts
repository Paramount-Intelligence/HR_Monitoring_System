import { ViewStyle } from 'react-native';
import { colors } from './colors';

/** React Native shadow presets matching Stitch elevation. */
export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } satisfies ViewStyle,
  elevated: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  } satisfies ViewStyle,
  tabBar: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  } satisfies ViewStyle,
} as const;

export type ThemeShadow = keyof typeof shadows;
