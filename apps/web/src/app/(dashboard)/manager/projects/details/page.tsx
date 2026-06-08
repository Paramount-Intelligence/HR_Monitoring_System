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
import { Loader2, Briefcase, Calendar, Clock, Target, CheckCircle2, XCircle, AlertCircle, ShieldCheck, ChevronLeft, MessageSquare } from 'lucide-react';
import { messagesApi } from '@/lib/api/messages';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';

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
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-black text-rose-600 tracking-tighter">Reject Project</DialogTitle>
            <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight leading-relaxed">
              Provide a reason for rejecting this project request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <Textarea 
              placeholder="Reason for rejection..."
              className="min-h-[140px] resize-none rounded-2xl bg-[var(--bg-subtle)] border-[var(--border-default)] font-bold text-sm text-[var(--text-primary)] leading-relaxed p-6 focus:bg-[var(--bg-surface)] transition-all"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isActionLoading} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1 border-none">
              Cancel
            </Button>
            <Button 
              className="h-12 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg border-none transition-all flex-1" 
              onClick={handleReject}
              disabled={isActionLoading || !rejectionReason.trim()}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
