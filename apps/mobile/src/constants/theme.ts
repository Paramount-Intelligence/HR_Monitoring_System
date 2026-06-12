export const colors = {
  primary: '#0f3b82',
  primaryDark: '#08204a',
  primaryLight: '#2563eb',
  background: '#f5f7fb',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  textSecondary: '#374151',
  mutedText: '#6b7280',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  warningText: '#b45309',
  info: '#2563eb',
  purple: '#7c3aed',
  white: '#ffffff',
  overlay: 'rgba(8, 32, 74, 0.06)',
  tabActive: '#0f3b82',
  tabInactive: '#6b7280',
  inputBackground: '#f8fafc',
  errorSurface: '#fee2e2',
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
    avatar: '#1d4ed8',
    controlBar: '#0f172a',
  },
} as const;

export const badgePalettes = {
  default: { bg: colors.overlay, text: colors.primary, border: colors.border },
  success: { bg: '#dcfce7', text: colors.success, border: '#bbf7d0' },
  warning: { bg: '#fef3c7', text: colors.warningText, border: '#fde68a' },
  danger: { bg: '#fee2e2', text: colors.danger, border: '#fecaca' },
  info: { bg: '#dbeafe', text: colors.info, border: '#bfdbfe' },
  neutral: { bg: colors.borderLight, text: colors.mutedText, border: colors.border },
  escalated: { bg: '#ede9fe', text: colors.purple, border: '#ddd6fe' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const layout = {
  touchTargetMin: 44,
  buttonHeight: 52,
  tabBarHeight: 56,
  scrollBottomInset: 24,
  headerSubtitleOpacity: 0.78,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  elevated: {
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export type BadgeTone = keyof typeof badgePalettes;

export function badgeToneForStatus(status: string): BadgeTone {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  if (normalized.includes('approved') || normalized.includes('present') || normalized.includes('full day')) {
    return 'success';
  }
  if (
    normalized.includes('pending') ||
    normalized.includes('half') ||
    normalized.includes('late') ||
    normalized.includes('clarification')
  ) {
    return 'warning';
  }
  if (
    normalized.includes('reject') ||
    normalized.includes('absent') ||
    normalized.includes('leave') ||
    normalized.includes('danger')
  ) {
    return 'danger';
  }
  if (normalized.includes('escalated')) return 'escalated';
  if (normalized.includes('wfh') || normalized.includes('active') || normalized.includes('info')) {
    return 'info';
  }
  return 'neutral';
}
