import { Clock, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { cn } from '@/lib/utils';
import type { TeamPerformanceReport, TeamPerformanceRow } from '@/lib/api/reports';
import { formatEodStatusLabel } from '@/lib/reports/report-filters';

interface TeamPerformanceTableProps {
  report: TeamPerformanceReport | null;
  rows: TeamPerformanceRow[];
  isLoading: boolean;
  loadError?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
}

export function TeamPerformanceTable({
  report,
  rows,
  isLoading,
  loadError = false,
  emptyMessage = 'No report data found for this filter.\nTry changing the date range or clearing the search.',
  errorMessage = 'Unable to load reports.\nPlease try again.',
}: TeamPerformanceTableProps) {
  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm font-semibold text-[var(--text-muted)] mb-6">Loading reports...</p>
        <TableSkeleton rows={8} cols={11} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-20">
        <EmptyState title="Unable to load reports" message={errorMessage} icon={Users} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-20">
        <EmptyState title="No report data found" message={emptyMessage} icon={Users} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
          <TableRow className="h-16 border-b border-[var(--border-subtle)]">
            <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest min-w-[200px]">Team Member</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[120px]">Department</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[100px]">Role</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[90px]">Hours</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[110px]">Tasks Worked On</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[120px]">Completed Tasks</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[70px]">Late</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[70px]">Early</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[70px]">WFH</TableHead>
            <TableHead className="font-black text-[10px] uppercase tracking-widest min-w-[90px]">Absences</TableHead>
            <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest min-w-[120px]">EOD Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.user_id} className="h-20 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]/30 transition-all">
              <TableCell className="pl-10">
                <div className="flex items-center gap-3">
                  <UserProfilePicture
                    user={{
                      full_name: row.name,
                      avatar_url: row.avatar_url,
                      presence_status: row.presence_status as 'active' | 'away' | undefined,
                    }}
                    name={row.name}
                    size="sm"
                    showPresence
                  />
                  <div>
                    <span className="font-black text-[var(--text-primary)] text-sm tracking-tight block">{row.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold">{row.designation || row.email}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-xs font-bold text-[var(--text-secondary)]">{row.department || '—'}</TableCell>
              <TableCell className="text-xs font-bold uppercase text-[var(--text-secondary)]">{row.role.replace(/_/g, ' ')}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                  <span className="font-bold text-[var(--text-secondary)] text-xs">{row.hours.toFixed(1)}h</span>
                </div>
              </TableCell>
              <TableCell className="text-xs font-bold text-[var(--text-secondary)]">{row.tasks_worked_on}</TableCell>
              <TableCell className="text-xs font-bold text-[var(--text-secondary)]">{row.completed_tasks}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('rounded-lg text-[8px] font-black uppercase tracking-widest px-2', row.late_count > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>
                  {row.late_count}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('rounded-lg text-[8px] font-black uppercase tracking-widest px-2', row.early_count > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>
                  {row.early_count}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 font-bold text-[var(--accent-primary)] text-xs">
                  <MapPin className="h-3.5 w-3.5" />
                  {row.wfh_count}
                </div>
              </TableCell>
              <TableCell>
                <span className={cn('font-black text-xs', row.absence_count > 0 ? 'text-rose-500' : 'text-[var(--text-muted)]')}>
                  {row.absence_count}
                </span>
              </TableCell>
              <TableCell className="text-right pr-10">
                <Badge variant="outline" className="rounded-lg text-[8px] font-black uppercase tracking-widest px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">
                  {formatEodStatusLabel(row.eod_status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {report && (
        <p className="px-10 py-4 text-[11px] font-semibold text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
          {format(new Date(report.start_date), 'dd MMM yyyy')} – {format(new Date(report.end_date), 'dd MMM yyyy')} · {report.timezone}
          {' · '}
          Metrics are calculated from live attendance, timers, tasks, and EOD records.
        </p>
      )}
    </div>
  );
}
