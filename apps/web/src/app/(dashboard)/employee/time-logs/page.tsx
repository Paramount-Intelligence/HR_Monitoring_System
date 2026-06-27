'use client';

import { useEffect, useState, useMemo } from 'react';
import { timeLogsApi, TimeLog, TaskTimerSession } from '@/lib/api/timeLogs';
import { tasksApi, Task } from '@/lib/api/tasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, formatDuration, intervalToDuration, startOfDay, startOfWeek } from 'date-fns';
import { Loader2, PlayCircle, StopCircle, Clock, Plus, Zap, History, Briefcase, Calendar, CheckCircle, Play } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { modalFormClass, modalFormFieldClass } from '@/lib/modal-layout';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { toast } from 'sonner';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, formatSafeDurationFromSeconds } from '@/lib/utils';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { AttendanceSession } from '@/lib/api/attendance';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getActiveTimerProjectName,
  getActiveTimerTaskTitle,
  makeTaskTimerOptions,
  resolveOptionLabel,
} from '@/lib/display-labels';
import { canTrackTaskForTimer } from '@/lib/time-logs/timer-utils';

const manualLogSchema = z.object({
  task_id: z.string().min(1, 'Task is required'),
  started_at: z.string().min(1, 'Start time is required'),
  ended_at: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
});

type ManualLogValues = z.infer<typeof manualLogSchema>;

export default function TimeLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTimer, setActiveTimer] = useState<TaskTimerSession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimerActionLoading, setIsTimerActionLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [logsData, tasksData, timerData, attendanceData] = await Promise.all([
        timeLogsApi.getMyLogs(),
        tasksApi.getTasks(),
        timeLogsApi.getActiveTimer(),
        apiClient.get<AttendanceSession | null>('/attendance/active').then(res => res.data)
      ]);
      setLogs(logsData);
      setTasks(tasksData);
      setActiveTimer(timerData);
      setAttendance(attendanceData);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isCheckedIn = !!attendance && attendance.session_status === 'active';

  const handleStartTimer = async () => {
    if (!selectedTaskId) {
      toast.error('Please select a task to track');
      return;
    }
    if (!isCheckedIn) {
        toast.error('You must check in before starting a task.');
        return;
    }
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.startTimer(selectedTaskId);
      toast.success('Task timer started');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    if (!activeTimer) return;
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.pauseTimer(activeTimer.task_id);
      toast.success('Task timer paused');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handleResumeTimer = async () => {
    if (!activeTimer) return;
    if (!isCheckedIn) {
        toast.error('You must check in before resuming a task.');
        return;
    }
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.resumeTimer(activeTimer.task_id);
      toast.success('Task timer resumed');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.stopTimer(activeTimer.task_id);
      toast.success('Task timer saved to database');
      setSelectedTaskId('');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const manualForm = useForm<ManualLogValues>({
    resolver: zodResolver(manualLogSchema),
    defaultValues: {
      task_id: '',
      started_at: '',
      ended_at: '',
      notes: '',
    },
  });

  const manualSelectedTaskId = manualForm.watch('task_id');

  const trackableTasks = useMemo(
    () => tasks.filter((task) => canTrackTaskForTimer(task, user?.id)),
    [tasks, user?.id]
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const taskTimerOptions = useMemo(
    () =>
      makeTaskTimerOptions(trackableTasks, undefined, {
        id: selectedTaskId || activeTimer?.task_id,
        title: activeTimer?.task_title || selectedTask?.title,
        project_title: activeTimer?.project_title || selectedTask?.project_title,
        project_id: selectedTask?.project_id,
      }),
    [trackableTasks, selectedTaskId, activeTimer, selectedTask]
  );

  const manualTaskOptions = useMemo(
    () =>
      makeTaskTimerOptions(trackableTasks, undefined, {
        id: manualSelectedTaskId,
        title: tasks.find((task) => task.id === manualSelectedTaskId)?.title,
        project_title: tasks.find((task) => task.id === manualSelectedTaskId)?.project_title,
        project_id: tasks.find((task) => task.id === manualSelectedTaskId)?.project_id,
      }),
    [trackableTasks, manualSelectedTaskId, tasks]
  );

  const onManualSubmit = async (data: ManualLogValues) => {
    try {
      await timeLogsApi.createManualLog({
        task_id: data.task_id,
        started_at: new Date(data.started_at).toISOString(),
        ended_at: new Date(data.ended_at).toISOString(),
        notes: data.notes
      });
      toast.success('Manual log entry created');
      setIsManualDialogOpen(false);
      manualForm.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'PPp');
    } catch {
      return dateStr;
    }
  };

  const formatDurationString = (minutes: number) => {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m < 0) return '—';
    return formatSafeDurationFromSeconds(Math.round(m * 60));
  };

  const getPauseLabel = (reason: string | null) => {
    if (!reason) return 'Paused';
    if (reason === 'attendance_checkout') return 'Paused after checkout';
    if (reason === 'manual_pause') return 'Paused manually';
    return 'Paused';
  };

  const logStats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const getMinutes = (log: TimeLog) => {
      if (log.status === 'active') return 0;
      const m = Number(log.duration_minutes);
      return Number.isFinite(m) ? m : 0;
    };
    const logDate = (log: TimeLog) => {
      try {
        return parseISO(log.started_at);
      } catch {
        return null;
      }
    };
    const todayMinutes = logs
      .filter((log) => {
        const d = logDate(log);
        return d && d >= todayStart;
      })
      .reduce((acc, log) => acc + getMinutes(log), 0);
    const weekMinutes = logs
      .filter((log) => {
        const d = logDate(log);
        return d && d >= weekStart;
      })
      .reduce((acc, log) => acc + getMinutes(log), 0);
    return {
      todayLogged: formatSafeDurationFromSeconds(Math.round(todayMinutes * 60)),
      weekLogged: formatSafeDurationFromSeconds(Math.round(weekMinutes * 60)),
      manualEntries: logs.filter((l) => l.source_type === 'manual').length,
      timerEntries: logs.filter((l) => l.source_type === 'timer').length,
    };
  }, [logs]);

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="Time Logs"
        subtitle="Tracked work sessions and manual entries"
        icon={History}
        actions={
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-lg text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Manual Time Entry</DialogTitle>
                <DialogDescription>Log hours manually for missed task trackings</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Form {...manualForm}>
                  <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className={modalFormClass} id="manual-log-form">
                    <FormField control={manualForm.control} name="task_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Task</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 rounded-lg">
                              <SelectValue placeholder="Select task">
                                {resolveOptionLabel(manualTaskOptions, field.value, 'Select task')}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoading ? (
                              <div className="px-2 py-1.5 text-xs text-[var(--text-muted)]">Loading tasks...</div>
                            ) : manualTaskOptions.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-[var(--text-muted)]">No tasks available</div>
                            ) : (
                              manualTaskOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField control={manualForm.control} name="started_at" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Session Start</FormLabel>
                          <FormControl><Input type="datetime-local" className="h-9 rounded-lg" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={manualForm.control} name="ended_at" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Session End</FormLabel>
                          <FormControl><Input type="datetime-local" className="h-9 rounded-lg" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={manualForm.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Notes</FormLabel>
                        <FormControl><Textarea placeholder="What was accomplished?" className="min-h-[80px] rounded-lg resize-none" {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </form>
                </Form>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsManualDialogOpen(false)}>Discard</Button>
                <Button type="submit" form="manual-log-form" size="sm" disabled={manualForm.formState.isSubmitting}>
                  {manualForm.formState.isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Save Log
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard title="Today Logged" value={logStats.todayLogged} icon={Clock} />
        <EmployeeMetricCard title="This Week Logged" value={logStats.weekLogged} icon={Calendar} />
        <EmployeeMetricCard title="Manual Entries" value={logStats.manualEntries} icon={Plus} />
        <EmployeeMetricCard title="Timer Entries" value={logStats.timerEntries} icon={Zap} />
      </EmployeeMetricGrid>

      <EmployeeSectionCard title="Active Session" icon={PlayCircle}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 w-full min-w-0">
            {activeTimer ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {activeTimer.status === 'running' ? 'Currently tracking' : getPauseLabel(activeTimer.pause_reason)}
                </p>
                <p className="text-sm font-semibold truncate">{getActiveTimerTaskTitle(activeTimer)}</p>
                {getActiveTimerProjectName(activeTimer) && (
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Project: {getActiveTimerProjectName(activeTimer)}
                  </p>
                )}
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Started {formatDateTime(activeTimer.started_at)}
                </p>
              </div>
            ) : (
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="h-9 rounded-lg bg-[var(--bg-subtle)] border-[var(--border-default)] text-sm">
                  <SelectValue placeholder="Select a task to track...">
                    {resolveOptionLabel(taskTimerOptions, selectedTaskId, 'Select a task to track...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <div className="px-2 py-1.5 text-xs text-[var(--text-muted)]">Loading tasks...</div>
                  ) : taskTimerOptions.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-[var(--text-muted)]">No tasks available</div>
                  ) : (
                    taskTimerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {activeTimer && (
              <div className="text-lg font-bold text-[var(--accent-primary)] tabular-nums">
                <TaskTimer
                  startedAt={activeTimer.started_at}
                  lastResumedAt={activeTimer.last_resumed_at}
                  accumulatedSeconds={activeTimer.accumulated_seconds}
                  status={activeTimer.status}
                />
              </div>
            )}
            {activeTimer ? (
              <div className="flex items-center gap-2">
                {activeTimer.status === 'running' ? (
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={handlePauseTimer} disabled={isTimerActionLoading}>
                    {isTimerActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pause'}
                  </Button>
                ) : (
                  <Button size="sm" className="rounded-lg" onClick={handleResumeTimer} disabled={isTimerActionLoading || !isCheckedIn}>
                    Resume
                  </Button>
                )}
                <Button size="sm" variant="destructive" className="rounded-lg" onClick={handleStopTimer} disabled={isTimerActionLoading}>
                  Stop
                </Button>
              </div>
            ) : (
              <Button size="sm" className="rounded-lg" onClick={handleStartTimer} disabled={isTimerActionLoading || !selectedTaskId || !isCheckedIn}>
                {isTimerActionLoading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Play className="mr-1.5 h-3 w-3" />}
                Start Timer
              </Button>
            )}
          </div>
        </div>
        {activeTimer && !isCheckedIn && activeTimer.status === 'paused' && (
          <p className="mt-3 text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
            Attendance offline — check in to resume tracking.
          </p>
        )}
      </EmployeeSectionCard>

      <EmployeeSectionCard title="Session History" icon={History} noPadding contentClassName="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={8} cols={5} /></div>
          ) : logs.length === 0 ? (
            <div className="p-10">
              <EmptyState
                title="No execution logs"
                description="No time logs found. Start a task timer or submit a manual entry."
                icon={History}
              />
            </div>
          ) : (
            <div className="overflow-x-auto app-table-shell">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-11">
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)] pl-4">Task</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Timeline</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Duration</TableHead>
                    <TableHead className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Source</TableHead>
                    <TableHead className="text-right pr-4 font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={cn(
                      'hover:bg-[var(--bg-subtle)]/50 border-b border-[var(--border-subtle)] last:border-0 h-14',
                      log.status === 'active' && 'bg-[var(--accent-soft)]/30'
                    )}>
                      <TableCell className="pl-4">
                        <span className="text-sm font-medium">{log.task_title || 'General Execution'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">
                                <span className="text-[var(--text-muted)]">IN:</span> {formatDateTime(log.started_at)}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">
                                <span className="text-[var(--text-muted)]">OUT:</span> {log.status === 'active' ? 'Active' : formatDateTime(log.ended_at)}
                            </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)] tracking-tighter">
                            <Clock className="h-4 w-4 text-[var(--accent-primary)]" />
                            {log.status === 'active' ? 'Running' : formatDurationString(log.duration_minutes)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="h-6 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                          {log.source_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {log.status === 'active' ? (
                            <div className="flex items-center justify-end gap-2 text-[var(--accent-primary)] font-black text-[10px] uppercase tracking-widest">
                                <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                                Running
                            </div>
                        ) : (
                            <div className="flex items-center justify-end gap-2 text-[var(--text-muted)] font-black text-[10px] uppercase tracking-widest">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                Saved
                            </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </EmployeeSectionCard>
    </EmployeePageShell>
  );
}
