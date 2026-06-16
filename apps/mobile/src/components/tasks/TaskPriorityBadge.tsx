import type { TaskPriority } from '../../types/task';
import { PriorityBadge } from '../ui/PriorityBadge';

interface TaskPriorityBadgeProps {
  priority: TaskPriority | string;
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  return <PriorityBadge priority={priority} />;
}
