'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { approvalsApi, ApprovalCenterItem } from '@/lib/api/approvals';
import { getAvailableActions, hasApprovalAction } from '@/lib/approvals/approval-actions';
import { approveEodReport, rejectEodReport, requestEodRevision } from '@/lib/api/eod';
import { leavesApi } from '@/lib/api/leaves';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type EodNoteAction = 'reject' | 'request_revision';

export function ApprovalCenter({ scope = 'my_team' }: { scope?: 'my_team' | 'organization' }) {
  const [items, setItems] = useState<ApprovalCenterItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [eodNoteAction, setEodNoteAction] = useState<{ item: ApprovalCenterItem; action: EodNoteAction } | null>(null);
  const [eodNote, setEodNote] = useState('');
  const [eodSubmitting, setEodSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await approvalsApi.list({ scope, type, status, ...(search.trim() ? { search: search.trim() } : {}) });
      setItems(data.items);
      setSummary(data.summary);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const resolveLeave = async (item: ApprovalCenterItem, action: 'approved' | 'rejected' | 'clarified') => {
    try {
      await leavesApi.resolveRequest(item.id, {
        action,
        manager_comment: action === 'rejected' ? 'Rejected from Approval Center.' : 'Reviewed from Approval Center.',
      });
      toast.success('Approval updated');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const approveEod = async (item: ApprovalCenterItem) => {
    try {
      setEodSubmitting(true);
      await approveEodReport(item.id);
      toast.success('EOD approved');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setEodSubmitting(false);
    }
  };

  const submitEodNoteAction = async () => {
    if (!eodNoteAction) return;
    const note = eodNote.trim();
    if (!note) {
      toast.error('A note is required');
      return;
    }
    try {
      setEodSubmitting(true);
      if (eodNoteAction.action === 'reject') {
        await rejectEodReport(eodNoteAction.item.id, note);
        toast.success('EOD rejected');
      } else {
        await requestEodRevision(eodNoteAction.item.id, note);
        toast.success('Revision requested');
      }
      setEodNoteAction(null);
      setEodNote('');
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setEodSubmitting(false);
    }
  };

  useEffect(() => { void load(); }, [scope, type, status]);

  const renderActionButtons = (item: ApprovalCenterItem, compact = false) => {
    const actions = getAvailableActions(item);
    const showApprove = actions.includes('approve');
    const showRevision = actions.includes('request_revision');
    const showReject = actions.includes('reject');
    const isLeaveOrWfh = item.type === 'leave' || item.type === 'wfh';
    const isEod = item.type === 'eod';

    const reviewButton = (
      <Button asChild size="sm" variant="outline">
        <Link href={item.action_url}>Review</Link>
      </Button>
    );

    const approveButton = showApprove && isLeaveOrWfh ? (
      <Button size="sm" onClick={() => resolveLeave(item, 'approved')}>Approve</Button>
    ) : showApprove && isEod ? (
      <Button size="sm" onClick={() => approveEod(item)} disabled={eodSubmitting}>Approve</Button>
    ) : null;

    const revisionButton = showRevision && isLeaveOrWfh ? (
      <Button size="sm" variant="outline" onClick={() => resolveLeave(item, 'clarified')}>Request Revision</Button>
    ) : showRevision && isEod ? (
      <Button size="sm" variant="outline" onClick={() => { setEodNoteAction({ item, action: 'request_revision' }); setEodNote(''); }}>Request Revision</Button>
    ) : null;

    const rejectButton = showReject && isLeaveOrWfh ? (
      <Button size="sm" variant="destructive" onClick={() => resolveLeave(item, 'rejected')}>Reject</Button>
    ) : showReject && isEod ? (
      <Button size="sm" variant="destructive" onClick={() => { setEodNoteAction({ item, action: 'reject' }); setEodNote(''); }}>Reject</Button>
    ) : null;

    if (compact) {
      const menuItems = [
        { key: 'review', label: 'Review', href: item.action_url },
        showApprove ? { key: 'approve', label: 'Approve' } : null,
        showRevision ? { key: 'revision', label: 'Request Revision' } : null,
        showReject ? { key: 'reject', label: 'Reject', destructive: true } : null,
      ].filter(Boolean) as Array<{ key: string; label: string; href?: string; destructive?: boolean }>;

      if (menuItems.length <= 1 && menuItems[0]?.href) {
        return reviewButton;
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline"><MoreHorizontal className="mr-2 h-4 w-4" />Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuItems.map((entry) => (
              entry.href ? (
                <DropdownMenuItem key={entry.key} asChild>
                  <Link href={entry.href}>{entry.label}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={entry.key}
                  className={entry.destructive ? 'text-red-600 focus:text-red-600' : undefined}
                  onClick={() => {
                    if (entry.key === 'approve' && isEod) void approveEod(item);
                    else if (entry.key === 'approve' && isLeaveOrWfh) void resolveLeave(item, 'approved');
                    else if (entry.key === 'revision' && isEod) { setEodNoteAction({ item, action: 'request_revision' }); setEodNote(''); }
                    else if (entry.key === 'revision' && isLeaveOrWfh) void resolveLeave(item, 'clarified');
                    else if (entry.key === 'reject' && isEod) { setEodNoteAction({ item, action: 'reject' }); setEodNote(''); }
                    else if (entry.key === 'reject' && isLeaveOrWfh) void resolveLeave(item, 'rejected');
                  }}
                >
                  {entry.label}
                </DropdownMenuItem>
              )
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        {hasApprovalAction(item, 'review') && reviewButton}
        {approveButton}
        {revisionButton}
        {rejectButton}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approval Center</h1>
          <p className="text-sm text-[var(--text-secondary)]">Unified review queue for EOD, leave, WFH, and attendance corrections.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCcw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {['pending', 'approved', 'rejected', 'needs_revision'].map((key) => (
          <Card key={key}><CardHeader className="p-4 pb-2"><CardTitle className="text-xs uppercase text-[var(--text-muted)]">{key.replace('_', ' ')}</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-2xl font-bold">{summary[key] ?? 0}</CardContent></Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search approvals" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-52"><span>{type.replace('_', ' ')}</span></SelectTrigger><SelectContent>{['all', 'eod', 'leave', 'wfh', 'attendance_correction'].map((v) => <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><span>{status.replace('_', ' ')}</span></SelectTrigger><SelectContent>{['pending', 'approved', 'rejected', 'needs_revision', 'all'].map((v) => <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
        <Button onClick={load}>Apply</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> : items.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-[var(--text-muted)]">No approval items found.</TableCell></TableRow> : items.map((item) => (
                <TableRow key={`${item.type}-${item.id}`}>
                  <TableCell><div className="font-semibold">{item.title}</div><div className="text-xs text-[var(--text-muted)]">{item.description}</div></TableCell>
                  <TableCell>{item.user_name}<div className="text-xs text-[var(--text-muted)]">{item.user_email}</div></TableCell>
                  <TableCell>{item.department || 'Unassigned'}</TableCell>
                  <TableCell>{item.business_date || (item.submitted_at ? item.submitted_at.slice(0, 10) : '-')}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <div className="hidden md:flex flex-wrap gap-2">{renderActionButtons(item)}</div>
                    <div className="md:hidden">{renderActionButtons(item, true)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(eodNoteAction)} onOpenChange={(open) => { if (!open) { setEodNoteAction(null); setEodNote(''); } }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{eodNoteAction?.action === 'reject' ? 'Reject EOD' : 'Request EOD Revision'}</DialogTitle>
            <DialogDescription>
              {eodNoteAction?.action === 'reject'
                ? 'Provide a reason for rejecting this EOD report.'
                : 'Explain what needs to be revised before this EOD can be approved.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={eodNote}
            onChange={(e) => setEodNote(e.target.value)}
            placeholder="Enter your note..."
            rows={4}
            className="rounded-xl"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setEodNoteAction(null); setEodNote(''); }} disabled={eodSubmitting}>Cancel</Button>
            <Button
              variant={eodNoteAction?.action === 'reject' ? 'destructive' : 'default'}
              onClick={() => void submitEodNoteAction()}
              disabled={eodSubmitting || !eodNote.trim()}
            >
              {eodNoteAction?.action === 'reject' ? 'Reject' : 'Request Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
