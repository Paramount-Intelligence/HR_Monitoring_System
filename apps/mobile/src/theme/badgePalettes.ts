import { colors } from './colors';

/** Stitch 15%-tint badge palettes for status indicators. */
export const badgePalettes = {
  default: { bg: colors.primaryTint, text: colors.primary, border: colors.border },
  success: { bg: colors.successTint, text: colors.success, border: 'rgba(16, 185, 129, 0.25)' },
  warning: { bg: colors.warningTint, text: colors.warning, border: 'rgba(245, 158, 11, 0.25)' },
  danger: { bg: colors.dangerTint, text: colors.danger, border: 'rgba(239, 68, 68, 0.25)' },
  info: { bg: colors.infoTint, text: colors.info, border: 'rgba(59, 130, 246, 0.25)' },
  neutral: { bg: colors.neutralTint, text: colors.textSecondary, border: colors.border },
  primary: { bg: colors.primaryTint, text: colors.primary, border: 'rgba(0, 55, 176, 0.2)' },
  escalated: { bg: '#ede9fe', text: '#7c3aed', border: '#ddd6fe' },
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
