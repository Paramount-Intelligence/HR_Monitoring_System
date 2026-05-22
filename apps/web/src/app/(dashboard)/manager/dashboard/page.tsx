'use client';

import { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { tasksApi, Task } from '@/lib/api/tasks';
import { leavesApi } from '@/lib/api/leaves';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Users, Activity, ClipboardCheck, ShieldCheck, AlertCircle,
  Megaphone, Clock, CheckSquare, TrendingUp,
  Calendar, ChevronRight,
  Briefcase, UserCheck, BarChart3,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface TeamMemberStatus {
  id: string;
  name: string;
  role: string;
  status: 'present' | 'late' | 'on_leave' | 'absent';
  checkInTime?: string;
  workMode?: string;
}

interface ActivityItem {
  id: string;
  type: 'check_in' | 'task' | 'eod' | 'leave';
  person: string;
  description: string;
  time: string;
  color: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(iso);
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const ELIGIBLE_ROLES = ['admin', 'hr_operations', 'manager', 'team_lead', 'employee', 'junior_employee', 'intern'];

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: TeamMemberStatus['status'] }) {
  const map = {
    present:  { label: 'Present',  bg: 'bg-[var(--status-success-bg)]', text: 'text-[var(--status-success-text)]', dot: 'bg-[var(--status-success-text)]' },
    late:     { label: 'Late',     bg: 'bg-[var(--status-warning-bg)]', text: 'text-[var(--status-warning-text)]', dot: 'bg-[var(--status-warning-text)]' },
    on_leave: { label: 'On Leave', bg: 'bg-[var(--status-info-bg)]', text: 'text-[var(--status-info-text)]', dot: 'bg-[var(--status-info-text)]' },
    absent:   { label: 'Absent',   bg: 'bg-[var(--status-danger-bg)]', text: 'text-[var(--status-danger-text)]', dot: 'bg-[var(--status-danger-text)]' },
  } as const;

  const s = map[status] ?? map.present;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

function StitchKPICard({
  icon: Icon,
  label,
  value,
  sub,
  accent = '#1565C0',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="app-surface-elevated rounded-[1.25rem] flex items-center gap-0 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-shrink-0 w-16 h-full min-h-[80px] flex items-center justify-center bg-[var(--bg-subtle)] border-r border-[var(--border-default)]">
        <Icon className="h-6 w-6 text-[var(--accent-primary)]" />
      </div>
      <div className="flex-1 px-5 py-4">
        <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.18em] leading-none mb-1.5">{label}</p>
        <p className="text-2xl font-black text-[var(--text-primary)] leading-none">{value}</p>
        {sub && <p className="text-[10px] font-bold text-[var(--text-secondary)] mt-1.5 uppercase tracking-wider">{sub}</p>}
      </div>
    </div>
  );
}

function StitchCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('app-surface-elevated rounded-[1.25rem] overflow-hidden shadow-sm', className)}>
      {children}
    </div>
  );
}

function StitchCardHeader({ title, badge, link, linkLabel }: {
  title: string;
  badge?: string | number;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex items-center gap-2.5">
        <p className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.18em]">{title}</p>
        {badge !== undefined && badge !== 0 && (
          <span className="h-5 min-w-[20px] px-1.5 bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[9px] font-black rounded-full flex items-center justify-center border border-[var(--border-default)]">
            {badge}
          </span>
        )}
      </div>
      {link && linkLabel && (
        <Link href={link} className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest hover:underline flex items-center gap-1">
          {linkLabel} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function ManagerDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [eods, setEods] = useState<EODReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamSessions, setTeamSessions] = useState<AttendanceSession[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<AttendanceSession[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [
          summaryData, eodsData, projectsData, meData,
          allUsers, tasksData, sessionsData, leavesData,
          correctionsData, announcementsData,
        ] = await Promise.allSettled([
          dashboardApi.getManagerSummary(),
          eodApi.getTeamEODs(),
          projectsApi.getProjects(),
          usersApi.getMe(),
          usersApi.getUsers({ status: 'active' }),
          tasksApi.getTasks(),
          attendanceApi.getTeamSessions(),
          leavesApi.getPendingQueue(),
          attendanceApi.getPendingCorrections(),
          announcementsApi.getAnnouncements(),
        ]);

        if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
        if (eodsData.status === 'fulfilled') setEods(eodsData.value);
        if (projectsData.status === 'fulfilled') setProjects(projectsData.value);
        if (meData.status === 'fulfilled') setCurrentUser(meData.value);
        if (allUsers.status === 'fulfilled') setTeamUsers((allUsers.value as any) || []);
        if (tasksData.status === 'fulfilled') setTasks(tasksData.value);
        if (sessionsData.status === 'fulfilled') setTeamSessions(sessionsData.value);
        if (leavesData.status === 'fulfilled') setPendingLeaves(leavesData.value);
        if (correctionsData.status === 'fulfilled') setPendingCorrections(correctionsData.value);
        if (announcementsData.status === 'fulfilled') setAnnouncements(announcementsData.value);
      } catch (e) {
        console.error('Failed to load manager dashboard', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  /* ── Derived data ───────────────────────────────────────────────── */
  const sumData = summary || {
    team_members_active: 0, pending_approvals: 0,
    overdue_tasks: 0, blocked_tasks: 0, team_attendance_today: [],
  };

  const pendingEods = eods.filter(e => e.status === 'Pending Approval');
  const submittedEods = eods.filter(e => e.status !== 'Draft');

  const myProjects = projects.filter(p => p.manager_id === currentUser?.id || !currentUser);
  const pendingProjects = myProjects.filter(p =>
    p.approval_status === 'pending' ||
    (p.project_status === 'pending_approval' || p.project_status === 'draft')
  );

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'reviewed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Team health score (out of 100, lower blockers = higher score)
  const healthDeduction = Math.min(50, (blockedTasks * 10) + (sumData.overdue_tasks * 5));
  const healthScore = Math.max(0, 100 - healthDeduction);
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'At Risk';
  const healthColor = healthScore >= 80
    ? 'var(--status-success-text)'
    : healthScore >= 60
      ? 'var(--accent-primary)'
      : healthScore >= 40
        ? 'var(--status-warning-text)'
        : 'var(--status-danger-text)';

  // Team attendance snapshot — build from summary data or team sessions
  const teamAttendanceToday: TeamMemberAttendanceItem[] = (sumData.team_attendance_today || []).map((m: any) => {
    let status: TeamMemberStatus['status'] = 'absent';
    let checkInTime: string | undefined;
    if (m.checked_in) {
      const checkIn = m.check_in_at ? new Date(m.check_in_at) : null;
      const cutoff = new Date();
      cutoff.setHours(9, 30, 0, 0);
      status = checkIn && checkIn > cutoff ? 'late' : 'present';
      checkInTime = m.check_in_at;
    }
    return {
      id: m.user_id,
      name: m.full_name,
      role: '',
      status,
      checkInTime,
      workMode: m.work_mode,
    };
  });

  // Activity feed — compose from EODs, team sessions
  const activityFeed: ActivityItem[] = [
    ...eods.filter(e => e.status !== 'Draft').slice(0, 3).map(e => ({
      id: `eod-${e.id}`,
      type: 'eod' as const,
      person: e.user_name,
      description: 'submitted EOD report',
      time: e.updated_at,
      color: 'var(--accent-secondary)',
    })),
    ...teamAttendanceToday.filter(m => m.status === 'present' || m.status === 'late').slice(0, 4).map(m => ({
      id: `checkin-${m.id}`,
      type: 'check_in' as const,
      person: m.name,
      description: m.status === 'late' ? 'checked in (late)' : 'checked in',
      time: m.checkInTime || new Date().toISOString(),
      color: m.status === 'late' ? 'var(--status-warning-text)' : 'var(--status-success-text)',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

  // Members needing attention
  const needsAttention = teamAttendanceToday.filter(m => m.status === 'absent' || m.status === 'late').slice(0, 5);

  // Upcoming deadlines
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 86400000);
  const upcomingTasks = tasks
    .filter(t => t.due_date && new Date(t.due_date) <= in7Days && new Date(t.due_date) >= today && t.status !== 'completed' && t.status !== 'reviewed')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const pendingApprovalsCount = pendingLeaves.length + pendingCorrections.length + pendingProjects.length;

  /* ── Loading skeleton ───────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-12 bg-[var(--bg-subtle)] rounded-2xl w-64" />
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-[var(--bg-subtle)] rounded-[1.25rem] border border-[var(--border-default)]" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-3 h-96 bg-[var(--bg-subtle)] rounded-[1.25rem] border border-[var(--border-default)]" />
          <div className="lg:col-span-6 space-y-5">
            <div className="h-44 bg-[var(--bg-subtle)] rounded-[1.25rem] border border-[var(--border-default)]" />
            <div className="h-44 bg-[var(--bg-subtle)] rounded-[1.25rem] border border-[var(--border-default)]" />
          </div>
          <div className="lg:col-span-3 h-96 bg-[var(--bg-subtle)] rounded-[1.25rem] border border-[var(--border-default)]" />
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto app-page text-[var(--text-primary)]">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="app-copy-weak uppercase tracking-[0.2em] mb-1">Manager Portal</p>
          <h1 className="app-title">Manager Dashboard</h1>
          <p className="app-copy mt-0.5">
            Team performance, approvals, and operational overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/manager/team"
            className="inline-flex items-center gap-2 btn-primary text-[11px] font-black uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl transition-colors"
          >
            <Users className="h-4 w-4" />
            Team Members
          </Link>
          <Link
            href="/manager/reports"
            className="inline-flex items-center gap-2 btn-secondary text-[11px] font-black uppercase tracking-[0.15em] px-5 py-2.5 rounded-xl transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StitchKPICard
          icon={Users}
          label="Active Team Members"
          value={sumData.team_members_active}
          sub="Currently present today"
        />
        <StitchKPICard
          icon={ClipboardCheck}
          label="Pending Approvals"
          value={pendingApprovalsCount}
          sub={`${pendingLeaves.length} leaves · ${pendingCorrections.length} corrections`}
          accent="#F59E0B"
        />
        <StitchKPICard
          icon={ShieldCheck}
          label={`EOD Reports`}
          value={`${submittedEods.length}/${pendingEods.length}`}
          sub={`${submittedEods.length} submitted · ${pendingEods.length} pending`}
          accent="#6366F1"
        />
        <StitchKPICard
          icon={AlertCircle}
          label="Blocked Tasks"
          value={sumData.blocked_tasks}
          sub={`${sumData.overdue_tasks} overdue tasks`}
          accent="#E05A5A"
        />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* Column 1 — Team Attendance Snapshot */}
        <div className="lg:col-span-3">
          <StitchCard className="h-full">
            <StitchCardHeader
              title="Attendance Snapshot"
              badge={teamAttendanceToday.length}
              link="/manager/approvals"
              linkLabel="Full View"
            />
            <div className="p-4 space-y-2.5 max-h-[520px] overflow-y-auto">
              {teamAttendanceToday.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-8 w-8 text-[var(--text-secondary)]/40 mx-auto mb-3" />
                  <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">No team data</p>
                </div>
              ) : (
                teamAttendanceToday.map(member => (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors bg-[var(--bg-elevated)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[10px] font-black text-[var(--text-primary)] shrink-0">
                        {initials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-none">{member.name}</p>
                        {member.checkInTime && (
                          <p className="text-[9px] font-semibold text-[var(--text-secondary)] mt-0.5">{fmtTime(member.checkInTime)}</p>
                        )}
                      </div>
                    </div>
                    <StatusPill status={member.status} />
                  </div>
                ))
              )}
            </div>
            {/* Attendance summary footer */}
            <div className="border-t border-[var(--border-subtle)] px-4 py-3 grid grid-cols-4 gap-0 bg-[var(--bg-surface)]">
              {(['present','late','on_leave','absent'] as const).map(s => {
                const count = teamAttendanceToday.filter(m => m.status === s).length;
                const colors: Record<string, string> = { present: 'var(--status-success-text)', late: 'var(--status-warning-text)', on_leave: 'var(--status-info-text)', absent: 'var(--status-danger-text)' };
                const labels: Record<string, string> = { present: 'In', late: 'Late', on_leave: 'Leave', absent: 'Out' };
                return (
                  <div key={s} className="text-center">
                    <p className="text-base font-black" style={{ color: `var(${colors[s]})` }}>{count}</p>
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">{labels[s]}</p>
                  </div>
                );
              })}
            </div>
          </StitchCard>
        </div>

        {/* Column 2 — Middle (Tasks + Approvals + Projects) */}
        <div className="lg:col-span-5 space-y-5">

          {/* Task Progress */}
          <StitchCard>
            <StitchCardHeader title="Task Progress" link="/manager/tasks" linkLabel="All Tasks" />
            <div className="p-5">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-5xl font-black text-[var(--text-primary)] leading-none">{taskCompletionRate}<span className="text-2xl text-[var(--text-secondary)]">%</span></p>
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider mt-1">Completion Rate</p>
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">In Progress</span>
                    <span className="text-sm font-black text-[var(--status-info-text)]">{inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Completed</span>
                    <span className="text-sm font-black text-[var(--status-success-text)]">{completedTasks}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Total</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{totalTasks}</span>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-3 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-700"
                  style={{ width: `${taskCompletionRate}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
              {/* SVG Sparkline */}
              <div className="mt-4 h-14 w-full">
                <svg width="100%" height="100%" viewBox="0 0 200 56" preserveAspectRatio="none" className="overflow-visible">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--text-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 45 C 30 40 40 30 70 28 S 110 20 140 22 S 175 18 200 12"
                    fill="none"
                    stroke="var(--text-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 0 45 C 30 40 40 30 70 28 S 110 20 140 22 S 175 18 200 12 L 200 56 L 0 56 Z"
                    fill="url(#sparkGrad)"
                  />
                </svg>
              </div>
            </div>
          </StitchCard>

          {/* Pending Approvals */}
          <StitchCard>
            <StitchCardHeader
              title="Pending Approvals"
              badge={pendingApprovalsCount}
              link="/manager/approvals"
              linkLabel="Review All"
            />
            <div className="p-4 space-y-2">
              {pendingApprovalsCount === 0 ? (
                <div className="py-8 text-center">
                  <CheckSquare className="h-7 w-7 text-[var(--status-success-text)] mx-auto mb-2" />
                  <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">All clear — no pending items</p>
                </div>
              ) : (
                <>
                  {pendingLeaves.slice(0, 2).map((leave: any) => (
                    <div key={leave.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] hover:border-[var(--status-warning-text)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-[var(--status-warning-text)] flex items-center justify-center">
                          <Palmtree className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] leading-none">Leave Request</p>
                          <p className="text-[9px] font-semibold text-[var(--text-secondary)] mt-0.5 uppercase">{leave.leave_type}</p>
                        </div>
                      </div>
                      <Link href="/manager/approvals" className="text-[9px] font-black text-[var(--status-warning-text)] uppercase tracking-widest hover:underline">Review</Link>
                    </div>
                  ))}
                  {pendingCorrections.slice(0, 2).map((corr) => (
                    <div key={corr.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] hover:border-[var(--status-info-text)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-[var(--status-info-text)] flex items-center justify-center">
                          <Clock className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] leading-none">Attendance Correction</p>
                          <p className="text-[9px] font-semibold text-[var(--text-secondary)] mt-0.5 uppercase">Pending review</p>
                        </div>
                      </div>
                      <Link href="/manager/approvals" className="text-[9px] font-black text-[var(--status-info-text)] uppercase tracking-widest hover:underline">Review</Link>
                    </div>
                  ))}
                  {pendingProjects.slice(0, 1).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center">
                          <Briefcase className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[140px] leading-none">{project.title}</p>
                          <p className="text-[9px] font-semibold text-[var(--text-secondary)] mt-0.5 uppercase">Project proposal</p>
                        </div>
                      </div>
                      <Link href={`/manager/projects/${project.id}`} className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest hover:underline">Review</Link>
                    </div>
                  ))}
                </>
              )}
            </div>
          </StitchCard>

          {/* EOD Reports Queue */}
          <StitchCard>
            <StitchCardHeader
              title="EOD Review Queue"
              badge={pendingEods.length}
              link="/manager/eod-reviews"
              linkLabel="Process All"
            />
            <div className="p-4 space-y-2">
              {pendingEods.length === 0 ? (
                <div className="py-6 text-center">
                  <ShieldCheck className="h-7 w-7 text-[var(--status-success-text)] mx-auto mb-2" />
                  <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">EOD queue fully processed</p>
                </div>
              ) : (
                pendingEods.slice(0, 3).map(eod => (
                  <div key={eod.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors bg-[var(--bg-elevated)]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-[9px] font-black text-white shrink-0">
                        {initials(eod.user_name)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)] leading-none">{eod.user_name}</p>
                        <p className="text-[9px] font-semibold text-[var(--text-secondary)] mt-0.5 capitalize">{eod.work_mode} · {eod.total_hours.toFixed(1)}h</p>
                      </div>
                    </div>
                    <Link
                      href={`/manager/eod-reviews?id=${eod.id}`}
                      className="text-[9px] font-black text-[var(--accent-secondary)] uppercase tracking-widest hover:underline flex items-center gap-0.5"
                    >
                      Review <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </StitchCard>
        </div>

        {/* Column 3 — Today's Team Activity + Announcements */}
        <div className="lg:col-span-4 space-y-5">

          {/* Team Activity Feed */}
          <StitchCard>
            <StitchCardHeader title="Today's Team Activity" />
            <div className="p-4 space-y-0">
              {activityFeed.length === 0 ? (
                <div className="py-10 text-center">
                  <Activity className="h-8 w-8 text-[var(--text-secondary)]/40 mx-auto mb-3" />
                  <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">No activity yet today</p>
                </div>
              ) : (
                activityFeed.map((item, idx) => (
                  <div key={item.id} className="flex gap-3 relative">
                    {/* Timeline line */}
                    {idx < activityFeed.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--border-default)]" />
                    )}
                    <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 relative z-10 bg-[var(--bg-subtle)]" style={{ color: item.color }}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    </div>
                    <div className="flex-1 pb-3.5 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                        <span className="font-black">{item.person}</span>
                        {' '}<span className="font-semibold text-[var(--text-secondary)]">{item.description}</span>
                      </p>
                      <p className="text-[9px] font-semibold text-[var(--text-secondary)] mt-0.5">{timeAgo(item.time)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </StitchCard>

          {/* Announcements */}
          <StitchCard>
            <StitchCardHeader title="Announcements" badge={announcements.length} />
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="py-6 text-center">
                  <Megaphone className="h-7 w-7 text-[var(--text-secondary)]/40 mx-auto mb-2" />
                  <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">No announcements</p>
                </div>
              ) : (
                announcements.slice(0, 3).map(ann => (
                  <div key={ann.id} className="p-3 rounded-xl border-l-[3px] border-[var(--accent-primary)] bg-[var(--bg-surface)]">
                    <p className="text-xs font-black text-[var(--text-primary)] leading-snug">{ann.title}</p>
                    <p className="text-[10px] font-semibold text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">{ann.content}</p>
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] mt-1.5">{timeAgo(ann.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </StitchCard>

          {/* Quick Actions */}
          <StitchCard>
            <StitchCardHeader title="Quick Actions" />
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {[
                { label: 'Assign Task',    icon: CheckSquare, href: '/manager/tasks',   color: '#1565C0' },
                { label: 'My Attendance',  icon: Clock,       href: '/manager/my-attendance', color: '#10B981' },
                { label: 'View Projects',  icon: Briefcase,   href: '/manager/projects', color: '#6366F1' },
                { label: 'EOD Review',     icon: ShieldCheck, href: '/manager/eod-reviews', color: '#F59E0B' },
              ].map(action => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-[2px] border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)] hover:shadow-sm transition-all text-center group"
                >
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-[var(--bg-subtle)]">
                    <action.icon className="h-4.5 w-4.5 text-[var(--accent-primary)]" />
                  </div>
                  <span className="text-[9px] font-black text-[var(--text-primary)] uppercase tracking-[0.15em] leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </StitchCard>

          {/* Team Health */}
          <StitchCard>
            <StitchCardHeader title="Team Health" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-4xl font-black leading-none" style={{ color: healthColor }}>{healthScore}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: healthColor }}>{healthLabel}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--status-danger-text)]" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">{blockedTasks} Blocked</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--status-warning-text)]" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">{sumData.overdue_tasks} Overdue</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[var(--status-success-text)]" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">{sumData.team_members_active} Active</span>
                  </div>
                </div>
              </div>
              {/* Health trend curve */}
              <div className="h-12 w-full">
                <svg width="100%" height="100%" viewBox="0 0 200 48" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={healthColor} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={healthColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 38 C 25 35 40 20 70 18 S 110 15 140 20 S 170 16 200 10"
                    fill="none"
                    stroke={healthColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 0 38 C 25 35 40 20 70 18 S 110 15 140 20 S 170 16 200 10 L 200 48 L 0 48 Z"
                    fill="url(#healthGrad)"
                  />
                </svg>
              </div>
            </div>
          </StitchCard>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

        {/* My Quick Access */}
        <StitchCard>
          <StitchCardHeader title="My Workspace" />
          <div className="p-4 space-y-2">
            {[
              { label: 'My Attendance', sub: 'Personal records', href: '/manager/my-attendance', icon: Clock, color: '#1565C0' },
              { label: 'My Tasks', sub: 'Assigned to me', href: '/manager/my-tasks', icon: CheckSquare, color: '#10B981' },
              { label: 'My EOD', sub: 'End-of-day report', href: '/manager/my-eod', icon: ShieldCheck, color: '#F59E0B' },
              { label: 'My Growth', sub: 'Skills & reviews', href: '/manager/growth', icon: TrendingUp, color: '#6366F1' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-sm transition-all group"
              >
                <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-[var(--bg-subtle)]">
                  <item.icon className="h-4 w-4 text-[var(--accent-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-[10px] font-semibold text-[var(--text-secondary)]">{item.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </StitchCard>

        {/* Team Members Needing Attention */}
        <StitchCard>
          <StitchCardHeader title="Needs Attention" badge={needsAttention.length} />
          <div className="p-4 space-y-2">
            {needsAttention.length === 0 ? (
              <div className="py-8 text-center">
                <UserCheck className="h-8 w-8 text-[var(--status-success-text)] mx-auto mb-3" />
                <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">All team members are accounted for</p>
              </div>
            ) : (
              needsAttention.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
                  <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[10px] font-black text-[var(--text-primary)] shrink-0">
                    {initials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">{member.name}</p>
                  </div>
                  <StatusPill status={member.status} />
                </div>
              ))
            )}
          </div>
        </StitchCard>

        {/* Upcoming Deadlines */}
        <StitchCard>
          <StitchCardHeader title="Upcoming Deadlines" badge={upcomingTasks.length} link="/manager/tasks" linkLabel="All Tasks" />
          <div className="p-4 space-y-2">
            {upcomingTasks.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="h-8 w-8 text-[var(--text-secondary)]/40 mx-auto mb-3" />
                <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">No upcoming deadlines this week</p>
              </div>
            ) : (
              upcomingTasks.map(task => {
                const dueDate = new Date(task.due_date!);
                const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
                const isUrgent = daysLeft <= 2;
                return (
                  <div key={task.id} className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-colors bg-[var(--bg-elevated)]',
                    isUrgent ? 'border-[var(--status-danger-border)]' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                  )}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn('h-2 w-2 rounded-full shrink-0', isUrgent ? 'bg-[var(--status-danger-text)]' : 'bg-[var(--accent-primary)]')} />
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{task.title}</p>
                    </div>
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ml-2',
                      isUrgent ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]' : 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                    )}>
                      {daysLeft}d
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </StitchCard>
      </div>
    </div>
  );
}

// Local interface needed for attendance snapshot
interface TeamMemberAttendanceItem {
  id: string;
  name: string;
  role: string;
  status: 'present' | 'late' | 'on_leave' | 'absent';
  checkInTime?: string;
  workMode?: string;
}

// Missing icon stub (Palmtree not available in lucide-react consistently)
function Palmtree({ className }: { className?: string }) {
  return <span className={cn('font-black text-white text-xs', className)}>L</span>;
}
