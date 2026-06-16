/** Stitch 8px grid spacing — use in new Stitch-aligned components. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screenPadding: 16,
  gutter: 12,
} as const;

export type ThemeSpacing = keyof typeof spacing;
