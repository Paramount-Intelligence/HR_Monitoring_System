'use client';

import { useEffect, useState } from 'react';
import { dashboardApi, DashboardSummary } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { dutiesApi, Duty } from '@/lib/api/duties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Activity, Clock, CheckSquare, AlertCircle, PlayCircle, Loader2, 
  ShieldCheck, ClipboardCheck, Megaphone, Briefcase, LayoutDashboard,
  ArrowRight, Palmtree, Timer, CheckCircle2, Calendar
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { AnnouncementList } from '@/components/dashboard/announcement-list';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { Skeleton } from '@/components/ui/skeletons';

export default function EmployeeDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [eod, setEod] = useState<EODReport | null>(null);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, myEod, myDuties] = await Promise.all([
          dashboardApi.getEmployeeSummary(),
          eodApi.getMyEOD(),
          dutiesApi.getDailyDuties()
        ]);
        setData(summary);
        setEod(myEod);
        setDuties(myDuties);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const summary = data || {
    attendance_status: 'not_checked_in',
    total_time_today: 0,
    productive_time_today: 0,
    active_timer_task_id: null,
    tasks_in_progress: 0,
    tasks_due_soon: 0,
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const eodStatus = eod ? eod.status : 'Not Started';

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Employee Dashboard</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Pulse Overview</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Daily Overview & Operations</p>
        </div>
        <div className="flex items-center gap-3">
          {summary?.attendance_status !== 'active' ? (
            <Link 
              href="/employee/attendance"
              className={cn(
                buttonVariants({ variant: "default" }), 
                "h-12 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl px-8 shadow-xl transition-all active:scale-95 border-none"
              )}
            >
              Check In
            </Link>
          ) : (
            <Link 
              href="/employee/attendance"
              className="flex items-center gap-3 px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 shadow-sm group hover:bg-emerald-100 transition-all"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">Active Shift Session</span>
              <ArrowRight className="h-4 w-4 opacity-40 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Attendance Status"
          value={summary.attendance_status === 'active' ? 'Online' : 'Offline'}
          icon={Activity}
          color={summary.attendance_status === 'active' ? 'emerald' : 'slate'}
          trend={summary.attendance_status === 'active' ? { value: 'Clocked In', label: 'Shift active', isPositive: true } : { value: 'Standby', label: 'Awaiting check-in', isPositive: false }}
        />
        <KPICard 
          title="Time Aggregate"
          value={formatHours(summary.total_time_today)}
          icon={Timer}
          color="indigo"
          trend={{ value: formatHours(summary.productive_time_today), label: 'Productive work', isPositive: true }}
        />
        <KPICard 
          title="Tasks In Progress"
          value={summary.tasks_in_progress}
          icon={CheckSquare}
          color="amber"
          trend={{ value: 'Task Load', label: 'Active tasks', isPositive: true }}
        />
        <KPICard 
          title="Critical Tasks"
          value={summary.tasks_due_soon}
          icon={AlertCircle}
          color="rose"
          trend={summary.tasks_due_soon > 0 ? { value: 'High Priority', label: 'Due in 48h', isPositive: false } : undefined}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Quick Actions & Compliance */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)]">
              <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">Quick Links</CardTitle>
              <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Quick Dashboard Navigation</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[
                  { href: "/employee/attendance", icon: Clock, label: "Attendance", color: "text-[var(--accent-primary)] bg-[var(--bg-subtle)]", desc: "Shift Logs" },
                  { href: "/employee/time-logs", icon: Timer, label: "Time Tracking", color: "text-emerald-600 bg-emerald-50", desc: "Task Logs" },
                  { href: "/employee/tasks", icon: CheckSquare, label: "My Tasks", color: "text-amber-600 bg-amber-50", desc: "Tasks" },
                  { href: "/employee/duties", icon: ClipboardCheck, label: "Daily Duties", color: "text-rose-600 bg-rose-50", desc: "Checklist" },
                  { href: "/employee/projects", icon: Briefcase, label: "Projects", color: "text-violet-600 bg-violet-50", desc: "Projects" },
                  { href: "/employee/leaves", icon: Palmtree, label: "Leave Hub", color: "text-sky-600 bg-sky-50", desc: "Requests" },
                ].map((action) => (
                  <Link 
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110 group-hover:shadow-lg", action.color)}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">{action.label}</p>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-0.5 opacity-60 tracking-tighter">{action.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--accent-primary)] text-white rounded-[2.5rem] overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10 opacity-10 transition-transform group-hover:scale-110 duration-700">
                <ShieldCheck className="h-40 w-40 rotate-12" />
            </div>
            <CardHeader className="relative z-10 px-10 pt-10 pb-4">
              <CardTitle className="text-2xl font-black tracking-tight">EOD Submission</CardTitle>
              <CardDescription className="text-indigo-100 font-bold opacity-80 uppercase tracking-[0.2em] text-[10px]">End of Day Report</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 px-10 pb-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                      <div className="text-3xl font-black tracking-tighter">{eodStatus}</div>
                    </div>
                    <p className="text-indigo-100 text-sm font-medium opacity-80 max-w-md">
                      {eodStatus === 'Completed' 
                        ? 'Operational summary has been successfully saved to database.' 
                        : 'Your daily intelligence report is pending submission. Ensure all tasks are logged before checkout.'}
                    </p>
                </div>
                <Link 
                  href="/employee/eod" 
                  className={cn(
                    buttonVariants({ variant: "secondary" }), 
                    "bg-white/90 text-[var(--accent-primary)] hover:bg-white font-black text-xs uppercase tracking-widest rounded-2xl px-10 h-14 shadow-xl transition-all active:scale-95 whitespace-nowrap border-none"
                  )}
                >
                  {eodStatus === 'Completed' ? 'View Intel' : 'Initialize Report'}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Status & Announcements */}
        <div className="lg:col-span-4 space-y-8">
          <Card className={cn(
            "border-none shadow-[var(--shadow-soft)] rounded-[2.5rem] transition-all duration-700 overflow-hidden bg-[var(--bg-surface)]",
            summary.active_timer_task_id ? "ring-2 ring-amber-400 shadow-amber-100" : ""
          )}>
            <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)]">
              <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-primary)] tracking-tight">
                <PlayCircle className={cn("h-6 w-6", summary.active_timer_task_id ? "text-amber-500 animate-pulse" : "text-[var(--text-muted)]")} />
                Active Task
              </CardTitle>
              <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Current Active Task</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {summary.active_timer_task_id ? (
                <div className="space-y-6">
                  <div className="p-6 rounded-[2rem] bg-amber-50/50 border border-amber-100 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">In Progress</span>
                    </div>
                    <div className="font-black text-[var(--text-primary)] text-lg leading-tight line-clamp-2">
                      {summary.active_timer_task_title || 'Autonomous Execution'}
                    </div>
                  </div>
                  <Link 
                    href="/employee/time-logs" 
                    className={cn(
                      buttonVariants({ variant: "default" }), 
                      "w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 border-none"
                    )}
                  >
                    Open Control Console
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 space-y-6">
                  <div className="h-16 w-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">No active task running at the moment.</p>
                  <Link 
                    href="/employee/tasks" 
                    className={cn(
                      buttonVariants({ variant: "default" }), 
                      "w-full h-12 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 border-none"
                    )}
                  >
                    Review Objectives
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                  <Megaphone className="h-6 w-6 text-[var(--accent-primary)]" />
                  Broadcasts
                </CardTitle>
                <Badge className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-none rounded-lg font-black text-[9px] px-2 py-0.5 uppercase tracking-widest">Latest</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[400px] scrollbar-hide">
              <AnnouncementList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10 pb-20 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-48 rounded-2xl" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-[2.5rem]" />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-12">
        <Skeleton className="lg:col-span-8 h-[500px] rounded-[2.5rem]" />
        <Skeleton className="lg:col-span-4 h-[500px] rounded-[2.5rem]" />
      </div>
    </div>
  );
}
