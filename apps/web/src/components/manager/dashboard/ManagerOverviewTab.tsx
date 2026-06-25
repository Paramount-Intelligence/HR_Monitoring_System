'use client';

import Link from 'next/link';
import {
  Users, ClipboardCheck, CheckSquare, AlertTriangle, Briefcase,
  ShieldCheck, Activity, Calendar, UserPlus,
} from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { AdminChartCard } from '@/components/admin/dashboard/AdminChartCard';
import { AdminTabError } from '@/components/admin/dashboard/AdminTabError';
import { DashboardOverviewUpdatesSection } from '@/components/dashboard/DashboardOverviewUpdatesSection';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { ManagerOverviewData } from '@/lib/manager-dashboard/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';

interface Props {
  data: ManagerOverviewData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function fmtMeetingTime(iso: unknown) {
  if (!iso || typeof iso !== 'string') return '—';
  try {
    const d = parseISO(iso);
    return isValid(d) ? format(d, 'MMM d, h:mm a') : '—';
  } catch {
    return '—';
  }
}

export function ManagerOverviewTab({ data, loading, error, onRetry }: Props) {
  if (loading) {
    return <div className="py-16 text-center text-sm text-[var(--text-muted)] font-semibold">Loading overview...</div>;
  }
  if (error) return <AdminTabError tabName="Overview" message={error} onRetry={onRetry} />;
  if (!data) return <AdminTabError tabName="Overview" message="No data received." onRetry={onRetry} />;

  const kpis = data.kpis || {};
  const health = data.team_health || { score: 0, label: '—', blocked_tasks: 0, overdue_tasks: 0, active_members: 0 };
  const trend = safeArray(data.attendance_trend);
  const actions = safeArray(data.pending_actions);
  const activity = safeArray(data.recent_activity);
  const attention = safeArray(data.members_needing_attention);
  const meetings = safeArray<Record<string, unknown>>(data.upcoming_meetings);

  const quickActions = [
    { label: 'Team Directory', href: '/manager/team', icon: Users },
    { label: 'Approvals', href: '/manager/approvals', icon: ClipboardCheck },
    { label: 'Assign Task', href: '/manager/tasks', icon: UserPlus },
    { label: 'Completion Requests', href: '/manager/tasks?tab=completion-requests', icon: CheckSquare },
    { label: 'EOD Reviews', href: '/manager/eod-reviews', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <AdminMetricCard title="Team Members" value={safeNumber(kpis.team_members)} icon={Users} />
        <AdminMetricCard title="Present Today" value={safeNumber(kpis.present_today)} />
        <AdminMetricCard title="Pending Approvals" value={safeNumber(kpis.pending_approvals)} icon={ClipboardCheck} />
        <AdminMetricCard title="Active Tasks" value={safeNumber(kpis.active_tasks)} icon={CheckSquare} />
        <AdminMetricCard title="Overdue Tasks" value={safeNumber(kpis.overdue_tasks)} icon={AlertTriangle} />
        <AdminMetricCard title="Projects Active" value={safeNumber(kpis.projects_in_progress)} icon={Briefcase} />
        <AdminMetricCard title="EOD Pending" value={safeNumber(kpis.eod_reports_pending)} icon={ShieldCheck} />
        <AdminMetricCard title="Team Workload" value={safeNumber(kpis.team_workload)} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <AdminChartCard title="Team Attendance Trend" className="lg:col-span-7">
          {trend.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-10">No attendance data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="checked_in" stackId="1" stroke="#1E66C1" fill="#1E66C1" fillOpacity={0.2} name="Present" />
                <Area type="monotone" dataKey="late" stackId="1" stroke="#B45309" fill="#B45309" fillOpacity={0.15} name="Late" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Team Health</p>
            <p className="text-3xl font-black text-[var(--accent-primary)]">{safeNumber(health.score)}</p>
            <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">{health.label || '—'}</p>
            <div className="mt-3 text-[10px] font-bold text-[var(--text-muted)] space-y-1">
              <p>{safeNumber(health.blocked_tasks)} blocked · {safeNumber(health.overdue_tasks)} overdue</p>
              <p>{safeNumber(health.active_members)} active today</p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Pending Actions</p>
            {actions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">All clear</p>
            ) : (
              <ul className="space-y-2">
                {actions.map((a, i) => (
                  <li key={i}>
                    <Link href={String(a.route || '/manager/approvals')} className="block rounded-lg border border-[var(--border-subtle)] px-3 py-2 hover:bg-[var(--bg-subtle)]">
                      <p className="text-xs font-bold text-[var(--text-primary)]">{String(a.title || 'Action')}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{String(a.description || '')}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Today&apos;s Meetings
            </p>
            {meetings.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">No upcoming meetings</p>
            ) : (
              <ul className="space-y-2">
                {meetings.slice(0, 4).map((m, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-bold text-[var(--text-primary)]">{String(m.title || 'Meeting')}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{fmtMeetingTime(m.start_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 hover:shadow-md transition-all min-h-[52px]">
              <div className="h-8 w-8 rounded-md bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              </div>
              <span className="text-xs font-semibold">{a.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Recent Team Activity</p>
          {activity.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic py-6 text-center">No recent activity</p>
          ) : (
            <ul className="space-y-2">
              {activity.slice(0, 6).map((item, i) => (
                <li key={i} className="text-xs border-b border-[var(--border-subtle)] pb-2 last:border-0">
                  <p className="font-bold text-[var(--text-primary)]">{String(item.title || '—')}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{String(item.description || '')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Members Needing Attention</p>
          {attention.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic py-6 text-center">All team members accounted for</p>
          ) : (
            <ul className="space-y-2">
              {attention.map((m, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                  <div>
                    <p className="font-bold">{String(m.employee_name || '—')}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{String(m.details || '')}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[var(--status-warning-text)]">{String(m.status || '')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DashboardOverviewUpdatesSection limit={5} holidaysViewAllHref="/calendar" />
    </div>
  );
}
