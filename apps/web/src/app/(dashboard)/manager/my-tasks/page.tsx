'use client';

import { useEffect, useState } from 'react';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi, Project } from '@/lib/api/projects';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, CheckSquare, Clock, Briefcase, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatPKDate } from '@/lib/time';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';

const taskSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const tasksData = await tasksApi.getTasks();
      const projectsData = await projectsApi.getTaskEligibleProjects(); 
      setTasks(tasksData);
      setProjects(projectsData);
    } catch (error) {
      toast.error('Failed to load tasks data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      project_id: '',
      title: '',
      description: '',
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
      toast.error(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      await tasksApi.updateTask(taskId, { status });
      toast.success('Task status updated');
      await fetchData();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">My Tasks</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">Manage and track your daily tasks</p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/manager/time-logs" 
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl border-[var(--border-default)] h-11 px-6 font-bold text-xs uppercase tracking-widest text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]")}
          >
            <Clock className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />
            Time Logs
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--accent-primary)] hover:opacity-90 h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-widest border-none text-white shadow-sm">
                <Plus className="mr-2 h-4 w-4 text-white" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-10">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">Create Task</DialogTitle>
                <DialogDescription className="text-sm font-medium text-[var(--text-muted)]">
                  Add a new task to your active pipeline.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)]">
                            <SelectValue placeholder="Select project..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-medium text-sm">{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold uppercase tracking-tight text-rose-500" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. System Architecture Audit" className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold uppercase tracking-tight text-rose-500" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Details or scope of this task..." className="resize-none rounded-xl border-[var(--border-default)] min-h-[100px] font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold uppercase tracking-tight text-rose-500" />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)]">
                              <SelectValue placeholder="Select priority..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                            <SelectItem value="low" className="font-medium text-sm">Low</SelectItem>
                            <SelectItem value="medium" className="font-medium text-sm">Medium</SelectItem>
                            <SelectItem value="high" className="font-medium text-sm">High</SelectItem>
                            <SelectItem value="critical" className="font-medium text-sm text-rose-600">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] font-bold uppercase tracking-tight text-rose-500" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="due_date" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Due Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" className="rounded-xl border-[var(--border-default)] h-11 font-medium bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] focus:bg-[var(--bg-surface)]" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold uppercase tracking-tight text-rose-500" />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-[var(--accent-primary)] hover:opacity-90 h-12 rounded-xl font-bold uppercase tracking-widest text-xs border-none text-white shadow-sm">
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                      Create Task
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Card className="rounded-xl shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden text-[var(--text-primary)]">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : tasks.length === 0 ? (
            <EmptyState 
                title="No tasks found"
                description="Create your first task to start tracking your work."
                icon={CheckSquare}
                action={
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-[var(--accent-primary)] hover:opacity-90 h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-widest border-none text-white shadow-sm"
                  >
                    Create Task
                  </Button>
                }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[380px] px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Task Title</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Priority</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actual Hours</TableHead>
                    <TableHead className="text-right px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Change Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-[var(--bg-subtle)]/30 transition-colors border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-primary)]">
                      <TableCell className="px-6 py-5">
                        <div className="font-bold text-[var(--text-primary)] text-sm leading-tight mb-1.5">{task.title}</div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                <Briefcase className="h-3 w-3 text-[var(--accent-primary)]" />
                                {task.project_title || 'Unlinked Project'}
                            </div>
                            {task.due_date && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                                    <Calendar className="h-3 w-3" />
                                    {formatPKDate(task.due_date)}
                                </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <StatusBadge status={task.priority} />
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                            <div className="text-sm font-black text-[var(--text-secondary)]">
                                {task.actual_duration_minutes > 0 ? `${(task.actual_duration_minutes / 60).toFixed(1)}h` : '0.0h'}
                            </div>
                            {task.expected_duration_minutes > 0 && (
                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Budget: {(task.expected_duration_minutes / 60).toFixed(1)}h</div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-5">
                        <Select 
                          value={task.status} 
                          onValueChange={(val: any) => updateTaskStatus(task.id, val)}
                        >
                          <SelectTrigger className="w-[140px] h-9 rounded-lg border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-[10px] font-bold uppercase tracking-widest shadow-sm inline-flex">
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                            <SelectItem value="created" className="text-[10px] font-bold uppercase tracking-widest">Pending</SelectItem>
                            <SelectItem value="in_progress" className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">In Progress</SelectItem>
                            <SelectItem value="blocked" className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Blocked</SelectItem>
                            <SelectItem value="completed" className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Completed</SelectItem>
                          </SelectContent>
                        </Select>
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
