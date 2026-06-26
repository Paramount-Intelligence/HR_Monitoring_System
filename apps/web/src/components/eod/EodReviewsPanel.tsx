'use client';

import { useEffect, useMemo, useState } from 'react';
import { eodApi, EODReport } from '@/lib/api/eod';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertCircle,
  CheckSquare,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPKDate, formatPKDateTime } from '@/lib/time';
import { SubmittedEodSection } from '@/components/eod/SubmittedEodSection';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface EodReviewsPanelProps {
  feedbackLabel?: string;
}

export function EodReviewsPanel({ feedbackLabel = 'Manager Feedback' }: EodReviewsPanelProps) {
  const [eods, setEods] = useState<EODReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportDate, setReportDate] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [selectedEod, setSelectedEod] = useState<EODReport | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | 'Needs Revision' | null>(null);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEODs = async () => {
    try {
      setIsLoading(true);
      const data = await eodApi.getTeamEODs({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        report_date: reportDate || undefined,
      });
      setEods(data);
    } catch {
      toast.error('Failed to load team EODs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEODs();
  }, [debouncedSearch, statusFilter, reportDate]);

  function openReview(eod: EODReport) {
    setSelectedEod(eod);
    setComments(eod.manager_comments || '');
    setReviewAction(null);
    setIsReviewOpen(true);
  }

  async function submitReview(action: 'Approved' | 'Rejected' | 'Needs Revision') {
    if (!selectedEod) return;
    if ((action === 'Rejected' || action === 'Needs Revision') && !comments.trim()) {
      toast.error('Comments are required when rejecting or requesting revision');
      return;
    }
    try {
      setReviewAction(action);
      setIsSubmitting(true);
      const updated = await eodApi.reviewEOD(selectedEod.id, action, comments);
      setEods((current) => current.map((e) => (e.id === updated.id ? updated : e)));
      toast.success(`EOD ${action}`);
      setIsReviewOpen(false);
      setSelectedEod(null);
    } catch {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
      setReviewAction(null);
    }
  }

  const pendingEods = useMemo(() => eods.filter((e) => e.status === 'Pending Approval'), [eods]);
  const pastEods = useMemo(
    () => eods.filter((e) => e.status !== 'Pending Approval' && e.status !== 'Generated' && e.status !== 'Draft'),
    [eods],
  );

  const formatProductivity = (score: number | null | undefined) => {
    if (score == null || Number.isNaN(score)) return '—';
    return `${Math.round(score)}/100`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role, department, or status"
            className="h-12 rounded-2xl pl-10 font-semibold text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-12 rounded-2xl w-full lg:w-[200px] font-bold text-xs uppercase tracking-widest">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Needs Revision">Needs Revision</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="h-12 rounded-2xl w-full lg:w-[180px] font-bold text-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse bg-[var(--bg-subtle)] border-none" />)}
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
                  <Card
                    key={eod.id}
                    className="group rounded-[2rem] shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] hover:shadow-[var(--shadow-hard)] border-[var(--border-subtle)] transition-all cursor-pointer overflow-hidden text-[var(--text-primary)]"
                    onClick={() => openReview(eod)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                            {eod.user_name.split(' ').map((n) => n[0]).join('')}
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
                          <td className="px-6 py-4 pl-10"><span className="font-bold text-[var(--text-primary)]">{eod.user_name}</span></td>
                          <td className="px-6 py-4"><span className="text-xs font-bold text-[var(--text-secondary)]">{formatPKDate(eod.date)}</span></td>
                          <td className="px-6 py-4"><span className="text-xs font-bold text-[var(--accent-primary)]">{eod.total_hours}h Tracked</span></td>
                          <td className="px-6 py-4"><StatusBadge status={eod.status} /></td>
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
              description="No EOD reports match your filters. Reports appear once direct reports submit their daily summaries."
              icon={ShieldCheck}
            />
          )}
        </>
      )}

      {selectedEod && (
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>EOD Review: {selectedEod.user_name}</DialogTitle>
              <DialogDescription>
                Reviewing EOD report for {formatPKDate(selectedEod.date)}
                {selectedEod.submitted_at ? ` · Submitted ${formatPKDateTime(selectedEod.submitted_at)}` : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="overflow-y-auto">
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
              <div className="mt-4">
                <SubmittedEodSection report={selectedEod} />
              </div>
              <div className="space-y-4 pt-4 mt-4 border-t border-[var(--border-subtle)]">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{feedbackLabel}</Label>
                  <Textarea
                    placeholder="Add review comments or revision instructions..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[100px] rounded-xl border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] font-semibold p-4"
                  />
                </div>
              </div>
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedEod.status === 'Pending Approval' ? (
                <>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold h-9 border-none text-white" disabled={isSubmitting} onClick={() => void submitReview('Approved')}>
                    {isSubmitting && reviewAction === 'Approved' ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <ShieldCheck className="mr-2 h-4 w-4 text-white" />}
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl font-bold h-9" disabled={isSubmitting} onClick={() => void submitReview('Needs Revision')}>
                    {isSubmitting && reviewAction === 'Needs Revision' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                    Request Revision
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl font-bold h-9 text-rose-700" disabled={isSubmitting} onClick={() => void submitReview('Rejected')}>
                    {isSubmitting && reviewAction === 'Rejected' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Reject
                  </Button>
                </>
              ) : (
                <Button className="w-full bg-[var(--text-primary)] hover:opacity-90 rounded-xl font-bold h-9 border-none text-white text-xs" disabled={isSubmitting} onClick={() => void submitReview(selectedEod.status as 'Approved' | 'Rejected' | 'Needs Revision')}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : null}
                  Update Comments
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
