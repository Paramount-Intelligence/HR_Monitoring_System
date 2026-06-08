'use client';

import { useEffect, useState } from 'react';
import { timeLogsApi, TimeLog, TaskTimerSession } from '@/lib/api/timeLogs';
import { tasksApi, Task } from '@/lib/api/tasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, formatDuration, intervalToDuration } from 'date-fns';
import { Loader2, PlayCircle, StopCircle, Clock, Plus, Zap, History, Briefcase, Calendar, CheckCircle, Play } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { cn } from '@/lib/utils';
import { AttendanceSession } from '@/lib/api/attendance';

const manualLogSchema = z.object({
  task_id: z.string().min(1, 'Task is required'),
  started_at: z.string().min(1, 'Start time is required'),
  ended_at: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
});

type ManualLogValues = z.infer<typeof manualLogSchema>;

export default function TimeLogsPage() {
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
    const totalSeconds = Math.round(minutes * 60);
    if (totalSeconds <= 0) return '0m';
    if (totalSeconds < 60) return '< 1m';
    
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    let parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    
    return parts.length > 0 ? parts.join(' ') : '< 1m';
  };

  const getPauseLabel = (reason: string | null) => {
    if (!reason) return 'Paused';
    if (reason === 'attendance_checkout') return 'Paused after checkout';
    if (reason === 'manual_pause') return 'Paused manually';
    return 'Paused';
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <History className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Time Logs</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Time Logs</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Log of tracked hours and manual entries</p>
        </div>

        <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" />
              Manual Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-[var(--shadow-card)] p-10 bg-[var(--bg-surface)] text-[var(--text-primary)] animate-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Manual Time Entry</DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">
                Log hours manually for missed task trackings
              </DialogDescription>
            </DialogHeader>
            <Form {...manualForm}>
              <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-8 pt-6">
                <FormField control={manualForm.control} name="task_id" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Task</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-[var(--text-primary)]">
                          <SelectValue placeholder="Select an active task">
                            {tasks.find(t => t.id === field.value)?.title}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                        {tasks.filter(t => t.status !== 'completed').map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={manualForm.control} name="started_at" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Session Start</FormLabel>
                      <FormControl><Input type="datetime-local" className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={manualForm.control} name="ended_at" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Session End</FormLabel>
                      <FormControl><Input type="datetime-local" className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <FormField control={manualForm.control} name="notes" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Audit Notes</FormLabel>
                    <FormControl><Textarea placeholder="What was accomplished during this session?" className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)] border-[var(--border-default)] min-h-[100px] font-bold text-sm leading-relaxed p-6 text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-6 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsManualDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
                  <Button type="submit" disabled={manualForm.formState.isSubmitting} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl transition-all active:scale-95 flex-1 border-none">
                    {manualForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Log
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden relative">
        {activeTimer && activeTimer.status === 'running' && (
          <div className="absolute top-0 left-0 w-2 h-full bg-[var(--accent-primary)] animate-pulse" />
        )}
        {activeTimer && activeTimer.status === 'paused' && (
          <div className="absolute top-0 left-0 w-2 h-full bg-slate-400" />
        )}
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <Clock className="h-6 w-6 text-[var(--accent-primary)]" />
            Active Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex-1 w-full">
              {activeTimer ? (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            {activeTimer.status === 'running' ? 'Currently tracking task' : getPauseLabel(activeTimer.pause_reason)}
                        </span>
                        <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">{activeTimer.task_title || 'General Execution'}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">
                        {activeTimer.status === 'running' && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
                        Started at {formatDateTime(activeTimer.started_at)}
                    </div>
                </div>
              ) : (
                <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Initiate New Session</div>
                    <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                      <SelectTrigger className="h-14 rounded-2xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all text-sm px-6">
                        <SelectValue placeholder="Select a task...">
                          {tasks.find(t => t.id === selectedTaskId)?.title}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                        {tasks.filter(t => t.status !== 'completed').map(t => (
                          <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-10">
              {activeTimer && (
                <div className="text-center sm:text-right">
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Session Duration</span>
                    <div className="text-5xl font-black text-[var(--accent-primary)] tracking-tighter tabular-nums">
                        <TaskTimer 
                          startedAt={activeTimer.started_at} 
                          lastResumedAt={activeTimer.last_resumed_at}
                          accumulatedSeconds={activeTimer.accumulated_seconds}
                          status={activeTimer.status}
                        />
                    </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                {activeTimer ? (
                    <>
                        {activeTimer.status === 'running' ? (
                            <Button 
                                size="lg" 
                                variant="outline"
                                onClick={handlePauseTimer}
                                disabled={isTimerActionLoading}
                                className="h-16 px-8 rounded-2xl border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                            >
                                {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Clock className="mr-2 h-5 w-5 text-[var(--accent-primary)]" />}
                                Pause
                            </Button>
                        ) : (
                            <Button 
                                size="lg" 
                                variant="outline"
                                onClick={handleResumeTimer}
                                disabled={isTimerActionLoading || !isCheckedIn}
                                className="h-16 px-8 rounded-2xl border-none bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:bg-slate-300"
                            >
                                {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Play className="mr-2 h-5 w-5" />}
                                Resume
                            </Button>
                        )}
                        <Button 
                            size="lg" 
                            variant="destructive"
                            onClick={handleStopTimer}
                            disabled={isTimerActionLoading}
                            className="h-16 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-rose-100 transition-all active:scale-95"
                        >
                            {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                            Stop
                        </Button>
                    </>
                ) : (
                    <Button 
                        size="lg" 
                        variant="default"
                        onClick={handleStartTimer}
                        disabled={isTimerActionLoading || !selectedTaskId || !isCheckedIn}
                        className="h-16 px-10 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 border-none"
                    >
                        {isTimerActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                        Start Timer
                    </Button>
                )}
              </div>
            </div>
          </div>
          {activeTimer && !isCheckedIn && activeTimer.status === 'paused' && (
              <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center animate-in fade-in">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Attendance Offline: Please check in to resume tracking focus</p>
              </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">Time Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={8} cols={5} /></div>
          ) : logs.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="No execution logs"
                  message="No time logs found. Start a task timer or submit a manual entry."
                  icon={History}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                    <TableHead className="w-[40%] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Task Title</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Timeline</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Duration</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Source</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className={cn(
                        "hover:bg-[var(--bg-subtle)]/50 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28",
                        log.status === 'active' && "bg-indigo-50/20"
                    )}>
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{log.task_title || 'General Execution'}</span>
                          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                            <Briefcase className="h-3.5 w-3.5 opacity-60" />
                            Task
                          </div>
                        </div>
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
                      <TableCell className="text-right pr-10">
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
        </CardContent>
      </Card>
    </div>
  );
}
