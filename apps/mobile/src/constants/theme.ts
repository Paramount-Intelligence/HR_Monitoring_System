/**
 * Legacy theme entry point — preserves existing import paths.
 * New Stitch-aligned components should import from `src/theme` directly.
 */
import {
  colors as stitchColors,
  spacing as stitchSpacing,
  radius as stitchRadius,
  typography as stitchTypography,
  shadows as stitchShadows,
  badgePalettes,
  badgeToneForStatus,
  layout,
  type BadgeTone,
} from '../theme';

/** Stitch palette + legacy aliases used across existing screens. */
export const colors = {
  ...stitchColors,
  primaryDark: stitchColors.onPrimaryFixed,
  primaryLight: stitchColors.primaryContainer,
  mutedText: stitchColors.muted,
  borderLight: stitchColors.backgroundAlt,
  warningText: '#92400e',
  purple: '#7c3aed',
  errorSurface: stitchColors.errorContainer,
  errorBorder: '#fecaca',
  call: {
    backdrop: '#0b1220',
    panel: '#1e293b',
    videoBg: '#000000',
    accentGreen: '#059669',
    accentRed: '#dc2626',
    textMuted: '#93c5fd',
    textOnDark: '#ffffff',
    statusConnected: '#6ee7b7',
    statusWarning: '#fcd34d',
    statusDanger: '#fca5a5',
    avatar: stitchColors.primaryContainer,
    controlBar: '#0f172a',
  },
} as const;

/**
 * Legacy spacing scale (md=16, lg=24) — unchanged for existing screens.
 * Stitch scale available via stitchSpacing export.
 */
export const spacing = {
  xs: stitchSpacing.xs,
  sm: stitchSpacing.sm,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  gutter: stitchSpacing.gutter,
  screenPadding: stitchSpacing.screenPadding,
} as const;

/** Legacy radii — unchanged for existing screens. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: stitchRadius.pill,
} as const;

/** Legacy typography aliases. */
export const typography = {
  title: { fontSize: stitchTypography.headlineLg.fontSize, fontWeight: '700' as const },
  subtitle: { fontSize: stitchTypography.titleMd.fontSize, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: stitchTypography.bodySm.fontSize, fontWeight: '400' as const },
  label: {
    fontSize: stitchTypography.labelSm.fontSize,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
};

export { badgePalettes, badgeToneForStatus, layout, type BadgeTone };

export const shadows = {
  card: stitchShadows.card,
  elevated: stitchShadows.elevated,
  tabBar: stitchShadows.tabBar,
} as const;

/** Canonical Stitch tokens for new components. */
export {
  colors as stitchColors,
  spacing as stitchSpacing,
  radius as stitchRadius,
  typography as stitchTypography,
  shadows as stitchShadows,
} from '../theme';
