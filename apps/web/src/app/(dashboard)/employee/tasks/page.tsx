'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Plus, Loader2, Shield, Download, BarChart3, Globe, Zap, FileText, TrendingUp, Users, Clock, Play, StopCircle, Calendar, Briefcase, Flame, Trophy, PlayCircle, CheckCircle2, Circle, MessageSquare, AlertCircle
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { TaskTimerSession } from '@/lib/api/timeLogs';
import { AttendanceSession } from '@/lib/api/attendance';
import { 
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, 
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
import { TaskCompleteRequestButton } from '@/components/tasks/TaskCompleteRequestButton';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDate } from '@/lib/time';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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

  const taskStats = useMemo(() => {
    const isOverdue = (t: Task) => {
      if (!t.due_date || t.status === 'completed' || t.status === 'reviewed') return false;
      const d = parseISO(t.due_date);
      return isValid(d) && d < new Date();
    };
    return {
      total: tasks.length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed' || t.status === 'reviewed').length,
      overdue: tasks.filter(isOverdue).length,
    };
  }, [tasks]);

  return (
    <EmployeePageShell>
      {activeTimer && (
        <div className="rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-soft)] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              {activeTimer.status === 'running' ? 'Active Timer' : getPauseLabel(activeTimer.pause_reason)}
            </p>
            <p className="text-sm font-semibold truncate">{activeTimer.task_title || 'Active Task'}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{activeTimer.project_title || 'Project Task'}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-lg font-bold text-[var(--accent-primary)] tabular-nums">
              <TaskTimer
                startedAt={activeTimer.started_at}
                lastResumedAt={activeTimer.last_resumed_at}
                accumulatedSeconds={activeTimer.accumulated_seconds}
                status={activeTimer.status}
              />
            </div>
            {activeTimer.status === 'running' ? (
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handlePauseTimer(activeTimer.task_id)} disabled={isActionLoading === activeTimer.task_id}>
                {isActionLoading === activeTimer.task_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pause'}
              </Button>
            ) : (
              <Button size="sm" className="rounded-lg" onClick={() => handleResumeTimer(activeTimer.task_id)} disabled={isActionLoading === activeTimer.task_id || !isCheckedIn}>
                Resume
              </Button>
            )}
            <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => handleStopTimer(activeTimer.task_id)} disabled={isActionLoading === activeTimer.task_id}>
              Stop
            </Button>
          </div>
        </div>
      )}

      <EmployeePageHeader
        title="My Tasks"
        subtitle="Assigned work, priorities, timers, and discussions"
        icon={Zap}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>Create a new task under a project context</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="create-task-form">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Task Title</FormLabel>
                        <FormControl><Input placeholder="Task title" className="h-9 rounded-lg" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="project_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Description</FormLabel>
                        <FormControl><Textarea placeholder="Task details..." className="min-h-[80px] rounded-lg resize-none" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="priority" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="due_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Deadline</FormLabel>
                          <FormControl><Input type="date" className="h-9 rounded-lg" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button type="submit" form="create-task-form" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard title="Assigned Tasks" value={taskStats.total} icon={Briefcase} />
        <EmployeeMetricCard title="In Progress" value={taskStats.inProgress} icon={Clock} />
        <EmployeeMetricCard title="Completed" value={taskStats.completed} icon={CheckCircle2} />
        <EmployeeMetricCard title="Overdue" value={taskStats.overdue} icon={AlertCircle} />
      </EmployeeMetricGrid>

      <EmployeeSectionCard title="Task List" icon={Trophy} noPadding contentClassName="p-0">
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
                    <TableRow key={task.id} className="hover:bg-[var(--bg-subtle)]/50 transition-all border-b border-[var(--border-subtle)] last:border-0 h-14">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                             <button
                               onClick={() => {
                                 setSelectedTask(task);
                                 setIsDetailOpen(true);
                               }}
                               className="font-black text-[var(--text-primary)] text-sm tracking-tight hover:underline text-left focus:outline-none"
                             >
                               {task.title}
                             </button>
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
      </EmployeeSectionCard>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
                <DialogDescription>Task Details</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                {selectedTask.description && (
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-lg p-3">
                    {selectedTask.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Project</span>
                    <span className="font-semibold">{selectedTask.project_title || 'General / Internal'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Priority</span>
                    <StatusBadge status={selectedTask.priority} />
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Status</span>
                    <StatusBadge status={selectedTask.status} />
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Due Date</span>
                    <span className="font-semibold">{selectedTask.due_date ? format(parseISO(selectedTask.due_date), 'MMM d, yyyy') : 'No Deadline'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[var(--text-muted)] block mb-0.5">Assigned To</span>
                    <span className="font-semibold">{selectedTask.assigned_to_name || 'Unassigned'}</span>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter className="flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>Close</Button>
                <TaskCompleteRequestButton
                  task={selectedTask}
                  role={user?.role}
                  currentUserId={user?.id}
                  activeTimer={activeTimer}
                  onSuccess={fetchData}
                />
                <Button type="button" size="sm" onClick={() => { setIsDetailOpen(false); handleDiscussTask(selectedTask); }}>Discuss</Button>
                {activeTimer && activeTimer.task_id === selectedTask.id ? (
                  activeTimer.status === 'running' ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => { setIsDetailOpen(false); handlePauseTimer(selectedTask.id); }}>Pause Timer</Button>
                  ) : (
                    <Button type="button" size="sm" onClick={() => { setIsDetailOpen(false); handleResumeTimer(selectedTask.id); }}>Resume Timer</Button>
                  )
                ) : (
                  <Button type="button" size="sm" onClick={() => { setIsDetailOpen(false); handleStartTimer(selectedTask.id); }} disabled={activeTimer !== null || !isCheckedIn}>Start Timer</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </EmployeePageShell>
  );
}
