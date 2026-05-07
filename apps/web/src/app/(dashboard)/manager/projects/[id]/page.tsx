'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, Calendar, Clock, Target, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';

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
      toast.error('Failed to load project details');
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
        toast.error('Failed to load project details');
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
      toast.error(error.response?.data?.detail || 'Failed to approve project');
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
      toast.error(error.response?.data?.detail || 'Failed to reject project');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
        <Briefcase className="h-12 w-12 text-slate-200 mb-4" />
        <h2 className="text-xl font-medium text-slate-900 mb-2">Project not found</h2>
        <p>The project you are looking for does not exist or you don't have access.</p>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white border-none">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved': return <Badge className="bg-emerald-100 text-emerald-800 border-none">{status}</Badge>;
      case 'pending':
      case 'pending_approval': return <Badge className="bg-amber-100 text-amber-800 border-none">Pending Approval</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-800 border-none">Completed</Badge>;
      case 'on_hold': return <Badge variant="secondary">On Hold</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge className="capitalize border-none">{status.replace('_', ' ')}</Badge>;
    }
  };

  const isManager = currentUser?.id === project.manager_id;
  const isPending = project.approval_status === 'pending' || project.approval_status === 'pending_approval';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/manager/projects" className="hover:text-blue-600 transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-sm font-medium text-slate-600">{project.title}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.title}</h1>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(project.approval_status)}
          {getPriorityBadge(project.priority)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-lg">Project Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{project.description}</p>
            </CardContent>
          </Card>

          {project.rejected_reason && (
            <Card className="shadow-sm border-rose-100 bg-rose-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Rejection Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-rose-700">{project.rejected_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {isManager && isPending && (
            <Card className="shadow-md border-blue-100 bg-blue-50/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Approval Actions
                </CardTitle>
                <CardDescription>Review and decide on this project request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={handleApprove}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Approve Project
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold"
                  onClick={() => setIsRejectDialogOpen(true)}
                  disabled={isActionLoading}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Project
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <span className="font-semibold text-slate-900">{format(parseISO(project.created_at), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Target className="h-4 w-4" />
                  <span>Due Date</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {project.due_date ? format(parseISO(project.due_date), 'MMM d, yyyy') : 'No due date'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>Last Updated</span>
                </div>
                <span className="font-semibold text-slate-900">{format(parseISO(project.updated_at), 'MMM d, yyyy')}</span>
              </div>
              {project.approved_at && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approved On</span>
                  </div>
                  <span className="font-semibold text-emerald-700">{format(parseISO(project.approved_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Reject Project</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this project. This will be visible to the project owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="e.g. Budget constraints, scope overlap, or requires more details..."
              className="min-h-[100px] resize-none"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isActionLoading}>
              Cancel
            </Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white" 
              onClick={handleReject}
              disabled={isActionLoading || !rejectionReason.trim()}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import Link from 'next/link';
