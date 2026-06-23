'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { getErrorMessage } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, Calendar, Clock, Target, CheckCircle2, XCircle, AlertCircle, ShieldCheck, ChevronLeft, MessageSquare, Pencil, Archive } from 'lucide-react';
import { messagesApi } from '@/lib/api/messages';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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

const editProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  project_status: z.enum(['draft', 'pending_approval', 'approved', 'active', 'on_hold', 'completed', 'rejected', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

export default function ProjectDetailsPage() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('id');
      if (queryId) {
        setId(queryId);
      }
    }
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isDiscussionLoading, setIsDiscussionLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const editForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      title: '',
      description: '',
      due_date: '',
      project_status: 'active',
      priority: 'medium',
    },
  });

  const handleProjectDiscussion = async () => {
    if (!project) return;
    setIsDiscussionLoading(true);
    try {
      const thread = await messagesApi.getOrCreateContextThread({
        related_entity_type: 'project',
        related_entity_id: project.id,
        title: `Project: ${project.title}`
      });
      router.push(`/messages?conversation_id=${thread.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDiscussionLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const data = await projectsApi.getProject(id as string);
      setProject(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [projectData, userData] = await Promise.all([
          projectsApi.getProject(id as string),
          usersApi.getMe()
        ]);
        setProject(projectData);
        setCurrentUser(userData);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    if (id) init();
  }, [id]);

  const handleApprove = async () => {
    if (!project) return;
    setIsActionLoading(true);
    try {
      await projectsApi.approveProject(project.id, 'approved');
      toast.success('Project approved successfully');
      await fetchProject();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!project) return;
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsActionLoading(true);
    try {
      await projectsApi.approveProject(project.id, 'rejected', rejectionReason);
      toast.success('Project rejected');
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      await fetchProject();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const openEdit = () => {
    if (!project) return;
    editForm.reset({
      title: project.title,
      description: project.description || '',
      due_date: project.due_date ? project.due_date.split('T')[0] : '',
      project_status: project.project_status,
      priority: project.priority,
    });
    setIsEditOpen(true);
  };

  const onEditSubmit = async (data: EditProjectFormValues) => {
    if (!project) return;
    setIsActionLoading(true);
    try {
      const updated = await projectsApi.updateProject(project.id, {
        title: data.title,
        description: data.description,
        due_date: data.due_date || null,
        project_status: data.project_status,
        priority: data.priority,
      });
      setProject(updated);
      toast.success('Project updated');
      setIsEditOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!project) return;
    setIsActionLoading(true);
    try {
      await projectsApi.archiveProject(project.id);
      toast.success('Project archived');
      setIsArchiveOpen(false);
      router.push('/manager/projects');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-[var(--text-primary)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-primary)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Loading Project Details</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-6 text-[var(--text-primary)]">
        <div className="h-24 w-24 rounded-[2rem] bg-[var(--bg-subtle)] flex items-center justify-center mb-8 border border-[var(--border-subtle)]">
            <Briefcase className="h-10 w-10 text-[var(--text-muted)]" />
        </div>
        <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight mb-2">Project Not Found</h2>
        <p className="text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-widest max-w-xs">The project you are looking for does not exist or access is restricted.</p>
        <Button variant="ghost" className="mt-8 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] border-none" onClick={() => router.back()}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const isManager = currentUser?.id === project.manager_id;
  const canManage = isManager || currentUser?.role === 'admin' || currentUser?.role === 'hr_operations';
  const isPending = project.approval_status === 'pending' || project.approval_status === 'pending_approval';

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-2">
          <Link href="/manager/projects" className="group flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-all mb-4">
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Projects</span>
          </Link>
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Governance</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">{project.title}</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={project.approval_status} />
            <StatusBadge status={project.priority} />
          </div>
          <Button
            onClick={handleProjectDiscussion}
            disabled={isDiscussionLoading}
            className="btn-primary h-10 px-4 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-white border-none shadow-[var(--shadow-soft)] transition-all active:scale-[0.98]"
          >
            {isDiscussionLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
            Discuss Project
          </Button>
          {canManage && project.project_status !== 'archived' && (
            <>
              <Button variant="outline" onClick={openEdit} className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest">
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit Project
              </Button>
              <Button variant="outline" onClick={() => setIsArchiveOpen(true)} className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-amber-700 border-amber-200">
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden p-10 text-[var(--text-primary)]">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-[var(--text-secondary)] font-medium text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </CardContent>
          </Card>

          {project.rejected_reason && (
            <Card className="border-none shadow-[var(--shadow-soft)] bg-rose-50/30 rounded-[2.5rem] overflow-hidden p-10">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-sm font-black text-rose-600 flex items-center gap-2 uppercase tracking-widest">
                  <AlertCircle className="h-4 w-4" />
                  Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-sm font-bold text-rose-700/80 leading-relaxed italic">{project.rejected_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {isPending && (
            <Card className="border-none shadow-[var(--shadow-hard)] bg-[var(--accent-primary)] rounded-[2.5rem] overflow-hidden p-8 text-white">
              <CardHeader className="p-0 mb-6 text-white">
                <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-white/80" />
                  Project Approval
                </CardTitle>
                <CardDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-1">Review and take action on this project request</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <Button 
                  className="w-full h-12 bg-white hover:bg-white/90 text-[var(--accent-primary)] font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg border-none transition-all active:scale-[0.98]"
                  onClick={handleApprove}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--accent-primary)]" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />}
                  Approve Project
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full h-12 text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl border-none transition-all"
                  onClick={() => setIsRejectDialogOpen(true)}
                  disabled={isActionLoading}
                >
                  <XCircle className="mr-2 h-4 w-4 text-white" />
                  Reject Project
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden p-8 text-[var(--text-primary)]">
            <CardHeader className="p-0 mb-6 border-b border-[var(--border-subtle)] pb-4">
              <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Project Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="text-[10px] font-black uppercase tracking-widest">Manager</span>
                </div>
                <span className="text-xs font-black text-[var(--text-primary)]">
                  {safeDisplayLabel(project.manager_name, 'Unknown user', 'Project manager')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span className="text-[10px] font-black uppercase tracking-widest">Owner</span>
                </div>
                <span className="text-xs font-black text-[var(--text-primary)]">
                  {safeDisplayLabel(project.owner_name, 'Unknown user', 'Project owner')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Created At</span>
                </div>
                <span className="text-xs font-black text-[var(--text-primary)]">{format(parseISO(project.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Target className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Target Deadline</span>
                </div>
                <span className="text-xs font-black text-[var(--text-primary)]">
                  {project.due_date ? format(parseISO(project.due_date), 'MMM d, yyyy') : 'No Date'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Clock className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Updated At</span>
                </div>
                <span className="text-xs font-black text-[var(--text-primary)]">{format(parseISO(project.updated_at), 'MMM d, yyyy')}</span>
              </div>
              {project.approved_at && (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-2">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Approved</span>
                  </div>
                  <span className="text-xs font-black text-emerald-700">{format(parseISO(project.approved_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-rose-600">Reject Project</DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-muted)]">
              Provide a reason for rejecting this project request.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea 
              placeholder="Reason for rejection..."
              className="min-h-[140px] resize-none rounded-2xl bg-[var(--bg-subtle)] border-[var(--border-default)] text-sm text-[var(--text-primary)] leading-relaxed p-4 focus:bg-[var(--bg-surface)] transition-all"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isActionLoading} className="rounded-xl font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Cancel
            </Button>
            <Button 
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold border-none" 
              onClick={handleReject}
              disabled={isActionLoading || !rejectionReason.trim()}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update description, deadline, status, and priority.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex min-h-0 flex-1 flex-col">
              <DialogBody className={modalFormClass}>
              <FormField control={editForm.control} name="title" render={({ field }) => (
                <FormItem className={modalFormFieldClass}><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem className={modalFormFieldClass}><FormLabel>Description</FormLabel><FormControl><Textarea className="min-h-[100px] resize-none" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="due_date" render={({ field }) => (
                <FormItem className={modalFormFieldClass}><FormLabel>Target Deadline</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className={modalFormGridClass}>
                <FormField control={editForm.control} name="project_status" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><span>{field.value.replace('_', ' ')}</span></SelectTrigger></FormControl>
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
                <FormField control={editForm.control} name="priority" render={({ field }) => (
                  <FormItem className={modalFormFieldClass}>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><span>{field.value}</span></SelectTrigger></FormControl>
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
              </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isActionLoading}>
                  {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
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
    </div>
  );
}
