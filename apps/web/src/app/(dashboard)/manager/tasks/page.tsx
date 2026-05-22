'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { messagesApi } from '@/lib/api/messages';
import { User } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { 
  Plus, Loader2, Briefcase, CheckCircle2, UserPlus, Search, ShieldCheck, Zap, Calendar, ExternalLink, Target, Users, MessageSquare
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDate } from '@/lib/time';

const assignTaskSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type AssignTaskFormValues = z.infer<typeof assignTaskSchema>;

export default function ManagerTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    setIsLoading(true);
    try {
      const [tasksData, projectsData, usersData] = await Promise.all([
        tasksApi.getTasks(),
        projectsApi.getTaskEligibleProjects(),
        usersApi.getUsers()
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setTeamMembers(usersData.filter(u => u.role !== 'admin' && u.role !== 'hr_operations'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const form = useForm<AssignTaskFormValues>({
    resolver: zodResolver(assignTaskSchema),
    defaultValues: {
      project_id: '',
      assigned_to: '',
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const onSubmit = async (data: AssignTaskFormValues) => {
    try {
      await tasksApi.createTask({
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined
      });
      toast.success('Task successfully delegated');
      setIsDialogOpen(false);
      form.reset();
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Team Tasks</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Team Tasks</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Create and assign tasks to your team</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl border-none shadow-xl transition-all active:scale-95">
              <UserPlus className="mr-2 h-4 w-4 text-white" />
              Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none bg-[var(--bg-surface)] shadow-[var(--shadow-hard)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">Assign Task</DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">
                Assign a new task to a team member
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-2 col-span-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Task Title</FormLabel>
                      <FormControl><Input placeholder="e.g. Infrastructure Audit" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Select project" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id} className="text-xs font-bold">{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assigned_to" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Select member" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          {teamMembers.map(u => (
                            <SelectItem key={u.id} value={u.id} className="text-xs font-bold">
                                {u.full_name} <span className="text-[8px] opacity-40 uppercase ml-1">({u.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Description</FormLabel>
                    <FormControl><Textarea placeholder="Define objectives and implementation steps..." className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-[var(--text-primary)] min-h-[100px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)]"><SelectValue placeholder="Set level" /></SelectTrigger></FormControl>
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
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Deadline</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-6 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1 border-none bg-transparent">Discard</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl border-none shadow-xl transition-all active:scale-95 flex-1">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                    Assign Task
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
            <Target className="h-6 w-6 text-[var(--accent-primary)]" />
            Task Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={8} cols={6} /></div>
          ) : tasks.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="No team tasks found"
                  message="No tasks have been assigned to your team yet."
                  icon={Briefcase}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                  <TableRow className="hover:bg-transparent h-16">
                    <TableHead className="w-[30%] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Task Title</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Project</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Assignee</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Priority</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-[var(--bg-subtle)]/30 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28 text-[var(--text-primary)]">
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
                          <span className="text-[10px] font-bold text-[var(--text-muted)] leading-relaxed italic line-clamp-1 max-w-[250px]">
                            {task.description || 'No brief provided'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-widest">
                            <Briefcase className="h-3.5 w-3.5 opacity-60" />
                            {task.project_title || 'General'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
                                <Users className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black text-[var(--text-primary)] tracking-tight">{task.assignee_name || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.priority} />
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">
                          <Calendar className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          {task.due_date ? formatPKDate(task.due_date) : 'No Date'}
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
