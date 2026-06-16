import type { ProjectStatus } from '../../types/project';
import type { StatusBadgeVariant } from '../ui/StatusBadge';
import { StatusBadge } from '../ui/StatusBadge';

const STATUS_VARIANTS: Record<string, StatusBadgeVariant> = {
  active: 'success',
  completed: 'success',
  approved: 'info',
  pending_approval: 'warning',
  on_hold: 'warning',
  rejected: 'danger',
  draft: 'neutral',
  archived: 'neutral',
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus | string;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? 'neutral';
  const label = status.replace(/_/g, ' ');
  return <StatusBadge label={label} variant={variant} />;
}
