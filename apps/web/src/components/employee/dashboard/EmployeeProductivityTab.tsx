'use client';

import Link from 'next/link';
import { EODReport } from '@/lib/api/eod';
import { Goal, Note } from '@/lib/api/growth';
import { DashboardSummary } from '@/lib/api/dashboard';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, CheckSquare, Clock, Target, StickyNote } from 'lucide-react';
import { formatSafeDurationFromSeconds } from '@/lib/utils';
import { formatPKDateTime } from '@/lib/time';
import { format, parseISO, isValid } from 'date-fns';

interface EmployeeProductivityTabProps {
  summary: DashboardSummary;
  eod: EODReport | null;
  goals: Goal[];
  notes: Note[];
}

function safeScore(score: unknown): string {
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0) return '0/100';
  return `${Math.round(n)}/100`;
}

function formatNoteDate(raw: string): string {
  const d = parseISO(raw);
  if (!isValid(d)) return '—';
  return format(d, 'MMM d, yyyy');
}

export function EmployeeProductivityTab({
  summary,
  eod,
  goals,
  notes,
}: EmployeeProductivityTabProps) {
  const eodStatus = eod?.status ?? 'Not Started';
  const recentNotes = notes.slice(0, 5);
  const activeGoals = goals.filter((g) => g.status !== 'completed').slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <AdminMetricCard title="EOD Status" value={eodStatus} icon={FileText} />
        <AdminMetricCard
          title="Productivity Index"
          value={eod ? safeScore(eod.productivity_score) : '—'}
          icon={TrendingUp}
        />
        <AdminMetricCard
          title="Completed Tasks"
          value={eod?.completed_tasks ?? '—'}
          icon={CheckSquare}
        />
        <AdminMetricCard
          title="Logged Hours"
          value={formatSafeDurationFromSeconds(Number(summary.total_time_today) * 60)}
          icon={Clock}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                EOD Summary
              </span>
            </div>
            <Link href="/employee/eod">
              <Button size="sm" variant="outline" className="rounded-lg text-xs h-8">
                Open EOD
              </Button>
            </Link>
          </div>
          {eod ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Report date</span>
                <span className="font-semibold">{eod.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Check-in</span>
                <span className="font-semibold">
                  {eod.login_time ? formatPKDateTime(eod.login_time, { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Total hours</span>
                <span className="font-semibold">
                  {Number.isFinite(Number(eod.total_hours)) ? `${eod.total_hours}h` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Tasks worked</span>
                <span className="font-semibold">{eod.tasks_worked_on}</span>
              </div>
              {eod.manager_comments && (
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-[var(--text-muted)] mb-1">Recent feedback</p>
                  <p className="text-[var(--text-primary)] leading-relaxed line-clamp-3">
                    {eod.manager_comments.replace(/^"|"$/g, '')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="No EOD report"
              description="Generate your end-of-day report to track productivity."
              icon={FileText}
              className="py-6"
              action={
                <Link href="/employee/eod">
                  <Button size="sm" className="rounded-lg text-xs">Generate EOD</Button>
                </Link>
              }
            />
          )}
        </div>

        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Growth Goals
              </span>
            </div>
            <Link href="/employee/growth">
              <Button size="sm" variant="outline" className="rounded-lg text-xs h-8">
                My Growth
              </Button>
            </Link>
          </div>
          {activeGoals.length > 0 ? (
            <ul className="space-y-2">
              {activeGoals.map((g) => (
                <li key={g.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
                  <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">{g.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{g.status.replace('_', ' ')}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No active goals"
              description="Set career goals to track your growth."
              icon={Target}
              className="py-6"
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Recent Daily Notes
          </span>
        </div>
        {recentNotes.length > 0 ? (
          <ul className="space-y-2">
            {recentNotes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-2 text-xs border-b border-[var(--border-subtle)] pb-2 last:border-0">
                <p className="text-[var(--text-primary)] line-clamp-2 min-w-0">{n.content}</p>
                <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{formatNoteDate(n.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">No daily notes recorded yet.</p>
        )}
      </div>
    </div>
  );
}
