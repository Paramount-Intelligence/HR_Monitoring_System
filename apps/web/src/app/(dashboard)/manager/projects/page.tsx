'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, Project } from '@/lib/api/projects';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { messagesApi } from '@/lib/api/messages';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Plus, Loader2, Briefcase, CheckCircle, XCircle, Search, ShieldCheck, Zap, Calendar, ExternalLink, MessageSquare
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
  due_date: z.string().min(1, 'Due date is required'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ManagerProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDiscussProject = async (project: Project) => {
    try {
      const conv = await messagesApi.getOrCreateContextThread({
        related_entity_type: 'project',
        related_entity_id: project.id,
        title: `Project: ${project.title}`
      });
      router.push(`/messages?conversation_id=${conv.id}`);
    } catch (error) {
      toast.error('Failed to open discussion: ' + getErrorMessage(error));
    }
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
    },
  });

  const loadProjects = async () => {
    setIsLoading(true);
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
    loadProjects();
  }, []);

  const handleApproveQuick = async (id: string) => {
    try {
      await projectsApi.approveProject(id, 'approved');
      toast.success('Project approved');
      loadProjects();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      await projectsApi.createProject(data as any);
      toast.success('Project created successfully');
      setIsDialogOpen(false);
      form.reset();
      loadProjects();
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Projects</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Projects</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Approve and manage project requests</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl border-none shadow-xl transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4 text-white" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none bg-[var(--bg-surface)] shadow-[var(--shadow-hard)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black tracking-tighter text-[var(--text-primary)]">Create Project</DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">
                Add a new project to your team's workspace
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Project Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Q4 Performance Audit" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Description</FormLabel>
                    <FormControl><Textarea placeholder="Define objectives and key results..." className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-default)] text-[var(--text-primary)] min-h-[120px] font-bold text-sm leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
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
                      <FormLabel className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-1">Target Deadline</FormLabel>
                      <FormControl><Input type="date" className="h-12 rounded-xl bg-[var(--bg-subtle)]/50 border-[var(--border-default)] font-bold text-[var(--text-primary)] focus:bg-[var(--bg-surface)] transition-all" {...field} /></FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end pt-6 gap-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 rounded-2xl border-none shadow-xl transition-all active:scale-95 flex-1">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                    Save Project
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
            <Zap className="h-6 w-6 text-[var(--accent-primary)]" />
            Team Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={8} cols={5} /></div>
          ) : projects.length === 0 ? (
            <div className="p-20">
              <EmptyState 
                  title="No projects found"
                  message="Your team's project pipeline is currently empty."
                  icon={Briefcase}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                    <TableHead className="w-[40%] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Project Title / Description</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Priority</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Deadline</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-[var(--bg-subtle)]/30 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28 text-[var(--text-primary)]">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{project.title}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 gap-1"
                              onClick={() => handleDiscussProject(project)}
                            >
                              <MessageSquare className="h-3 w-3" />
                              Discuss
                            </Button>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] leading-relaxed italic line-clamp-1 max-w-[350px]">
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
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">
                          <Calendar className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          {project.due_date ? formatPKDate(project.due_date) : 'No Date'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex justify-end gap-3">
                          {(project.approval_status === 'pending' || project.approval_status === 'pending_approval') && (
                            <>
                              <Button 
                                variant="outline" size="sm" 
                                className="h-11 w-11 p-0 rounded-xl text-emerald-600 border-[var(--border-subtle)] hover:border-emerald-100 hover:bg-emerald-50 transition-all"
                                onClick={() => handleApproveQuick(project.id)}
                              >
                                <CheckCircle className="h-5 w-5" />
                              </Button>
                              <Button 
                                variant="outline" size="sm" 
                                className="h-11 w-11 p-0 rounded-xl text-rose-600 border-[var(--border-subtle)] hover:border-rose-100 hover:bg-rose-50 transition-all"
                                onClick={() => router.push(`/manager/projects/details?id=${project.id}`)}
                              >
                                <XCircle className="h-5 w-5" />
                              </Button>
                            </>
                          )}
                          <Link href={`/manager/projects/details?id=${project.id}`}>
                            <Button variant="ghost" size="sm" className="h-11 rounded-xl px-5 font-black text-[var(--accent-primary)] text-[10px] uppercase tracking-[0.2em] hover:bg-[var(--bg-subtle)] transition-all">
                              Details
                              <ExternalLink className="ml-2 h-3.5 w-3.5 text-[var(--accent-primary)]" />
                            </Button>
                          </Link>
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
