import { ProgressBar } from '../ui/ProgressBar';
import type { ProjectHealth } from '../../types/project';

interface ProjectProgressSummaryProps {
  progress: number;
  health?: ProjectHealth;
  compact?: boolean;
  showLabel?: boolean;
}

function progressVariant(health?: ProjectHealth): 'primary' | 'success' | 'warning' | 'danger' {
  if (health === 'delayed') return 'danger';
  if (health === 'at_risk') return 'warning';
  if (health === 'on_track' || health === 'completed') return 'success';
  return 'primary';
}

export function ProjectProgressSummary({
  progress,
  health,
  compact = false,
  showLabel = true,
}: ProjectProgressSummaryProps) {
  return (
    <ProgressBar
      progress={progress}
      variant={progressVariant(health)}
      showLabel={showLabel}
      compact={compact}
      label="Progress"
    />
  );
}
