'use client';

import { useState, useEffect } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Clock, CheckSquare, Briefcase, FileText, XCircle, AlertCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function EODReviewsPage() {
  const [eods, setEods] = useState<EODReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedEod, setSelectedEod] = useState<EODReport | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | 'Needs Revision' | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEODs();
  }, []);

  async function loadEODs() {
    try {
      setIsLoading(true);
      const data = await eodApi.getTeamEODs();
      setEods(data);
    } catch (error) {
      toast.error('Failed to load team EODs');
    } finally {
      setIsLoading(false);
    }
  }

  function openReview(eod: EODReport) {
    setSelectedEod(eod);
    setComments(eod.manager_comments || '');
    setIsReviewOpen(true);
  }

  async function submitReview() {
    if (!selectedEod || !reviewAction) return;
    
    if ((reviewAction === 'Rejected' || reviewAction === 'Needs Revision') && !comments.trim()) {
      toast.error('Comments are required when rejecting or requesting revision');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await eodApi.reviewEOD(selectedEod.id, reviewAction, comments);
      setEods(eods.map(e => e.id === updated.id ? updated : e));
      toast.success(`EOD ${reviewAction}`);
      setIsReviewOpen(false);
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  const pendingEods = eods.filter(e => e.status === 'Pending Approval');
  const pastEods = eods.filter(e => e.status !== 'Pending Approval' && e.status !== 'Generated' && e.status !== 'Draft');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">EOD Reviews</h1>
          <p className="text-sm text-slate-500">Review and approve team end-of-day reports.</p>
        </div>
      </div>

      {pendingEods.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Action Required</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingEods.map((eod) => (
              <Card key={eod.id} className="shadow-sm border-blue-200 hover:border-blue-300 transition-all cursor-pointer" onClick={() => openReview(eod)}>
                <CardContent className="p-4 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 text-amber-700 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">
                        {eod.user_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{eod.user_name}</h3>
                        <p className="text-xs text-slate-500">{eod.date}</p>
                      </div>
                    </div>
                    {eod.blocked_tasks > 0 && <AlertCircle className="h-4 w-4 text-rose-500" />}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-2 rounded">
                    <div><span className="font-medium text-slate-900">{eod.total_hours}h</span> logged</div>
                    <div><span className="font-medium text-slate-900">{eod.completed_tasks}</span> tasks done</div>
                    <div><span className="font-medium text-slate-900">{eod.duties_performed}</span> duties</div>
                    <div className="uppercase">{eod.work_mode}</div>
                  </div>
                  
                  <div className="mt-auto pt-3 border-t">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                      Review &rarr;
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastEods.length > 0 && (
        <div className="space-y-4 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Past Reviews</h2>
          <Card className="shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Hours</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastEods.map((eod) => (
                    <tr key={eod.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{eod.user_name}</td>
                      <td className="px-4 py-3 text-slate-500">{eod.date}</td>
                      <td className="px-4 py-3 text-slate-500">{eod.total_hours}h</td>
                      <td className="px-4 py-3">
                        <Badge variant={eod.status === 'Approved' ? 'default' : eod.status === 'Needs Revision' ? 'destructive' : 'secondary'} 
                               className={eod.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}>
                          {eod.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openReview(eod)} className="text-blue-600 hover:text-blue-700">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {eods.length === 0 && (
        <div className="text-center py-16 border rounded-xl border-dashed bg-slate-50">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No EODs found</h3>
          <p className="mt-2 text-sm text-slate-500">Your team hasn't generated any EOD reports yet.</p>
        </div>
      )}

      {selectedEod && (
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>EOD Review: {selectedEod.user_name}</DialogTitle>
              <DialogDescription>
                Detailed end-of-day report for {selectedEod.date}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 my-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Attendance ({selectedEod.work_mode.toUpperCase()})</p>
                <p className="font-medium">{selectedEod.login_time} - {selectedEod.logout_time || 'N/A'}</p>
                <p className="font-bold text-blue-600 mt-1">{selectedEod.total_hours}h total</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs text-slate-500 mb-1">Productivity</p>
                <p className="font-medium">{selectedEod.productivity_score}/100 Score</p>
                <p className="font-bold text-slate-700 mt-1">{selectedEod.duties_performed} duties done</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border col-span-2 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tasks Summary</p>
                  <div className="flex gap-4">
                    <span className="font-medium text-emerald-600">{selectedEod.completed_tasks} Completed</span>
                    <span className="font-medium text-amber-600">{selectedEod.pending_tasks} Pending</span>
                    {selectedEod.blocked_tasks > 0 && <span className="font-medium text-rose-600">{selectedEod.blocked_tasks} Blocked</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Manager Feedback / Comments</Label>
                <Textarea 
                  placeholder="Provide feedback or explain why revision is needed..." 
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              {selectedEod.status === 'Pending Approval' ? (
                <div className="flex gap-3 pt-2">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Approved'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Needs Revision'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Needs Revision' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                    Request Revision
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Rejected'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction(selectedEod.status as any); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Comments
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
