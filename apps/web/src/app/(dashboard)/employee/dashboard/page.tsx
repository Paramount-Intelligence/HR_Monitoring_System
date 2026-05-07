'use client';

import { useEffect, useState } from 'react';
import { dashboardApi, DashboardSummary } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { dutiesApi, Duty } from '@/lib/api/duties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Clock, CheckSquare, AlertCircle, PlayCircle, Loader2, ShieldCheck, ClipboardCheck, Megaphone, Briefcase } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { AnnouncementList } from '@/components/dashboard/announcement-list';

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
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  // Provide safe defaults if backend fails or returns empty
  const summary = data || {
    attendance_status: 'Not Checked In',
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
  const completedDuties = duties.filter(d => d.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Here's your activity for today.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{(summary?.attendance_status || 'not_checked_in').replace('_', ' ')}</div>
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {summary?.attendance_status === 'active' 
                        ? <span className="text-emerald-600 font-medium">Currently clocked in</span>
                        : 'Ready to work?'}
                    </p>
                    <Link 
                      href="/employee/attendance"
                      className={cn(buttonVariants({ variant: summary?.attendance_status === 'active' ? "outline" : "default", size: "sm" }), summary?.attendance_status === 'active' ? "text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700" : "bg-blue-600 hover:bg-blue-700")}
                    >
                      {summary?.attendance_status === 'active' ? 'Check Out' : 'Check In'}
                    </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Logged Today</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(summary.total_time_today)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatHours(summary.productive_time_today)} productive time
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks In Progress</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.tasks_in_progress}</div>
                <p className="text-xs text-muted-foreground mt-1">Active tasks on your plate</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{summary.tasks_due_soon}</div>
                <p className="text-xs text-amber-600/80 mt-1">Tasks due within 48 hours</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common things you might want to do</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Link 
                    href="/employee/attendance"
                    className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
                  >
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Attendance</span>
                  </Link>
                  <Link 
                    href="/employee/time-logs"
                    className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
                  >
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Time Tracking</span>
                  </Link>
                  <Link 
                    href="/employee/tasks"
                    className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
                  >
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Tasks</span>
                  </Link>
                  <Link 
                    href="/employee/duties"
                    className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
                  >
                    <ClipboardCheck className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Duties</span>
                  </Link>
                  <Link 
                    href="/employee/projects"
                    className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
                  >
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Projects</span>
                  </Link>
                  <Link 
                    href="/employee/growth"
                    className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
                  >
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span className="text-xs font-medium">Notes & Goals</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-blue-100 bg-blue-50/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">EOD Status</CardTitle>
                <ShieldCheck className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-blue-700 truncate">{eodStatus}</div>
                <Link href="/employee/eod" className="text-xs text-blue-600/80 mt-1 hover:underline">
                  View EOD &rarr;
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-blue-100 bg-blue-50/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                  Announcements
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AnnouncementList />
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-600" />
                Active Timer
              </CardTitle>
              <CardDescription>Your current tracking session</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.active_timer_task_id ? (
                <div className="text-center py-4">
                  <div className="text-sm text-slate-500 mb-1">Tracking Task</div>
                  <div className="font-medium text-slate-900 mb-4">
                    {summary.active_timer_task_title || summary.active_timer_task_id || 'Active Task'}
                  </div>
                  <Link 
                    href="/employee/time-logs" 
                    className={cn(buttonVariants({ variant: "default" }), "bg-rose-600 hover:bg-rose-700 text-white")}
                  >
                    Stop Timer
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <p className="mb-4 text-sm">No timer is currently running.</p>
                  <Link 
                    href="/employee/tasks" 
                    className={cn(buttonVariants({ variant: "default" }), "bg-blue-600 hover:bg-blue-700 text-white")}
                  >
                    Start a Task
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
