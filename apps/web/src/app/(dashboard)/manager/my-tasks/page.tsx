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
      const projectsData = await projectsApi.getProjects({ projectStatus: 'active' }); 
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Personal Task Queue</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage and track your management-level execution units.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/manager/time-logs" 
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl border-slate-200 h-11 px-6 font-bold text-xs uppercase tracking-widest")}
          >
            <Clock className="mr-2 h-4 w-4 text-indigo-600" />
            Time Logs
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-widest shadow-premium">
                <Plus className="mr-2 h-4 w-4" />
                Initialize Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl border-none shadow-premium-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">Initialize New Task</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500">
                  Add a professional execution unit to your active pipeline.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200 h-11 font-medium bg-slate-50/50">
                            <SelectValue placeholder="Select target project..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-slate-100 shadow-premium-lg">
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-medium text-sm">{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold uppercase tracking-tight" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Task Heading</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. System Architecture Audit" className="rounded-xl border-slate-200 h-11 font-medium bg-slate-50/50" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold uppercase tracking-tight" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detailed Context</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Define execution parameters..." className="resize-none rounded-xl border-slate-200 min-h-[100px] font-medium bg-slate-50/50" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold uppercase tracking-tight" />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Priority Index</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-slate-200 h-11 font-medium bg-slate-50/50">
                              <SelectValue placeholder="Priority..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-slate-100 shadow-premium-lg">
                            <SelectItem value="low" className="font-medium text-sm">Low</SelectItem>
                            <SelectItem value="medium" className="font-medium text-sm">Medium</SelectItem>
                            <SelectItem value="high" className="font-medium text-sm">High</SelectItem>
                            <SelectItem value="critical" className="font-medium text-sm">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] font-bold uppercase tracking-tight" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="due_date" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deadline (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" className="rounded-xl border-slate-200 h-11 font-medium bg-slate-50/50" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold uppercase tracking-tight" />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold uppercase tracking-widest text-xs shadow-premium">
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      COMMIT TO QUEUE
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-xl shadow-premium border-slate-100 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : tasks.length === 0 ? (
            <EmptyState 
                title="Your queue is empty"
                description="Initialize your first management task to begin execution tracking."
                icon={CheckSquare}
                action={{
                    label: "Initialize Task",
                    onClick: () => setIsDialogOpen(true)
                }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[380px] px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-500">Execution Unit</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-500">Lifecycle Status</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-500">Priority Index</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-500">Utilization</TableHead>
                    <TableHead className="text-right px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-slate-500">Lifecycle Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                      <TableCell className="px-6 py-5">
                        <div className="font-bold text-slate-900 text-sm leading-tight mb-1.5">{task.title}</div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Briefcase className="h-3 w-3 text-indigo-400" />
                                {projects.find(p => p.id === task.project_id)?.title || 'Unlinked Project'}
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
                            <div className="text-sm font-black text-slate-700">
                                {task.actual_duration_minutes > 0 ? `${(task.actual_duration_minutes / 60).toFixed(1)}h` : '0.0h'}
                            </div>
                            {task.expected_duration_minutes > 0 && (
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Budget: {(task.expected_duration_minutes / 60).toFixed(1)}h</div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-5">
                        <Select 
                          value={task.status} 
                          onValueChange={(val: any) => updateTaskStatus(task.id, val)}
                        >
                          <SelectTrigger className="w-[140px] h-9 rounded-lg border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest shadow-sm inline-flex">
                            <SelectValue placeholder="Shift..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-100 shadow-premium-lg">
                            <SelectItem value="created" className="text-[10px] font-bold uppercase tracking-widest">Created</SelectItem>
                            <SelectItem value="in_progress" className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Active</SelectItem>
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
