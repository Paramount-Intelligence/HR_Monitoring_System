'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, MessageSquare, CheckSquare, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { messagesApi } from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { AdminChartCard } from '@/components/admin/dashboard/AdminChartCard';
import { AdminDataTable } from '@/components/admin/dashboard/AdminDataTable';
import { AdminTabError } from '@/components/admin/dashboard/AdminTabError';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { ManagerTeamAnalyticsData } from '@/lib/manager-dashboard/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: ManagerTeamAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function SendMessageButton({ userId }: { userId: string }) {
  const router = useRouter();

  async function handleClick() {
    try {
      const conv = await messagesApi.createConversation({
        type: 'direct',
        participant_ids: [userId],
      });
      router.push(`/messages?conversation_id=${conv.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={handleClick} title="Send Message">
      <MessageSquare className="h-3 w-3" />
    </Button>
  );
}

export function ManagerTeamTab({ data, loading, error, onRetry }: Props) {
  if (loading) return <div className="py-16 text-center text-sm text-[var(--text-muted)]">Loading team analytics...</div>;
  if (error) return <AdminTabError tabName="Team" message={error} onRetry={onRetry} />;
  if (!data) return <AdminTabError tabName="Team" message="No data received." onRetry={onRetry} />;

  const s = data.summary || {};
  const roster = safeArray<Record<string, unknown>>(data.employee_roster);
  const workload = safeArray(data.workload_distribution);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <AdminMetricCard title="Total Members" value={safeNumber(s.total_members)} icon={Users} />
        <AdminMetricCard title="Checked In" value={safeNumber(s.checked_in)} />
        <AdminMetricCard title="Late Today" value={safeNumber(s.late_today)} />
        <AdminMetricCard title="On Leave" value={safeNumber(s.on_leave)} />
        <AdminMetricCard title="WFH Today" value={safeNumber(s.wfh_today)} />
        <AdminMetricCard title="High Workload" value={safeNumber(s.high_workload_members)} />
      </div>

      <AdminChartCard title="Workload Distribution">
        {workload.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No workload data</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={workload.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1E66C1" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </AdminChartCard>

      <AdminDataTable
        emptyMessage="No team members in your scope"
        data={roster}
        columns={[
          {
            key: 'member',
            header: 'Team Member',
            render: (row) => (
              <div className="flex items-center gap-2">
                <UserProfilePicture
                  name={String(row.full_name || '—')}
                  profilePictureUrl={(row.avatar_url as string) || null}
                  size="sm"
                />
                <div>
                  <p className="font-bold">{String(row.full_name || '—')}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{String(row.designation || row.role || '—')}</p>
                </div>
              </div>
            ),
          },
          { key: 'dept', header: 'Department', render: (r) => String(r.department || '—') },
          { key: 'status', header: 'Today', render: (r) => <Badge variant="outline">{String(r.today_attendance || '—')}</Badge> },
          { key: 'tasks', header: 'Active Tasks', render: (r) => safeNumber(r.active_tasks) },
          { key: 'hours', header: 'Logged Hrs', render: (r) => `${safeNumber(r.logged_hours).toFixed(1)}h` },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                {r.id ? <SendMessageButton userId={String(r.id)} /> : null}
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" asChild>
                  <Link href="/manager/tasks"><CheckSquare className="h-3 w-3" /></Link>
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" asChild>
                  <Link href="/manager/eod-reviews"><ShieldCheck className="h-3 w-3" /></Link>
                </Button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
