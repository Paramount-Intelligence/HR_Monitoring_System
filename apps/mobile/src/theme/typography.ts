import { TextStyle } from 'react-native';

/** Inter when loaded via useAppFonts; falls back to system sans-serif. */
export const fontFamily = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** Safe fallback when Inter is not yet loaded */
  fallback: undefined as string | undefined,
} as const;

export const typography = {
  headlineLg: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.48,
  } satisfies TextStyle,
  headlineMd: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  } satisfies TextStyle,
  titleLg: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  } satisfies TextStyle,
  titleMd: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  } satisfies TextStyle,
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } satisfies TextStyle,
  bodyMd: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } satisfies TextStyle,
  bodySm: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } satisfies TextStyle,
  labelMd: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  } satisfies TextStyle,
  labelSm: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  caption: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
  } satisfies TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;

/** Apply Inter font family when fonts are loaded. */
export function withFont(style: TextStyle, weight: 'regular' | 'semiBold' | 'bold' = 'regular'): TextStyle {
  const family =
    weight === 'bold'
      ? fontFamily.bold
      : weight === 'semiBold'
        ? fontFamily.semiBold
        : fontFamily.regular;

  return {
    ...style,
    fontFamily: family,
  };
}
