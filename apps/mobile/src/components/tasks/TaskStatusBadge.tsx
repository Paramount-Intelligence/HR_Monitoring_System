import { StyleSheet, Text, View } from 'react-native';
import type { TaskStatus } from '../../types/task';
import { getTaskStatusLabel, getTaskStatusVariant } from '../../utils/task-adapters';
import { StatusBadge } from '../ui/StatusBadge';

interface TaskStatusBadgeProps {
  status: TaskStatus | string;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  return (
    <StatusBadge label={getTaskStatusLabel(status)} variant={getTaskStatusVariant(status)} />
  );
}
