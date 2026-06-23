'use client';

import { useEffect, useState, useMemo } from 'react';
import { timeLogsApi, TimeLog, TaskTimerSession } from '@/lib/api/timeLogs';
import { tasksApi, Task } from '@/lib/api/tasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { Loader2, PlayCircle, StopCircle, Clock, Plus, Play, Pause } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import {
  makeTaskTimerOptions,
  resolveOptionLabel,
  getTaskTimerLabel,
  safeDisplayLabel,
  getTaskProjectLabel,
} from '@/lib/display-labels';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { AttendanceSession } from '@/lib/api/attendance';
import { modalFormClass, modalFormFieldClass, modalFormGridClass } from '@/lib/modal-layout';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  canTrackTaskForTimer,
  formatTimeLogDuration,
  getStartTimerDisabledReason,
} from '@/lib/time-logs/timer-utils';

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

  const fetchData = async () => {
    try {
      const [logsData, tasksData, timerData, attendanceData] = await Promise.all([
        timeLogsApi.getTeamLogs(),
        tasksApi.getTasks(),
        timeLogsApi.getActiveTimer(),
        apiClient.get<AttendanceSession | null>('/attendance/active').then((res) => res.data),
      ]);
      setLogs(logsData);
      setTasks(tasksData);
      setActiveTimer(timerData);
      setAttendance(attendanceData);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to load time tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isCheckedIn = !!attendance && attendance.session_status === 'active';

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

  const startTimerDisabledReason = getStartTimerDisabledReason({
    selectedTaskId,
    hasActiveTimer: Boolean(activeTimer),
    isSubmitting: isTimerActionLoading,
    isLoading,
    selectedTask,
    currentUserId: user?.id,
  });

  const handleStartTimer = async () => {
    if (startTimerDisabledReason) {
      toast.error(startTimerDisabledReason);
      return;
    }
    if (!isCheckedIn) {
      toast.error('You must check in before starting a task.');
      return;
    }
    setIsTimerActionLoading(true);
    try {
      const session = await timeLogsApi.startTimer(selectedTaskId);
      setActiveTimer(session);
      toast.success('Timer started');
      await fetchData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to start timer');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    if (!activeTimer) return;
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.pauseTimer(activeTimer.task_id);
      toast.success('Timer paused');
      await fetchData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to pause timer');
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
      toast.success('Timer resumed');
      await fetchData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to resume timer');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    setIsTimerActionLoading(true);
    try {
      await timeLogsApi.stopTimer(activeTimer.task_id);
      setActiveTimer(null);
      toast.success('Timer saved');
      setSelectedTaskId('');
      await fetchData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to stop timer');
    } finally {
      setIsTimerActionLoading(false);
    }
  };

  const onManualSubmit = async (data: ManualLogValues) => {
    try {
      await timeLogsApi.createManualLog({
        task_id: data.task_id,
        started_at: new Date(data.started_at).toISOString(),
        ended_at: new Date(data.ended_at).toISOString(),
        notes: data.notes
      });
      toast.success('Manual log created');
      setIsManualDialogOpen(false);
      manualForm.reset();
      await fetchData();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to create manual log');
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

  const formatDurationString = (log: TimeLog) => formatTimeLogDuration(log);

  const getPauseLabel = (reason: string | null) => {
    if (!reason) return 'Paused';
    if (reason === 'attendance_checkout') return 'Paused after checkout';
    if (reason === 'manual_pause') return 'Paused manually';
    return 'Paused';
  };

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Team Time Logs</h1>
          <p className="text-sm text-[var(--text-secondary)]">Track team time and manage your own task timers</p>
        </div>

        <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] font-bold rounded-xl h-11 px-6 text-xs uppercase tracking-widest">
              <Plus className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />
              Manual Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">Manual Time Log</DialogTitle>
              <DialogDescription className="text-sm font-medium text-[var(--text-muted)]">
                Add a manual time log entry
              </DialogDescription>
            </DialogHeader>
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className={modalFormClass}>
                <FormField control={manualForm.control} name="task_id" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Task</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)]">
                          <SelectValue placeholder="Select a task">
                            {resolveOptionLabel(manualTaskOptions, field.value, 'Select a task')}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                        {manualTaskOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                  </FormItem>
                )} />
                <div className={modalFormGridClass}>
                  <FormField control={manualForm.control} name="started_at" render={({ field }) => (
                    <FormItem className={modalFormFieldClass}>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Start Time</FormLabel>
                      <FormControl><Input type="datetime-local" className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                    </FormItem>
                  )} />
                  <FormField control={manualForm.control} name="ended_at" render={({ field }) => (
                    <FormItem className={modalFormFieldClass}>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">End Time</FormLabel>
                      <FormControl><Input type="datetime-local" className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                    </FormItem>
                  )} />
                </div>
                <FormField control={manualForm.control} name="notes" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="What did you work on?" className="resize-none rounded-xl border-[var(--border-default)] min-h-[100px] font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase tracking-tight" />
                  </FormItem>
                )} />
                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsManualDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={manualForm.formState.isSubmitting} className="bg-[var(--accent-primary)] hover:opacity-90 border-none text-white font-bold">
                    {manualForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                    Save Log
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface)] text-[var(--text-primary)] relative rounded-xl">
        {activeTimer && (
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)] animate-pulse" />
        )}
        <CardHeader className="bg-[var(--bg-subtle)]/30 border-b border-[var(--border-subtle)]">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">
            <Clock className="h-5 w-5 text-[var(--accent-primary)]" />
            Active Timer
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-muted)] font-medium">Select a task and start tracking your time.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex-1 w-full min-w-0">
              {activeTimer ? (
                <div className="p-4 bg-[var(--bg-subtle)]/40 border border-[var(--border-subtle)] rounded-xl space-y-1">
                  <span className="text-xs text-[var(--text-muted)] block font-bold uppercase tracking-wider">
                    {activeTimer.status === 'running' ? 'Currently tracking' : getPauseLabel(activeTimer.pause_reason)}
                  </span>
                  <span className="font-bold text-[var(--text-primary)] text-base block truncate">
                    {getTaskTimerLabel(activeTimer)}
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Started {formatDateTime(activeTimer.started_at)}
                  </p>
                </div>
              ) : (
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger className="w-full bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-xl h-12">
                    <SelectValue placeholder="Select a task to track...">
                      {resolveOptionLabel(taskTimerOptions, selectedTaskId, 'Select a task to track...')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                    {taskTimerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3 shrink-0">
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
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {activeTimer.status === 'running' ? (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handlePauseTimer}
                      disabled={isTimerActionLoading}
                      className="flex-1 sm:flex-none h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-xs"
                    >
                      {isTimerActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="mr-2 h-4 w-4" />}
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="flex-1 sm:flex-none h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-xs"
                      onClick={handleResumeTimer}
                      disabled={isTimerActionLoading || !isCheckedIn}
                    >
                      {isTimerActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      Resume
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopTimer}
                    disabled={isTimerActionLoading}
                    className="flex-1 sm:flex-none h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-xs border-none shadow-sm"
                  >
                    {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : <StopCircle className="mr-2 h-5 w-5 text-white" />}
                    Stop
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-stretch sm:items-end gap-2 w-full lg:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 font-bold uppercase tracking-wider text-xs border-none text-white shadow-sm disabled:opacity-50"
                    onClick={handleStartTimer}
                    disabled={Boolean(startTimerDisabledReason)}
                  >
                    {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" /> : <PlayCircle className="mr-2 h-5 w-5 text-white" />}
                    Start Timer
                  </Button>
                  {startTimerDisabledReason && (
                    <p className="text-[11px] font-medium text-[var(--text-muted)] text-right max-w-xs">
                      {startTimerDisabledReason}
                    </p>
                  )}
                  {!startTimerDisabledReason && !isCheckedIn && (
                    <p className="text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 text-right max-w-xs">
                      Check in required before starting a timer.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {activeTimer && !isCheckedIn && activeTimer.status === 'paused' && (
            <p className="mt-4 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
              Attendance offline — check in to resume tracking.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-soft)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl overflow-hidden">
        <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Recent Time Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] italic font-bold">
              No time logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)]">
                    <TableHead className="w-[200px] font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Employee</TableHead>
                    <TableHead className="w-[250px] font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Task</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Start Time</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">End Time</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Duration</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={cn("hover:bg-[var(--bg-subtle)]/50 border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-primary)]", log.status === 'active' && 'bg-[var(--bg-subtle)]/40')}>
                      <TableCell className="px-6 py-4 font-medium text-[var(--text-secondary)]">
                        {safeDisplayLabel((log as TimeLog & { user_name?: string }).user_name, 'Unknown user', 'Time log user')}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-bold text-[var(--text-primary)] truncate max-w-[250px]">
                          {safeDisplayLabel(log.task_title, 'Unknown task', 'Time log task')}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-medium truncate max-w-[250px]">
                          {getTaskProjectLabel(log)}
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-medium px-6 py-4">{formatDateTime(log.started_at)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] font-medium px-6 py-4">
                        {log.status === 'active' ? (
                          <span className="text-[var(--accent-primary)] italic font-bold">Running...</span>
                        ) : (
                          formatDateTime(log.ended_at)
                        )}
                      </TableCell>
                      <TableCell className="font-bold px-6 py-4">
                        {formatDurationString(log)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className="capitalize text-[var(--text-muted)] border-[var(--border-subtle)] font-bold text-[10px]">
                          {log.source_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
