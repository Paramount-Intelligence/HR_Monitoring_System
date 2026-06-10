'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, DashboardSummary } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { tasksApi, Task } from '@/lib/api/tasks';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { timeLogsApi, TaskTimerSession } from '@/lib/api/timeLogs';
import { meetingsApi, Meeting } from '@/lib/api/meetings';
import { notificationsApi, Notification } from '@/lib/api/notifications';
import { growthApi, Goal, Note } from '@/lib/api/growth';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import {
  EmployeeDashboardTabs,
  EmployeeDashboardTabId,
} from '@/components/employee/dashboard/EmployeeDashboardTabs';
import { EmployeeOverviewTab } from '@/components/employee/dashboard/EmployeeOverviewTab';
import { EmployeeWorkTasksTab } from '@/components/employee/dashboard/EmployeeWorkTasksTab';
import { EmployeeAttendanceTab } from '@/components/employee/dashboard/EmployeeAttendanceTab';
import { EmployeeProductivityTab } from '@/components/employee/dashboard/EmployeeProductivityTab';
import { Skeleton } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from 'sonner';
import { LayoutDashboard, ArrowRight, RefreshCcw } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';

const EMPTY_SUMMARY: DashboardSummary = {
  attendance_status: 'not_checked_in',
  total_time_today: 0,
  productive_time_today: 0,
  active_timer_task_id: null,
  active_timer_task_title: null,
  tasks_in_progress: 0,
  tasks_due_soon: 0,
};

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<EmployeeDashboardTabId>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [eod, setEod] = useState<EODReport | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [activeTimer, setActiveTimer] = useState<TaskTimerSession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSession | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [shiftName, setShiftName] = useState<string | null>(null);
  const [shiftTiming, setShiftTiming] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadCore = useCallback(async () => {
    const [summaryRes, eodRes, userRes] = await Promise.allSettled([
      dashboardApi.getEmployeeSummary(),
      eodApi.getMyEOD(),
      apiClient.get('/users/me'),
    ]);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
    else setSummary(EMPTY_SUMMARY);
    if (eodRes.status === 'fulfilled') setEod(eodRes.value);
    if (userRes.status === 'fulfilled') {
      setShiftName(userRes.value.data?.shift_name ?? null);
      setShiftTiming(userRes.value.data?.shift_timing ?? null);
    }
  }, []);

  const loadOverviewExtras = useCallback(async () => {
    const [meetingsRes, notifRes, unreadRes] = await Promise.allSettled([
      meetingsApi.getUpcomingMeetings(),
      notificationsApi.getNotifications(10),
      notificationsApi.getUnreadCount(),
    ]);
    if (meetingsRes.status === 'fulfilled') setMeetings(meetingsRes.value || []);
    if (notifRes.status === 'fulfilled') setNotifications(notifRes.value || []);
    if (unreadRes.status === 'fulfilled') setUnreadCount(unreadRes.value?.count ?? 0);
  }, []);

  const loadWorkData = useCallback(async () => {
    const [tasksRes, timerRes, attRes] = await Promise.allSettled([
      tasksApi.getTasks(),
      timeLogsApi.getActiveTimer(),
      apiClient.get<AttendanceSession | null>('/attendance/active'),
    ]);
    if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value || []);
    if (timerRes.status === 'fulfilled') setActiveTimer(timerRes.value);
    if (attRes.status === 'fulfilled') setAttendance(attRes.value.data);
  }, []);

  const loadAttendanceData = useCallback(async () => {
    const res = await attendanceApi.getMySessions();
    setSessions(res || []);
  }, []);

  const loadProductivityData = useCallback(async () => {
    const [goalsRes, notesRes, eodRes] = await Promise.allSettled([
      growthApi.getGoals(),
      growthApi.getNotes(),
      eodApi.getMyEOD(),
    ]);
    if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value || []);
    if (notesRes.status === 'fulfilled') setNotes(notesRes.value || []);
    if (eodRes.status === 'fulfilled') setEod(eodRes.value);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadCore(),
        loadOverviewExtras(),
        loadWorkData(),
        loadAttendanceData(),
        loadProductivityData(),
      ]);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error('[EmployeeDashboard]', e);
    } finally {
      setIsLoading(false);
    }
  }, [loadCore, loadOverviewExtras, loadWorkData, loadAttendanceData, loadProductivityData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (activeTab === 'work') loadWorkData();
    if (activeTab === 'attendance') loadAttendanceData();
    if (activeTab === 'productivity') loadProductivityData();
    if (activeTab === 'overview') loadOverviewExtras();
  }, [activeTab, loadWorkData, loadAttendanceData, loadProductivityData, loadOverviewExtras]);

  const data = summary ?? EMPTY_SUMMARY;
  const isCheckedIn = !!attendance && attendance.session_status === 'active';

  const upcomingMeeting =
    meetings
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] ?? null;

  const handleStartTimer = async (taskId: string) => {
    if (!isCheckedIn) {
      toast.error('You must check in before starting a task.');
      return;
    }
    setIsActionLoading(taskId);
    try {
      await timeLogsApi.startTimer(taskId);
      toast.success('Task timer started');
      await loadWorkData();
      await loadCore();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handlePauseTimer = async (taskId: string) => {
    setIsActionLoading(taskId);
    try {
      await timeLogsApi.pauseTimer(taskId);
      toast.success('Task timer paused');
      await loadWorkData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleResumeTimer = async (taskId: string) => {
    if (!isCheckedIn) {
      toast.error('You must check in before resuming a task.');
      return;
    }
    setIsActionLoading(taskId);
    try {
      await timeLogsApi.resumeTimer(taskId);
      toast.success('Task timer resumed');
      await loadWorkData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleStopTimer = async (taskId: string) => {
    setIsActionLoading(taskId);
    try {
      await timeLogsApi.stopTimer(taskId);
      toast.success('Task timer saved');
      await loadWorkData();
      await loadCore();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(null);
    }
  };

  const formatDueDate = (due: string | null) => {
    if (!due) return '—';
    const d = parseISO(due);
    if (!isValid(d)) return '—';
    return format(d, 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <EmployeePageShell>
        <Skeleton className="h-12 w-80 rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </EmployeePageShell>
    );
  }

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="Employee Dashboard"
        subtitle="Daily workspace, tasks, attendance, and productivity"
        icon={LayoutDashboard}
        actions={
          <>
            {data.attendance_status !== 'active' ? (
              <Link
                href="/employee/attendance"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'rounded-lg text-xs font-semibold px-4'
                )}
              >
                Check In
              </Link>
            ) : (
              <Link
                href="/employee/attendance"
                className="flex items-center gap-2 rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-3 py-2 text-xs font-semibold text-[var(--status-success-text)] hover:opacity-90 transition-all"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Shift
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-[var(--border-default)] bg-[var(--bg-elevated)] text-xs"
              onClick={loadAll}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </>
        }
      />

      <EmployeeDashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pt-1">
        {activeTab === 'overview' && (
          <EmployeeOverviewTab
            summary={data}
            eod={eod}
            upcomingMeeting={upcomingMeeting}
            notifications={notifications}
            unreadCount={unreadCount}
          />
        )}
        {activeTab === 'work' && (
          <EmployeeWorkTasksTab
            summary={data}
            tasks={tasks}
            activeTimer={activeTimer}
            isCheckedIn={isCheckedIn}
            isActionLoading={isActionLoading}
            onStartTimer={handleStartTimer}
            onPauseTimer={handlePauseTimer}
            onResumeTimer={handleResumeTimer}
            onStopTimer={handleStopTimer}
            onOpenTask={(task) => {
              setSelectedTask(task);
              setIsDetailOpen(true);
            }}
          />
        )}
        {activeTab === 'attendance' && (
          <EmployeeAttendanceTab
            summary={data}
            sessions={sessions}
            shiftName={shiftName}
            shiftTiming={shiftTiming}
          />
        )}
        {activeTab === 'productivity' && (
          <EmployeeProductivityTab summary={data} eod={eod} goals={goals} notes={notes} />
        )}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
                <DialogDescription>Task details</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                {selectedTask.description && (
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-lg p-3">
                    {selectedTask.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[var(--text-muted)] mb-0.5">Project</p>
                    <p className="font-semibold">{selectedTask.project_title || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] mb-0.5">Priority</p>
                    <StatusBadge status={selectedTask.priority} />
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] mb-0.5">Status</p>
                    <StatusBadge status={selectedTask.status} />
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)] mb-0.5">Due date</p>
                    <p className="font-semibold">{formatDueDate(selectedTask.due_date)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--text-muted)] mb-0.5">Assigned to</p>
                    <p className="font-semibold">{selectedTask.assigned_to_name || 'Unassigned'}</p>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
                <Link href="/employee/tasks">
                  <Button size="sm" onClick={() => setIsDetailOpen(false)}>
                    Open Tasks Page
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </EmployeePageShell>
  );
}
