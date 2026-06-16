import { ProgressBar } from '../ui/ProgressBar';
import type { TaskStatus } from '../../types/task';

interface TaskProgressSummaryProps {
  progress: number;
  status?: TaskStatus | string;
  compact?: boolean;
}

function variantForStatus(status?: string): 'primary' | 'success' | 'warning' | 'danger' {
  if (status === 'blocked') return 'warning';
  if (status === 'completed' || status === 'reviewed') return 'success';
  return 'primary';
}

export function TaskProgressSummary({ progress, status, compact = false }: TaskProgressSummaryProps) {
  return (
    <ProgressBar
      progress={progress}
      variant={variantForStatus(status)}
      showLabel
      compact={compact}
      label="Progress"
    />
  );
}
