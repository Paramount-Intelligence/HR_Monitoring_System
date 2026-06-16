import { StatusBadge, type StatusBadgeVariant } from '../ui/StatusBadge';
import type { AlertSeverity } from '../../types/alert';
import { severityToBadgeVariant } from '../../utils/alert-adapters';

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  resolved?: boolean;
}

export function AlertSeverityBadge({ severity, resolved = false }: AlertSeverityBadgeProps) {
  const variant: StatusBadgeVariant = resolved ? 'neutral' : severityToBadgeVariant(severity);
  const label = resolved ? 'Resolved' : severity;

  return <StatusBadge label={label} variant={variant} />;
}
