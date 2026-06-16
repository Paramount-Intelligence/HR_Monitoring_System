/** Stitch corner radii. */
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type ThemeRadius = keyof typeof radius;
