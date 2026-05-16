'use client';

import { useState, useEffect } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertCircle, ShieldCheck, Clock, TrendingUp, CheckSquare, 
  Loader2, XCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPKDate } from '@/lib/time';

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

  const pendingEods = eods.filter(e => e.status === 'Pending Approval');
  const pastEods = eods.filter(e => e.status !== 'Pending Approval' && e.status !== 'Generated' && e.status !== 'Draft');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">EOD Command Center</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review and verify operational daily summaries from your team.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-slate-50 border-none" />)}
            </div>
            <TableSkeleton rows={8} cols={5} />
        </div>
      ) : (
        <>
          {pendingEods.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Verification Queue</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingEods.map((eod) => (
                  <Card key={eod.id} className="group rounded-xl shadow-premium hover:shadow-premium-lg border-slate-100 transition-all cursor-pointer overflow-hidden" onClick={() => openReview(eod)}>
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-50 text-indigo-700 h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ring-1 ring-indigo-100 uppercase">
                            {eod.user_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-none mb-1">{eod.user_name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{formatPKDate(eod.date)}</p>
                          </div>
                        </div>
                        {eod.blocked_tasks > 0 && (
                            <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                            </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1 text-center">UTILIZATION</p>
                            <p className="text-sm font-bold text-slate-900 text-center">{eods.find(e => e.id === eod.id)?.total_hours}h</p>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100/50">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1 text-center">COMPLETIONS</p>
                            <p className="text-sm font-bold text-slate-900 text-center">{eod.completed_tasks} Tasks</p>
                        </div>
                      </div>
                      
                      <div className="mt-auto">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100" size="sm">
                          OPEN INVESTIGATION
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastEods.length > 0 && (
            <div className="space-y-4 pt-4">
              <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Verification History</h2>
              <Card className="rounded-xl shadow-premium border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4">Employee Identity</th>
                        <th className="px-6 py-4">Filing Date</th>
                        <th className="px-6 py-4">Time Log</th>
                        <th className="px-6 py-4">Integrity Status</th>
                        <th className="px-6 py-4 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pastEods.map((eod) => (
                        <tr key={eod.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-900">{eod.user_name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-600">{formatPKDate(eod.date)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-indigo-600">{eod.total_hours}h Tracked</span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={eod.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openReview(eod)} className="text-indigo-600 hover:text-indigo-700 font-bold text-[10px] uppercase tracking-widest">
                              VIEW REPORT
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
            <EmptyState 
                title="No reports to review"
                description="Your team's EOD queue is empty. Reports appear once team members submit their daily summaries."
                icon={ShieldCheck}
            />
          )}
        </>
      )}

      {selectedEod && (
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="max-w-2xl rounded-2xl border-none shadow-premium-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">EOD Review: {selectedEod.user_name}</DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500">
                Verifying operational filing for {formatPKDate(selectedEod.date)}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Clock className="h-3.5 w-3.5" />
                    Attendance Metrics
                </div>
                <p className="font-bold text-slate-900 mt-1">{selectedEod.login_time} - {selectedEod.logout_time || 'ACTIVE'}</p>
                <div className="mt-2 inline-flex items-center gap-2">
                    <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{selectedEod.total_hours}h LOGGED</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedEod.work_mode}</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Productivity Audit
                </div>
                <p className="font-bold text-slate-900 mt-1">{selectedEod.productivity_score}% Efficiency Score</p>
                <div className="mt-2 inline-flex items-center gap-2">
                    <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">{selectedEod.duties_performed} DUTIES</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Task Execution Breakdown
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Completed</span>
                        <span className="text-lg font-bold text-slate-900">{selectedEod.completed_tasks}</span>
                    </div>
                    <div className="flex flex-col border-x border-slate-200 px-4">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Pending</span>
                        <span className="text-lg font-bold text-slate-900">{selectedEod.pending_tasks}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-tighter">Blocked</span>
                        <span className="text-lg font-bold text-slate-900">{selectedEod.blocked_tasks}</span>
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Manager Verification Feedback</Label>
                <Textarea 
                  placeholder="Annotate review with professional feedback or revision instructions..." 
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  className="min-h-[100px] rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {selectedEod.status === 'Pending Approval' ? (
                <div className="flex gap-3 pt-2">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold h-11 shadow-sm" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Approved'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    APPROVE REPORT
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl font-bold h-11 shadow-sm" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Needs Revision'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Needs Revision' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                    REQUEST REVISION
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold h-11 shadow-sm" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Rejected'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    REJECT REPORT
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button 
                    className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl font-bold h-11 shadow-sm uppercase tracking-widest text-xs" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction(selectedEod.status as any); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    UPDATE AUDIT COMMENTS
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
