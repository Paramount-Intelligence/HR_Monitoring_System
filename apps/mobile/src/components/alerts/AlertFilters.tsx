import { FilterChips, type FilterChipOption } from '../ui/FilterChips';
import type { AlertFilterId } from '../../types/alert';

const ALERT_FILTER_OPTIONS: FilterChipOption[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'leave', label: 'Leave' },
  { id: 'messages', label: 'Messages' },
  { id: 'system', label: 'System' },
];

interface AlertFiltersProps {
  selectedId: AlertFilterId;
  onSelect: (id: AlertFilterId) => void;
}

export function AlertFilters({ selectedId, onSelect }: AlertFiltersProps) {
  return (
    <FilterChips
      options={ALERT_FILTER_OPTIONS}
      selectedId={selectedId}
      onSelect={(id) => onSelect(id as AlertFilterId)}
    />
  );
}

export { ALERT_FILTER_OPTIONS };
