import { AppBadge, type AppBadgeVariant } from '../ui/AppBadge';

export function ApprovalStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/_/g, ' ');
  let variant: AppBadgeVariant = 'neutral';
  if (normalized.includes('pending') || normalized.includes('clarification')) variant = 'warning';
  else if (normalized.includes('approved')) variant = 'success';
  else if (normalized.includes('reject')) variant = 'danger';
  else if (normalized.includes('escalated')) variant = 'warning';

  const label = normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  return <AppBadge label={label} variant={variant} />;
}

export { ApprovalActionModal as ApprovalDecisionSheet } from '../manage/ApprovalActionModal';
