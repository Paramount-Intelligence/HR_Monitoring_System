'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { messagesApi } from '@/lib/api/messages';
import { User } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2, Briefcase, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDate } from '@/lib/time';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { EmployeeDataTable } from '@/components/employee/EmployeeDataTable';

const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDiscussProject = async (project: Project) => {
    try {
      const conv = await messagesApi.getOrCreateContextThread({
        related_entity_type: 'project',
        related_entity_id: project.id,
        title: `Project: ${project.title}`,
      });
      router.push(`/messages?conversation_id=${conv.id}`);
    } catch (error) {
      toast.error('Failed to open discussion: ' + getErrorMessage(error));
    }
  };

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
          usersApi.getMe(),
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
    defaultValues: { title: '', description: '', priority: 'medium', due_date: '' },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      await projectsApi.createProject({
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : undefined,
        manager_id: user?.manager_id || undefined,
      });
      toast.success('Project proposed successfully');
      setIsDialogOpen(false);
      form.reset();
      await fetchProjects();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.project_status === 'active').length;
    const completed = projects.filter((p) => p.project_status === 'completed').length;
    const atRisk = projects.filter(
      (p) => p.project_status === 'on_hold' || p.approval_status === 'rejected'
    ).length;
    return { total: projects.length, active, completed, atRisk };
  }, [projects]);

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="My Projects"
        subtitle="Assigned projects and delivery progress"
        icon={Briefcase}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Propose Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
                <DialogDescription>Submit a new project request to your manager</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="project-form">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Project Title</FormLabel>
                        <FormControl><Input className="h-9 rounded-lg" placeholder="Project title" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Description</FormLabel>
                        <FormControl><Textarea className="min-h-[80px] rounded-lg resize-none" placeholder="Goals and success criteria..." {...field} /></FormControl>
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
                          <FormLabel className="text-xs">Due Date</FormLabel>
                          <FormControl><Input type="date" className="h-9 rounded-lg" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button type="submit" form="project-form" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Save Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard title="Assigned Projects" value={stats.total} icon={Briefcase} />
        <EmployeeMetricCard title="Active Projects" value={stats.active} icon={Briefcase} />
        <EmployeeMetricCard title="Completed" value={stats.completed} icon={Briefcase} />
        <EmployeeMetricCard title="At Risk / Blocked" value={stats.atRisk} icon={Briefcase} />
      </EmployeeMetricGrid>

      <EmployeeSectionCard title="Project List" icon={Briefcase} noPadding contentClassName="p-0">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
        ) : projects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No projects yet"
              description="Propose your first project to organize your tasks under it."
              icon={Briefcase}
              action={
                <Button size="sm" className="rounded-lg" onClick={() => setIsDialogOpen(true)}>
                  Propose Project
                </Button>
              }
            />
          </div>
        ) : (
          <EmployeeDataTable
            data={projects}
            emptyMessage="No projects"
            columns={[
              {
                key: 'title',
                header: 'Project',
                render: (project) => (
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{project.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-[var(--accent-primary)]"
                        onClick={() => handleDiscussProject(project)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Discuss
                      </Button>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{project.description}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => <StatusBadge status={p.project_status || p.approval_status} />,
              },
              {
                key: 'approval',
                header: 'Approval',
                render: (p) => <StatusBadge status={p.approval_status} />,
              },
              {
                key: 'priority',
                header: 'Priority',
                render: (p) => <StatusBadge status={p.priority} />,
              },
              {
                key: 'due',
                header: 'Due Date',
                render: (p) => (
                  <span className="text-[var(--text-secondary)] inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {p.due_date ? formatPKDate(p.due_date) : '—'}
                  </span>
                ),
              },
              {
                key: 'created',
                header: 'Created',
                render: (p) => formatPKDate(p.created_at),
              },
            ]}
          />
        )}
      </EmployeeSectionCard>
    </EmployeePageShell>
  );
}
