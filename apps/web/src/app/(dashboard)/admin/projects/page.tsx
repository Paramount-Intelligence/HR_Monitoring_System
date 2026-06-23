'use client';

import { useEffect, useState } from 'react';
import { projectsApi, Project } from '@/lib/api/projects';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { Loader2, Briefcase, Plus, CheckCircle, XCircle, Pencil, Archive } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { safeDisplayLabel } from '@/lib/display-labels';
import { modalFormClass, modalFormFieldClass, modalFormGridClass } from '@/lib/modal-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const projectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  due_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const editProjectSchema = projectSchema.extend({
  project_status: z.enum(['draft', 'pending_approval', 'approved', 'active', 'on_hold', 'completed', 'rejected', 'archived']).optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);

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
      const data = await projectsApi.getProjects({ include_archived: showArchived });
      setProjects(data);
    } catch (error) {
      toast.error('Failed to load org projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [showArchived]);

  const editForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      project_status: 'active',
    },
  });

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    editForm.reset({
      title: project.title,
      description: project.description,
      priority: project.priority,
      due_date: project.due_date ? project.due_date.split('T')[0] : '',
      project_status: project.project_status,
    });
  };

  const onEditSubmit = async (data: EditProjectFormValues) => {
    if (!editingProject) return;
    try {
      await projectsApi.updateProject(editingProject.id, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date || null,
        project_status: data.project_status,
      });
      toast.success('Project updated');
      setEditingProject(null);
      loadProjects();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to update project');
    }
  };

  const handleArchive = async () => {
    if (!archivingProject) return;
    try {
      await projectsApi.archiveProject(archivingProject.id);
      toast.success('Project archived');
      setArchivingProject(null);
      loadProjects();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to archive project');
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
      const errorMessage = error.response?.data?.detail;
      if (typeof errorMessage === 'object' && errorMessage !== null) {
          toast.error(JSON.stringify(errorMessage));
      } else {
          toast.error(errorMessage || 'Failed to create project');
      }
    }
  };

  const handleApprove = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await projectsApi.approveProject(id, decision);
      toast.success(`Project ${decision}`);
      loadProjects();
    } catch (error: any) {
      toast.error('Failed to update project status');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{status}</Badge>;
      case 'pending':
      case 'pending_approval':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending Approval</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Organization Projects</h1>
          <p className="text-sm text-[var(--text-muted)]">View and manage all projects across the company.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-[var(--border-default)]"
            />
            Show archived
          </label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Add a new project to the organization roadmap.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className={modalFormClass}>
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}><FormLabel>Project Title</FormLabel><FormControl><Input placeholder="e.g. Q4 Growth Campaign" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}><FormLabel>Description</FormLabel><FormControl><Input placeholder="Brief project scope..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className={modalFormGridClass}>
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
                      <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                </DialogBody>
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-slate-900">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex min-h-0 flex-1 flex-col">
              <DialogBody className={modalFormClass}>
              <FormField control={editForm.control} name="title" render={({ field }) => (
                <FormItem className={modalFormFieldClass}><FormLabel>Project Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem className={modalFormFieldClass}><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className={modalFormGridClass}>
                <FormField control={editForm.control} name="priority" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}><FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                <FormField control={editForm.control} name="due_date" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="project_status" render={({ field }) => (
                <FormItem className={modalFormFieldClass}><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditingProject(null)}>Cancel</Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting}>Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archivingProject} onOpenChange={(open) => !open && setArchivingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide it from active project lists but keep history and time logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Briefcase className="h-12 w-12 text-slate-200 mb-4" />
              <p>No projects found in the organization.</p>
            </div>
          ) : (
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]">
                    <TableHead className="w-[300px]">Project</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="font-medium text-[var(--text-primary)]">{project.title}</div>
                        <div className="text-xs text-[var(--text-muted)] truncate max-w-[250px]">{project.description}</div>
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)] text-sm">
                        {safeDisplayLabel(project.manager_name, 'Unknown user', 'Project manager')}
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)] text-sm">
                        {safeDisplayLabel(project.owner_name, 'Unknown user', 'Project owner')}
                      </TableCell>
                      <TableCell>{getPriorityBadge(project.priority)}</TableCell>
                      <TableCell>{getStatusBadge(project.approval_status)}</TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        {project.due_date ? format(parseISO(project.due_date), 'PP') : '-'}
                      </TableCell>
                      <TableCell className="text-[var(--text-muted)]">
                        {format(parseISO(project.created_at), 'PP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {project.project_status !== 'archived' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(project)}
                                title="Edit project"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600"
                                onClick={() => setArchivingProject(project)}
                                title="Archive project"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(project.approval_status === 'pending' || project.approval_status === 'pending_approval') && (
                            <>
                            <Button 
                              variant="ghost" size="icon" 
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8"
                              onClick={() => handleApprove(project.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" 
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
                              onClick={() => handleApprove(project.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            </>
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
