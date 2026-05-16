'use client';

import { useState, useEffect } from 'react';
import { tasksApi, Task } from '@/lib/api/tasks';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { 
  Plus, Loader2, Briefcase, CheckCircle2, UserPlus, Search, ShieldCheck, Zap, Calendar, ExternalLink, Target, Users
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Delegation Framework</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Team Tasks</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Operational Deployment & Progress Audit</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
              <UserPlus className="mr-2 h-4 w-4" />
              Delegate Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Delegate Responsibility</DialogTitle>
              <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                Assign a professional work unit to a team member
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-2 col-span-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Task Identity</FormLabel>
                      <FormControl><Input placeholder="e.g. Infrastructure Audit" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="project_id" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Project Context</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold"><SelectValue placeholder="Select initiative" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-premium-lg">
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
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold"><SelectValue placeholder="Select member" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-premium-lg">
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
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Operational Brief</FormLabel>
                    <FormControl><Textarea placeholder="Define objectives and implementation steps..." className="resize-none rounded-[1.5rem] bg-slate-50/50 border-slate-100 min-h-[100px] font-bold text-sm leading-relaxed p-6 focus:bg-white transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Criticality</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold"><SelectValue placeholder="Set level" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-premium-lg">
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
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Deadline</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-6 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1">Discard</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1 text-white">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Deploy Task
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50">
          <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Target className="h-6 w-6 text-indigo-600" />
            Operational Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={8} cols={6} /></div>
          ) : tasks.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="No active team tasks"
                  message="Your operational queue is currently clear. Delegate a new task to begin."
                  icon={Briefcase}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 h-16">
                    <TableHead className="w-[30%] font-black text-[10px] uppercase tracking-widest text-slate-400 pl-10">Work Unit</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Project</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Assignee</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Priority</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-slate-50/30 transition-all duration-300 border-b border-slate-50 last:border-0 h-28">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-black text-slate-900 text-sm tracking-tight">{task.title}</span>
                          <span className="text-[10px] font-bold text-slate-400 leading-relaxed italic line-clamp-1 max-w-[250px]">
                            {task.description || 'No brief provided'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                            <Briefcase className="h-3.5 w-3.5 opacity-60" />
                            {task.project_title || 'General'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <Users className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black text-slate-900 tracking-tight">{task.assignee_name || 'Unassigned'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={task.priority} />
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                          {task.due_date ? formatPKDate(task.due_date) : 'PERPETUAL'}
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
