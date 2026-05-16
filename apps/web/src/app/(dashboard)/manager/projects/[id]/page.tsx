'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { getErrorMessage } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, Calendar, Clock, Target, CheckCircle2, XCircle, AlertCircle, ShieldCheck, ChevronLeft } from 'lucide-react';
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
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Initiative Details</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-6">
        <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-8">
            <Briefcase className="h-10 w-10 text-slate-200" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Initiative Not Found</h2>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest max-w-xs">The project you are looking for does not exist or access is restricted.</p>
        <Button variant="ghost" className="mt-8 font-black text-[10px] uppercase tracking-widest" onClick={() => router.back()}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const isManager = currentUser?.id === project.manager_id;
  const isPending = project.approval_status === 'pending' || project.approval_status === 'pending_approval';

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-2">
          <Link href="/manager/projects" className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all mb-4">
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Projects</span>
          </Link>
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Initiative Governance</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{project.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={project.approval_status} />
          <StatusBadge status={project.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden p-10">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Strategic Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-slate-600 font-medium text-sm leading-relaxed whitespace-pre-wrap">{project.description}</p>
            </CardContent>
          </Card>

          {project.rejected_reason && (
            <Card className="border-none shadow-premium bg-rose-50/30 rounded-[2.5rem] overflow-hidden p-10">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-sm font-black text-rose-600 flex items-center gap-2 uppercase tracking-widest">
                  <AlertCircle className="h-4 w-4" />
                  Governance Feedback
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
            <Card className="border-none shadow-premium-lg bg-indigo-600 rounded-[2.5rem] overflow-hidden p-8 text-white">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-indigo-200" />
                  Governance Review
                </CardTitle>
                <CardDescription className="text-indigo-100/60 font-bold uppercase text-[10px] tracking-widest mt-1">Review and Decisive Action Required</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <Button 
                  className="w-full h-12 bg-white hover:bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all active:scale-[0.98]"
                  onClick={handleApprove}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Approve Initiative
                </Button>
                <Button 
                  variant="ghost"
                  className="w-full h-12 text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all"
                  onClick={() => setIsRejectDialogOpen(true)}
                  disabled={isActionLoading}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Decline Proposal
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden p-8">
            <CardHeader className="p-0 mb-6 border-b border-slate-50 pb-4">
              <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Initiative Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Initialized</span>
                </div>
                <span className="text-xs font-black text-slate-900">{format(parseISO(project.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Target className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Target Deadline</span>
                </div>
                <span className="text-xs font-black text-slate-900">
                  {project.due_date ? format(parseISO(project.due_date), 'MMM d, yyyy') : 'PERPETUAL'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Synchronized</span>
                </div>
                <span className="text-xs font-black text-slate-900">{format(parseISO(project.updated_at), 'MMM d, yyyy')}</span>
              </div>
              {project.approved_at && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
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
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-black text-rose-600 tracking-tighter">Decline Initiative</DialogTitle>
            <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-tight leading-relaxed">
              Provide justification for declining this proposal. This feedback will be recorded in the initiative audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <Textarea 
              placeholder="e.g. Strategic alignment gap, resource constraints, or scope overlap..."
              className="min-h-[140px] resize-none rounded-2xl bg-slate-50 border-slate-100 font-bold text-sm leading-relaxed p-6 focus:bg-white transition-all"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isActionLoading} className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 transition-all flex-1">
              Cancel
            </Button>
            <Button 
              className="h-12 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-rose-100 transition-all flex-1" 
              onClick={handleReject}
              disabled={isActionLoading || !rejectionReason.trim()}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
