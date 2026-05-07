'use client';

import { useEffect, useState } from 'react';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi, Project } from '@/lib/api/projects';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Plus, CheckSquare, Clock, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

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
      // Assuming GET /tasks with no args returns scoped tasks for the user
      const tasksData = await tasksApi.getTasks();
      // Only approved/active projects should accept tasks, assuming API handles this or we filter
      const projectsData = await projectsApi.getProjects({ project_status: 'active' }); 
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
        assigned_to: user.id, // assign to self by default for employees
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">Manage your assigned work and update progress.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/employee/time-logs" 
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Clock className="mr-2 h-4 w-4 text-blue-600" />
            Time Logs
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700" />}>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
                <DialogDescription>
                  Add a new task to an approved project.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem><FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Task Title</FormLabel><FormControl><Input placeholder="Implement login flow" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Details..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem><FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="due_date" render={({ field }) => (
                      <FormItem><FormLabel>Due Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Task
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <CheckSquare className="h-12 w-12 text-slate-200 mb-4" />
              <p>You have no assigned tasks.</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>Create a task</Button>
            </div>
          ) : (
            <div className="rounded-md border-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-[300px]">Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Time Logged</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{task.title}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <Briefcase className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">
                            {task.project_title || 'Unknown Project'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {task.actual_duration_minutes > 0 ? `${(task.actual_duration_minutes / 60).toFixed(1)}h` : '-'}
                        </div>
                        {task.expected_duration_minutes > 0 && (
                          <div className="text-xs text-slate-500">of {(task.expected_duration_minutes / 60).toFixed(1)}h</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          value={task.status} 
                          onValueChange={(val: any) => updateTaskStatus(task.id, val)}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs inline-flex float-right">
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created">Created</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
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
