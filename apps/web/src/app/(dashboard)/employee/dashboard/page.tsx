'use client';

import { useEffect, useState } from 'react';
import { dashboardApi, DashboardSummary } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { dutiesApi, Duty } from '@/lib/api/duties';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Clock, CheckSquare, AlertCircle, PlayCircle, Loader2, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Here's your activity for today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                href="/employee/growth"
                className={cn(buttonVariants({ variant: "outline" }), "h-20 flex flex-col items-center justify-center gap-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600 border-slate-200")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                <span className="text-xs font-medium">Notes & Goals</span>
              </Link>
            </div>
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
                <div className="font-medium text-slate-900 mb-4">{summary.active_timer_task_id}</div>
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

        {/* Duties Section */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Daily Duties</CardTitle>
              <CardDescription>Your regular responsibilities</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-slate-100">
              {completedDuties} / {duties.length} Done
            </Badge>
          </CardHeader>
          <CardContent>
            {duties.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center border rounded-lg border-dashed">
                No duties recorded for today.
              </div>
            ) : (
              <div className="space-y-3">
                {duties.slice(0, 3).map((duty) => (
                  <div key={duty.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="mt-0.5">
                      {duty.status === 'completed' ? (
                        <div className="h-4 w-4 rounded-full border-2 border-emerald-500 bg-emerald-500 flex items-center justify-center">
                          <CheckSquare className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", duty.status === 'completed' ? "text-slate-500 line-through" : "text-slate-900")}>
                        {duty.title}
                      </p>
                      {duty.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{duty.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {duties.length > 3 && (
                  <Link href="/employee/duties" className="block text-center text-sm text-blue-600 hover:underline pt-2">
                    View all {duties.length} duties
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* EOD Summary Section */}
        <Card className="shadow-sm border-blue-100">
          <CardHeader>
            <CardTitle>End of Day Summary</CardTitle>
            <CardDescription>Auto-generated report based on your activity</CardDescription>
          </CardHeader>
          <CardContent>
            {eod ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div>
                    <p className="text-xs text-slate-500">Current Status</p>
                    <p className="text-sm font-medium text-slate-900">{eod.status}</p>
                  </div>
                  {eod.status === 'Needs Revision' && (
                    <Badge variant="destructive">Action Required</Badge>
                  )}
                  {eod.status === 'Approved' && (
                    <Badge className="bg-emerald-500">Approved</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">Time Logged</span>
                    <span className="font-medium">{eod.total_hours}h</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Tasks</span>
                    <span className="font-medium">{eod.completed_tasks} completed / {eod.pending_tasks} pending</span>
                  </div>
                </div>

                {eod.manager_comments && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Manager Feedback:</p>
                    <p className="text-sm text-amber-900">{eod.manager_comments}</p>
                  </div>
                )}

                <div className="pt-2">
                  <Link 
                    href="/employee/eod" 
                    className={cn(buttonVariants({ variant: "default" }), "w-full bg-blue-600 hover:bg-blue-700")}
                  >
                    View & Manage EOD
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 border rounded-lg border-dashed">
                <p className="mb-2 text-sm">EOD report not generated yet.</p>
                <p className="text-xs">It will automatically compile your attendance, tasks, and duties.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
