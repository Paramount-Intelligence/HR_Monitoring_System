'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi, Project } from '@/lib/api/projects';
import { timeLogsApi, TimeLog } from '@/lib/api/timeLogs';
import { useAuth } from '@/lib/auth/AuthContext';
import { messagesApi } from '@/lib/api/messages';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Loader2, Shield, Download, BarChart3, Globe, Zap, FileText, TrendingUp, Users, Clock, Play, StopCircle, Calendar, Briefcase, Flame, Trophy, PlayCircle, CheckCircle2, Circle, MessageSquare
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { TaskTimerSession } from '@/lib/api/timeLogs';
import { AttendanceSession } from '@/lib/api/attendance';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDate } from '@/lib/time';

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  project_id: z.string().min(1, 'Project is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<TaskTimerSession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSession | null>(null);
  const [activeBreak, setActiveBreak] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleDiscussTask = async (task: Task) => {
    try {
      const conv = await messagesApi.getOrCreateContextThread({
        related_entity_type: 'task',
        related_entity_id: task.id,
        title: `Task: ${task.title}`
      });
      router.push(`/messages?conversation_id=${conv.id}`);
    } catch (error) {
      toast.error('Failed to open discussion: ' + getErrorMessage(error));
    }
  };

  const fetchData = async () => {
    try {
      const [tasksData, projectsData, timerData, attendanceData, breakData] = await Promise.all([
        tasksApi.getTasks(),
        projectsApi.getTaskEligibleProjects(),
        timeLogsApi.getActiveTimer(),
        apiClient.get<AttendanceSession | null>('/attendance/active').then(res => res.data),
        apiClient.get<any>('/attendance/breaks/current').then(res => res.data)
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setActiveTimer(timerData);
      setAttendance(attendanceData);
      setActiveBreak(breakData);
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

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      project_id: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const onSubmit = async (data: TaskFormValues) => {
    if (!user) return;
    try {
      await tasksApi.createTask({
        ...data,
        assigned_to: user.id,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined
      });
      toast.success('Task created successfully');
      setIsDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleStartTimer = async (taskId: string) => {
    if (!isCheckedIn) {
        toast.error('You must check in before starting a task.');
        return;
    }
    if (activeBreak) {
        toast.error('You cannot start a task while on break.');
        return;
    }
    setIsActionLoading(taskId);
    try {
      await timeLogsApi.startTimer(taskId);
      toast.success('Task timer started');
      await fetchData();
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
      await fetchData();
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
    if (activeBreak) {
        toast.error('You cannot resume a task while on break.');
        return;
    }
    setIsActionLoading(taskId);
    try {
      await timeLogsApi.resumeTimer(taskId);
      toast.success('Task timer resumed');
      await fetchData();
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
      toast.success('Task timer saved to database');
      await fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(null);
    }
  };

  const getPauseLabel = (reason: string | null) => {
    if (!reason) return 'Paused';
    if (reason === 'attendance_checkout') return 'Paused because you checked out';
    if (reason === 'break_started') return 'Paused because break started';
    if (reason === 'manual_pause') return 'Paused manually';
    return 'Paused';
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      {/* Active Session Header */}
      {activeTimer && (
        <div className={cn(
            "relative overflow-hidden rounded-[2.5rem] p-1 shadow-[var(--shadow-soft)] transition-all duration-500",
            activeTimer.status === 'running' ? "bg-[var(--accent-primary)]" : "bg-slate-400"
        )}>
          <div className={cn(
              "absolute inset-0 bg-gradient-to-r animate-gradient-x opacity-90",
              activeTimer.status === 'running' ? "from-[var(--accent-primary)] via-indigo-500 to-violet-600" : "from-slate-500 via-slate-400 to-slate-600"
          )} />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-10 py-8 bg-white/5 backdrop-blur-xl rounded-[2.3rem]">
            <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center text-white ring-4 ring-white/10">
                    {activeTimer.status === 'running' ? <Zap className="h-8 w-8 animate-pulse" /> : <Clock className="h-8 w-8" />}
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100/60">
                            {activeTimer.status === 'running' ? 'Currently Running' : getPauseLabel(activeTimer.pause_reason)}
                        </span>
                        {activeTimer.status === 'running' && <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">{activeTimer.task_title || 'Active Task'}</h2>
                    <div className="flex items-center gap-2 text-indigo-100/40 text-[10px] font-black uppercase tracking-widest">
                        <Briefcase className="h-3 w-3" />
                        {activeTimer.project_title || 'Project Task'}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-10">
                <div className="text-right">
                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100/40 mb-1">Session Duration</span>
                    <div className="text-4xl font-black text-white tracking-tighter tabular-nums">
                        <TaskTimer 
                          startedAt={activeTimer.started_at} 
                          lastResumedAt={activeTimer.last_resumed_at}
                          accumulatedSeconds={activeTimer.accumulated_seconds}
                          status={activeTimer.status}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeTimer.status === 'running' ? (
                        <Button 
                            size="lg" 
                            variant="outline"
                            className="h-14 px-8 rounded-2xl bg-white/90 hover:bg-white text-[var(--accent-primary)] border-none font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                            onClick={() => handlePauseTimer(activeTimer.task_id)}
                            disabled={isActionLoading === activeTimer.task_id}
                        >
                            {isActionLoading === activeTimer.task_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                            Pause
                        </Button>
                    ) : (
                        <Button 
                            size="lg" 
                            variant="outline"
                            className="h-14 px-8 rounded-2xl bg-[var(--accent-primary)] hover:opacity-90 text-white border-none font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:bg-slate-300"
                            onClick={() => handleResumeTimer(activeTimer.task_id)}
                            disabled={isActionLoading === activeTimer.task_id || !isCheckedIn}
                        >
                            {isActionLoading === activeTimer.task_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Resume
                        </Button>
                    )}
                    <Button 
                        size="lg" 
                        variant="outline"
                        className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white border-none font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                        onClick={() => handleStopTimer(activeTimer.task_id)}
                        disabled={isActionLoading === activeTimer.task_id}
                    >
                        {isActionLoading === activeTimer.task_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
                        Stop
                    </Button>
                </div>
            </div>
          </div>
          {!isCheckedIn && activeTimer.status === 'paused' && (
              <div className="px-10 py-3 bg-[var(--bg-elevated)]/10 text-[9px] font-bold text-white uppercase tracking-[0.3em] text-center border-t border-white/5">
                  Attendance Offline: Please check in to resume tracking focus
              </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <Zap className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tasks Dashboard</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Tasks</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Real-time Task Status & Priority Tracking</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl transition-all active:scale-95 border-none">
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-[var(--shadow-card)] p-10 bg-[var(--bg-surface)] text-[var(--text-primary)] animate-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Create Task</DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">
                Create a new task under a project context
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Task Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Refactor API Interceptors" className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold focus:bg-[var(--bg-surface)] transition-all text-[var(--text-primary)]" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-bold">{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Description</FormLabel>
                    <FormControl><Textarea placeholder="Provide context/details for this task..." className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)] border-[var(--border-default)] min-h-[100px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all text-[var(--text-primary)]" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Set level" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          <SelectItem value="low" className="text-[10px] font-black uppercase tracking-widest">Low</SelectItem>
                          <SelectItem value="medium" className="text-[10px] font-black uppercase tracking-widest">Medium</SelectItem>
                          <SelectItem value="high" className="text-[10px] font-black uppercase tracking-widest">High</SelectItem>
                          <SelectItem value="critical" className="text-[10px] font-black uppercase tracking-widest text-rose-600">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Deadline</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold focus:bg-[var(--bg-surface)] transition-all text-[var(--text-primary)]" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-6 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl transition-all active:scale-95 flex-1 border-none">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Task
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <Trophy className="h-6 w-6 text-[var(--accent-primary)]" />
            Task List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={5} cols={5} /></div>
          ) : tasks.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="Task queue empty"
                  description="No tasks found. Create a new task to get started."
                  icon={Briefcase}
                  action={
                    <Button 
                      onClick={() => setIsDialogOpen(true)}
                      className="h-11 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-6 rounded-xl border-none shadow-md"
                    >
                      New Task
                    </Button>
                  }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                    <TableHead className="w-[40%] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Task Title</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Project</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Priority</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Timer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-[var(--bg-subtle)]/50 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{task.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 gap-1"
                              onClick={() => handleDiscussTask(task)}
                            >
                              <MessageSquare className="h-3 w-3" />
                              Discuss
                            </Button>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            <Clock className="h-3 w-3" />
                            {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : 'No Deadline'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">
                            <Briefcase className="h-3.5 w-3.5 opacity-60" />
                            {task.project_title || 'General'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.priority} />
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex justify-end">
                            {activeTimer && activeTimer.task_id === task.id ? (
                                <div className="flex items-center gap-2">
                                    {activeTimer.status === 'running' ? (
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            className="h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-4 transition-all active:scale-95 text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
                                            onClick={() => handlePauseTimer(task.id)}
                                            disabled={isActionLoading === task.id}
                                        >
                                            {isActionLoading === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            className="h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-4 transition-all active:scale-95 text-[var(--accent-primary)] border-indigo-100 hover:bg-indigo-50"
                                            onClick={() => handleResumeTimer(task.id)}
                                            disabled={isActionLoading === task.id || !isCheckedIn}
                                        >
                                            {isActionLoading === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                        </Button>
                                    )}
                                    <Button 
                                        variant="destructive"
                                        size="sm"
                                        className="h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-6 transition-all active:scale-95"
                                        onClick={() => handleStopTimer(task.id)}
                                        disabled={isActionLoading === task.id}
                                    >
                                        {isActionLoading === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><StopCircle className="mr-2 h-4 w-4" /> Stop</>}
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    className="h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] px-6 transition-all active:scale-95 text-[var(--accent-primary)] border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-indigo-50 disabled:opacity-50"
                                    onClick={() => handleStartTimer(task.id)}
                                    disabled={isActionLoading === task.id || (activeTimer !== null) || !isCheckedIn}
                                >
                                    {isActionLoading === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Play className="mr-2 h-4 w-4" /> Start</>}
                                </Button>
                            )}
                        </div>
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
