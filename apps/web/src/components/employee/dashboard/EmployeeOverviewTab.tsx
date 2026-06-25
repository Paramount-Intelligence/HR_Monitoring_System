'use client';

import Link from 'next/link';
import {
  Activity, Timer, CheckSquare, AlertCircle, PlayCircle,
  Clock, FileText, Palmtree, MessageSquare, Calendar, Bell, ArrowRight,
} from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { DashboardOverviewUpdatesSection } from '@/components/dashboard/DashboardOverviewUpdatesSection';
import { DashboardSummary } from '@/lib/api/dashboard';
import { EODReport } from '@/lib/api/eod';
import { Meeting } from '@/lib/api/meetings';
import { Notification } from '@/lib/api/notifications';
import { cn, formatSafeDurationFromSeconds } from '@/lib/utils';
import { formatPKDateTime } from '@/lib/time';
import { format, parseISO, isValid } from 'date-fns';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const QUICK_LINKS = [
  { href: '/employee/attendance', icon: Clock, label: 'Attendance' },
  { href: '/employee/time-logs', icon: Timer, label: 'Time Tracking' },
  { href: '/employee/tasks', icon: CheckSquare, label: 'My Tasks' },
  { href: '/employee/eod', icon: FileText, label: 'My EOD' },
  { href: '/employee/leaves', icon: Palmtree, label: 'Leaves' },
  { href: '/messages', icon: MessageSquare, label: 'Messages' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
];

function formatMinutes(minutes: number): string {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '—';
  return formatSafeDurationFromSeconds(m * 60);
}

function formatMeetingTime(meeting: Meeting): string {
  const raw = meeting.start_at;
  if (!raw) return '—';
  const d = parseISO(raw);
  if (!isValid(d)) return '—';
  return format(d, 'MMM d, h:mm a');
}

interface EmployeeOverviewTabProps {
  summary: DashboardSummary;
  eod: EODReport | null;
  upcomingMeeting: Meeting | null;
  notifications: Notification[];
  unreadCount: number;
}

export function EmployeeOverviewTab({
  summary,
  eod,
  upcomingMeeting,
  notifications,
  unreadCount,
}: EmployeeOverviewTabProps) {
  const isActive = summary.attendance_status === 'active';
  const eodLabel = eod?.status ?? 'Not Started';
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <AdminMetricCard
          title="Attendance Status"
          value={isActive ? 'Online' : 'Offline'}
          subtitle={isActive ? 'Shift active' : 'Awaiting check-in'}
          icon={Activity}
          trend={isActive ? 'Clocked in' : 'Standby'}
        />
        <AdminMetricCard
          title="Today Logged Hours"
          value={formatMinutes(summary.total_time_today)}
          subtitle={`Productive: ${formatMinutes(summary.productive_time_today)}`}
          icon={Timer}
        />
        <AdminMetricCard
          title="Tasks In Progress"
          value={summary.tasks_in_progress}
          subtitle="Active assignments"
          icon={CheckSquare}
        />
        <AdminMetricCard
          title="Critical Tasks"
          value={summary.tasks_due_soon}
          subtitle={summary.tasks_due_soon > 0 ? 'Due within 48h' : 'None overdue'}
          icon={AlertCircle}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-2 hover:bg-[var(--bg-subtle)] transition-all min-h-[44px]"
                  >
                    <div className="h-7 w-7 shrink-0 rounded-md bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--accent-primary)]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Upcoming Meeting
                </span>
              </div>
              {upcomingMeeting ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                    {upcomingMeeting.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {formatMeetingTime(upcomingMeeting)}
                  </p>
                  <Link href="/calendar" className="text-[10px] font-semibold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1">
                    View calendar <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No upcoming meetings scheduled.</p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Notifications
                  </span>
                </div>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-[var(--accent-primary)]">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {recentNotifications.length > 0 ? (
                <ul className="space-y-2">
                  {recentNotifications.map((n) => (
                    <li key={n.id} className="text-[11px] leading-snug">
                      <span className={cn('font-semibold', !n.is_read && 'text-[var(--text-primary)]')}>
                        {n.title}
                      </span>
                      <p className="text-[var(--text-muted)] line-clamp-1">{n.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">No notifications yet.</p>
              )}
            </div>
          </div>

          <DashboardOverviewUpdatesSection limit={5} holidaysViewAllHref="/calendar" />
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div
            className={cn(
              'rounded-xl border bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]',
              summary.active_timer_task_id
                ? 'border-amber-300/50 ring-1 ring-amber-400/30'
                : 'border-[var(--border-default)]'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle
                className={cn(
                  'h-4 w-4',
                  summary.active_timer_task_id ? 'text-amber-500 animate-pulse' : 'text-[var(--text-muted)]'
                )}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Active Task
              </span>
            </div>
            {summary.active_timer_task_id ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
                  {summary.active_timer_task_title || 'Task in progress'}
                </p>
                <Link
                  href="/employee/time-logs"
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-full rounded-lg text-xs')}
                >
                  Open Time Logs
                </Link>
              </div>
            ) : (
              <EmptyState
                title="No active task"
                description="Start a timer from My Tasks to track work."
                icon={CheckSquare}
                className="py-4"
                action={
                  <Link
                    href="/employee/tasks"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-lg text-xs')}
                  >
                    View Tasks
                  </Link>
                }
              />
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--accent-primary)]/90 p-4 text-white shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">EOD Status</p>
            <p className="text-lg font-bold tracking-tight mb-2">{eodLabel}</p>
            <p className="text-xs opacity-80 mb-3 leading-relaxed">
              {eod?.status === 'Approved' || eod?.status === 'Pending Approval'
                ? 'Your daily report has been submitted.'
                : 'Review and submit your end-of-day report before checkout.'}
            </p>
            <Link
              href="/employee/eod"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'w-full rounded-lg text-xs bg-white/90 text-[var(--accent-primary)] hover:bg-white border-none'
              )}
            >
              {eod ? 'Open EOD' : 'Start EOD'}
            </Link>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Today Summary
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Attendance</span>
                <span className="font-semibold">{isActive ? 'Checked in' : 'Not checked in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Logged hours</span>
                <span className="font-semibold">{formatMinutes(summary.total_time_today)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Tasks in progress</span>
                <span className="font-semibold">{summary.tasks_in_progress}</span>
              </div>
              {eod?.login_time && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Check-in</span>
                  <span className="font-semibold">{formatPKDateTime(eod.login_time, { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
