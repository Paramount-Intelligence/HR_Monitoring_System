import type { ProjectHealth } from '../../types/project';
import type { StatusBadgeVariant } from '../ui/StatusBadge';
import { StatusBadge } from '../ui/StatusBadge';

const HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
  completed: 'Completed',
  planning: 'Planning',
  unknown: 'Unknown',
};

const HEALTH_VARIANTS: Record<ProjectHealth, StatusBadgeVariant> = {
  on_track: 'success',
  at_risk: 'warning',
  delayed: 'danger',
  completed: 'success',
  planning: 'info',
  unknown: 'neutral',
};

interface ProjectHealthBadgeProps {
  health: ProjectHealth;
}

export function ProjectHealthBadge({ health }: ProjectHealthBadgeProps) {
  return <StatusBadge label={HEALTH_LABELS[health]} variant={HEALTH_VARIANTS[health]} />;
}

export function getHealthAccentColor(health: ProjectHealth): string {
  switch (health) {
    case 'on_track':
    case 'completed':
      return '#10B981';
    case 'at_risk':
      return '#F59E0B';
    case 'delayed':
      return '#EF4444';
    case 'planning':
      return '#3B82F6';
    default:
      return '#0037b0';
  }
}
