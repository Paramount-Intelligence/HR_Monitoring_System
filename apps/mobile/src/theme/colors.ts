/** Stitch design system colors — canonical source for new UI. */
export const colors = {
  primary: '#0037b0',
  primaryContainer: '#1d4ed8',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#001551',
  inversePrimary: '#b7c4ff',

  background: '#f9f9ff',
  backgroundAlt: '#F8F9FA',
  surface: '#f9f9ff',
  surfaceElevated: '#ffffff',
  card: '#ffffff',

  text: '#151c27',
  textSecondary: '#434655',
  muted: '#747686',

  border: '#c4c5d7',
  borderStrong: '#747686',
  outline: '#747686',
  outlineVariant: '#c4c5d7',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  secondary: '#575e70',
  secondaryContainer: '#d9dff5',
  onSecondaryContainer: '#5c6274',

  white: '#ffffff',
  black: '#000000',

  overlay: 'rgba(21, 28, 39, 0.04)',
  overlayStrong: 'rgba(0, 0, 0, 0.4)',

  tabActive: '#0037b0',
  tabInactive: '#575e70',

  inputBackground: '#ffffff',
  disabled: '#c4c5d7',

  shadow: '#151c27',

  /** 15% tint bases for status badges */
  successTint: 'rgba(16, 185, 129, 0.15)',
  warningTint: 'rgba(245, 158, 11, 0.15)',
  dangerTint: 'rgba(239, 68, 68, 0.15)',
  infoTint: 'rgba(59, 130, 246, 0.15)',
  primaryTint: 'rgba(0, 55, 176, 0.15)',
  neutralTint: 'rgba(196, 197, 215, 0.35)',
} as const;

export type ThemeColor = keyof typeof colors;
