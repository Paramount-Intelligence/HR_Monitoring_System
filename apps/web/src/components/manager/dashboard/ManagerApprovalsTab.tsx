'use client';

import Link from 'next/link';
import { ClipboardCheck, Clock, Palmtree } from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { AdminDataTable } from '@/components/admin/dashboard/AdminDataTable';
import { AdminTabError } from '@/components/admin/dashboard/AdminTabError';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { Button } from '@/components/ui/button';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { ManagerApprovalsAnalyticsData } from '@/lib/manager-dashboard/types';
import { formatPKDate } from '@/lib/time';
import { cleanReason } from '@/lib/utils';

interface Props {
  data: ManagerApprovalsAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ManagerApprovalsTab({ data, loading, error, onRetry }: Props) {
  if (loading) return <div className="py-16 text-center text-sm text-[var(--text-muted)]">Loading approvals...</div>;
  if (error) return <AdminTabError tabName="Approvals" message={error} onRetry={onRetry} />;
  if (!data) return <AdminTabError tabName="Approvals" message="No data received." onRetry={onRetry} />;

  const s = data.summary || {};
  const leaves = safeArray<Record<string, unknown>>(data.pending_leaves);
  const corrections = safeArray<Record<string, unknown>>(data.pending_corrections);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/manager/approvals" className="text-xs font-bold text-[var(--accent-primary)] hover:underline">Open full approvals workspace →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <AdminMetricCard title="Leave Pending" value={safeNumber(s.pending_leave_requests)} icon={Palmtree} />
        <AdminMetricCard title="WFH Pending" value={safeNumber(s.pending_wfh_requests)} />
        <AdminMetricCard title="Corrections" value={safeNumber(s.attendance_corrections)} icon={Clock} />
        <AdminMetricCard title="EOD Pending" value={safeNumber(s.eod_reports_pending)} icon={ClipboardCheck} />
        <AdminMetricCard title="Approved (Week)" value={safeNumber(s.approved_this_week)} />
        <AdminMetricCard title="Rejected (Week)" value={safeNumber(s.rejected_this_week)} />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Leave & WFH Requests</p>
        <AdminDataTable
          data={leaves}
          emptyMessage="No pending leave requests"
          columns={[
            {
              key: 'requester',
              header: 'Requester',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <UserProfilePicture name={String(r.requester_name || '—')} profilePictureUrl={(r.requester_avatar_url as string) || null} size="sm" />
                  <span className="font-bold">{String(r.requester_name || '—')}</span>
                </div>
              ),
            },
            { key: 'type', header: 'Type', render: (r) => String(r.leave_type || '—') },
            {
              key: 'dates',
              header: 'Dates',
              render: (r) => `${formatPKDate(String(r.start_date || ''))} – ${formatPKDate(String(r.end_date || ''))}`,
            },
            { key: 'reason', header: 'Reason', render: (r) => cleanReason(String(r.reason || '')) || '—' },
            {
              key: 'actions',
              header: 'Actions',
              render: () => (
                <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                  <Link href="/manager/approvals">Review</Link>
                </Button>
              ),
            },
          ]}
        />
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Attendance Corrections</p>
        <AdminDataTable
          data={corrections}
          emptyMessage="No pending corrections"
          columns={[
            {
              key: 'requester',
              header: 'Requester',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <UserProfilePicture name={String(r.requester_name || '—')} profilePictureUrl={(r.requester_avatar_url as string) || null} size="sm" />
                  <span className="font-bold">{String(r.requester_name || '—')}</span>
                </div>
              ),
            },
            { key: 'date', header: 'Session Date', render: (r) => formatPKDate(String(r.session_date || '')) },
            { key: 'reason', header: 'Reason', render: (r) => cleanReason(String(r.reason || '')) || '—' },
            {
              key: 'actions',
              header: 'Actions',
              render: () => (
                <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                  <Link href="/manager/approvals">Review</Link>
                </Button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
