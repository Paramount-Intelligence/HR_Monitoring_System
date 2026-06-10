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
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';

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

  const formatProductivity = (score: number | null | undefined) => {
    if (score == null || Number.isNaN(score)) return '—';
    return `${Math.round(score)}/100`;
  };

  return (
    <ManagerPageShell>
      <ManagerPageHeader
        title="EOD Review"
        subtitle="Review and verify daily EOD reports from your team"
        icon={ShieldCheck}
      />
      {isLoading ? (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-[var(--bg-subtle)] border-none" />)}
            </div>
            <TableSkeleton rows={8} cols={5} />
        </div>
      ) : (
        <>
          {pendingEods.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">Pending EOD Reports</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pendingEods.map((eod) => (
                  <Card key={eod.id} className="group rounded-[2rem] shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] hover:shadow-[var(--shadow-hard)] border-[var(--border-subtle)] transition-all cursor-pointer overflow-hidden text-[var(--text-primary)]" onClick={() => openReview(eod)}>
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                            {eod.user_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-sm leading-none mb-1">{eod.user_name}</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tighter">{formatPKDate(eod.date)}</p>
                          </div>
                        </div>
                        {eod.blocked_tasks > 0 && (
                            <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                            </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-[var(--bg-subtle)]/50 rounded-lg p-2 border border-[var(--border-subtle)]">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter leading-none mb-1 text-center">TRACKED HOURS</p>
                            <p className="text-sm font-bold text-[var(--text-primary)] text-center">{eod.total_hours}h</p>
                        </div>
                        <div className="bg-[var(--bg-subtle)]/50 rounded-lg p-2 border border-[var(--border-subtle)]">
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter leading-none mb-1 text-center">COMPLETED TASKS</p>
                            <p className="text-sm font-bold text-[var(--text-primary)] text-center">{eod.completed_tasks}</p>
                        </div>
                      </div>
                      
                      <div className="mt-auto">
                        <Button className="w-full bg-[var(--accent-primary)] hover:opacity-90 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg border-none text-white" size="sm">
                          REVIEW REPORT
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
              <h2 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">EOD Review History</h2>
              <Card className="rounded-[2rem] shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden text-[var(--text-primary)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase text-[10px] tracking-widest font-bold">
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="px-6 py-4 pl-10">Employee</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Logged Hours</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 pr-10 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {pastEods.map((eod) => (
                        <tr key={eod.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                          <td className="px-6 py-4 pl-10">
                            <span className="font-bold text-[var(--text-primary)]">{eod.user_name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{formatPKDate(eod.date)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-[var(--accent-primary)]">{eod.total_hours}h Tracked</span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={eod.status} />
                          </td>
                          <td className="px-6 py-4 pr-10 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openReview(eod)} className="text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)] font-bold text-[10px] uppercase tracking-widest">
                              VIEW
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
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>EOD Review: {selectedEod.user_name}</DialogTitle>
              <DialogDescription>
                Reviewing EOD report for {formatPKDate(selectedEod.date)}.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--bg-subtle)]/50 rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    <Clock className="h-3.5 w-3.5" />
                    Attendance
                </div>
                <p className="font-bold text-[var(--text-primary)] mt-1">{selectedEod.login_time} - {selectedEod.logout_time || 'ACTIVE SESSION'}</p>
                <div className="mt-2 inline-flex items-center gap-2">
                    <span className="bg-[var(--accent-primary)] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold border-none">{selectedEod.total_hours}h HOURS LOGGED</span>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{selectedEod.work_mode}</span>
                </div>
              </div>
              <div className="p-4 bg-[var(--bg-subtle)]/50 rounded-xl border border-[var(--border-subtle)] flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Productivity Index
                </div>
                <p className="font-bold text-[var(--text-primary)] mt-1">{formatProductivity(selectedEod.productivity_score)}</p>
                <div className="mt-2 inline-flex items-center gap-2">
                    <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold border-none">{selectedEod.duties_performed} KEY ACTIONS</span>
                </div>
              </div>
              <div className="p-4 bg-[var(--bg-subtle)]/50 rounded-xl border border-[var(--border-subtle)] col-span-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">
                    <CheckSquare className="h-3.5 w-3.5" />
                    Tasks Status
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">Completed</span>
                        <span className="text-lg font-bold text-[var(--text-primary)]">{selectedEod.completed_tasks}</span>
                    </div>
                    <div className="flex flex-col border-x border-[var(--border-subtle)] px-4">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-tighter">Pending</span>
                        <span className="text-lg font-bold text-[var(--text-primary)]">{selectedEod.pending_tasks}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-tighter">Blocked</span>
                        <span className="text-lg font-bold text-[var(--text-primary)]">{selectedEod.blocked_tasks}</span>
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 mt-4 border-t border-[var(--border-subtle)]">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Manager Feedback</Label>
                <Textarea 
                  placeholder="Add review comments or revision instructions..." 
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  className="min-h-[100px] rounded-xl border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] font-semibold p-4"
                />
              </div>
            </div>
            </DialogBody>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedEod.status === 'Pending Approval' ? (
                <>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold h-9 border-none text-white" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Approved'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <ShieldCheck className="mr-2 h-4 w-4 text-white" />}
                    Approve
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-xl font-bold h-9" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Needs Revision'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Needs Revision' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                    Request Revision
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-xl font-bold h-9 text-rose-700" 
                    disabled={isSubmitting}
                    onClick={() => { setReviewAction('Rejected'); setTimeout(submitReview, 0); }}
                  >
                    {isSubmitting && reviewAction === 'Rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                </>
              ) : (
                <Button 
                  className="w-full bg-[var(--text-primary)] hover:opacity-90 rounded-xl font-bold h-9 border-none text-white text-xs" 
                  disabled={isSubmitting}
                  onClick={() => { setReviewAction(selectedEod.status as any); setTimeout(submitReview, 0); }}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : null}
                  Update Comments
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ManagerPageShell>
  );
}
