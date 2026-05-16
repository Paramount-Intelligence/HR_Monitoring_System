'use client';

import { useState, useEffect } from 'react';
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
  Plus, Loader2, Briefcase, CheckCircle, XCircle, Calendar, ShieldCheck, Zap
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

const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await projectsApi.getProjects();
      setProjects(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [projectsData, userData] = await Promise.all([
          projectsApi.getProjects(),
          usersApi.getMe()
        ]);
        setProjects(projectsData);
        setUser(userData);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      await projectsApi.createProject({
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined,
        manager_id: user?.manager_id || undefined
      });
      toast.success('Project proposed successfully');
      setIsDialogOpen(false);
      form.reset();
      await fetchProjects();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <Briefcase className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">New Project</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Projects</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Strategic Initiative Proposal Hub</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" />
              Propose Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">New Project</DialogTitle>
              <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                Submit a high-impact initiative for operational review
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Project Identity</FormLabel>
                    <FormControl><Input placeholder="e.g. Infrastructure Modernization" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Project Details</FormLabel>
                    <FormControl><Textarea placeholder="Define project goals and success criteria..." className="resize-none rounded-[1.5rem] bg-slate-50/50 border-slate-100 min-h-[120px] font-bold text-sm leading-relaxed p-6 focus:bg-white transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-6">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Priority Level</FormLabel>
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
                      <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Deadline</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-slate-50/50 border-slate-100 font-bold focus:bg-white transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-6 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1">Discard</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Proposal
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Zap className="h-6 w-6 text-indigo-600" />
              Active Projects
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={5} cols={5} /></div>
          ) : projects.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="No projects initialized"
                  message="Propose your first project container to begin organizing your professional work."
                  icon={Briefcase}
                  action={{
                      label: "New Proposal",
                      onClick: () => setIsDialogOpen(true)
                  }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 h-16">
                    <TableHead className="w-[45%] font-black text-[10px] uppercase tracking-widest text-slate-400 pl-10">Initiative Identity</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Criticality</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Timeline</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-slate-50/30 transition-all duration-300 border-b border-slate-50 last:border-0 h-28">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-black text-slate-900 text-sm tracking-tight">{project.title}</span>
                          <span className="text-[10px] font-bold text-slate-400 leading-relaxed italic line-clamp-1 max-w-[400px]">
                            {project.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.approval_status} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.priority} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                          {project.due_date ? formatPKDate(project.due_date) : 'PERPETUAL'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {formatPKDate(project.created_at)}
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
