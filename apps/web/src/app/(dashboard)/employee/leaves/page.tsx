'use client';

import { useEffect, useState } from 'react';
import { leavesApi, LeaveRequest, ApprovalTimelineEntry } from '@/lib/api/leaves';
import { getErrorMessage } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { 
  Loader2, Calendar, Clock, Plus, Info, XCircle, 
  ShieldCheck, AlertCircle, CheckCircle2, History,
  LayoutDashboard, MapPin, Home, ArrowRight, Plane
} from 'lucide-react';
import { 
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ApprovalTimeline } from '@/components/approvals/approval-timeline';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn, cleanReason } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';

export default function EmployeeLeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveType, setLeaveType] = useState<'sick' | 'casual' | 'annual' | 'half_day' | 'wfh'>('annual');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<'first_half' | 'second_half'>('first_half');

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [timelineEntries, setTimelineEntries] = useState<ApprovalTimelineEntry[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await leavesApi.getMyRequests();
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load leave history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeline = async (id: string) => {
    setIsTimelineLoading(true);
    try {
      const data = await leavesApi.getTimeline(id);
      setTimelineEntries(data);
    } catch (error) {
      toast.error('Failed to load timeline');
    } finally {
      setIsTimelineLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (leaveType === 'half_day' && !halfDayPeriod) {
      toast.error('Please select a Half Day period');
      return;
    }

    setIsSubmitLoading(true);
    try {
      await leavesApi.submitRequest({
        start_date: startDate,
        end_date: leaveType === 'half_day' ? startDate : endDate,
        leave_type: leaveType,
        reason,
        is_half_day: leaveType === 'half_day',
        half_day_period: leaveType === 'half_day' ? halfDayPeriod : null,
      });
      toast.success('Leave request submitted successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Submission failed');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await leavesApi.cancelRequest(id);
      toast.success('Request revoked successfully');
      fetchRequests();
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  };

  const resetForm = () => {
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setLeaveType('annual');
    setReason('');
    setIsHalfDay(false);
    setHalfDayPeriod('first_half');
  };

  const stats = [
    { 
      label: "Pending Approvals", 
      value: requests.filter(r => r.status === 'pending').length, 
      icon: Clock, 
      color: "text-amber-600", 
      bg: "bg-amber-50" 
    },
    { 
      label: "Approved Requests", 
      value: requests.filter(r => r.status === 'approved').length, 
      icon: CheckCircle2, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50" 
    },
    { 
      label: "Rejected Requests", 
      value: requests.filter(r => r.status === 'rejected').length, 
      icon: XCircle, 
      color: "text-rose-600", 
      bg: "bg-rose-50" 
    },
    { 
      label: "Approved WFH Requests", 
      value: requests.filter(r => r.leave_type === 'wfh' && r.status === 'approved').length, 
      icon: Home, 
      color: "text-[var(--accent-primary)]", 
      bg: "bg-indigo-50" 
    }
  ];

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="Leaves"
        subtitle="Requests, approvals, and work-from-home history"
        icon={Plane}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-lg text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Leave Request</DialogTitle>
                  <DialogDescription>Submit a request for leave or WFH with operational context for review.</DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Request Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'annual', label: 'Annual' },
                      { id: 'sick', label: 'Sick' },
                      { id: 'casual', label: 'Casual' },
                      { id: 'wfh', label: 'WFH' },
                      { id: 'half_day', label: 'Half Day' },
                    ].map((type) => (
                      <div 
                        key={type.id}
                        onClick={() => {
                          setLeaveType(type.id as any);
                          setIsHalfDay(type.id === 'half_day');
                        }}
                        className={cn(
                          "cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center text-center font-black text-[10px] uppercase tracking-widest h-14",
                          leaveType === type.id 
                            ? "bg-indigo-50 border-indigo-200 text-[var(--accent-primary)] shadow-sm ring-4 ring-indigo-50/50" 
                            : "bg-[var(--bg-surface)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                        )}
                      >
                        {type.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="start" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Start Date</Label>
                    <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-14 border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-2xl bg-[var(--bg-subtle)] font-bold text-[var(--text-primary)]" required />
                  </div>
                  {leaveType !== 'half_day' && (
                    <div className="space-y-2">
                      <Label htmlFor="end" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">End Date</Label>
                      <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-14 border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-2xl bg-[var(--bg-subtle)] font-bold text-[var(--text-primary)]" required />
                    </div>
                  )}
                </div>

                {leaveType === 'half_day' && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Period Option</Label>
                    <RadioGroup value={halfDayPeriod} onValueChange={(val: any) => setHalfDayPeriod(val)} className="flex gap-4">
                      <div className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer flex-1",
                        halfDayPeriod === 'first_half' ? "bg-indigo-50 border-indigo-200" : "bg-[var(--bg-surface)] border-[var(--border-default)]"
                      )} onClick={() => setHalfDayPeriod('first_half')}>
                        <RadioGroupItem value="first_half" id="first_half" className="h-4 w-4" />
                        <Label htmlFor="first_half" className="font-black text-[var(--text-secondary)] text-[10px] uppercase tracking-widest cursor-pointer">First Half</Label>
                      </div>
                      <div className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer flex-1",
                        halfDayPeriod === 'second_half' ? "bg-indigo-50 border-indigo-200" : "bg-[var(--bg-surface)] border-[var(--border-default)]"
                      )} onClick={() => setHalfDayPeriod('second_half')}>
                        <RadioGroupItem value="second_half" id="second_half" className="h-4 w-4" />
                        <Label htmlFor="second_half" className="font-black text-[var(--text-secondary)] text-[10px] uppercase tracking-widest cursor-pointer">Second Half</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Reason</Label>
                  <Textarea id="reason" placeholder="Provide a reason for this request..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[120px] border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold p-5 resize-none" required />
                </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="ghost" type="button" size="sm" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                  <Button type="submit" size="sm" disabled={isSubmitLoading}>
                    {isSubmitLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard title="Pending Requests" value={stats[0].value} icon={Clock} />
        <EmployeeMetricCard title="Approved Requests" value={stats[1].value} icon={CheckCircle2} />
        <EmployeeMetricCard title="Rejected Requests" value={stats[2].value} icon={XCircle} />
        <EmployeeMetricCard title="Approved WFH" value={stats[3].value} icon={Home} />
      </EmployeeMetricGrid>

      <EmployeeSectionCard title="Request History" icon={History} noPadding contentClassName="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={5} cols={5} /></div>
          ) : requests.length === 0 ? (
            <div className="p-20 text-center">
              <EmptyState title="No leave requests" description="You have not submitted any leave requests yet." icon={Plane} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                    <TableHead className="w-[220px] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Timeline</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Type</TableHead>
                    <TableHead className="max-w-[300px] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Reason</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-[var(--bg-subtle)]/50 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-24">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-[var(--text-primary)] tracking-tight">
                            {format(parseISO(req.start_date), 'MMM d, yyyy')}
                          </span>
                          {req.start_date !== req.end_date && (
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter flex items-center gap-2">
                              to <ArrowRight className="h-3 w-3" /> {format(parseISO(req.end_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {req.is_half_day && (
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100 py-0 mt-1 border-none">
                              {req.half_day_period?.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-xl flex items-center justify-center",
                            req.leave_type === 'wfh' ? "bg-indigo-50 text-[var(--accent-primary)]" : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                          )}>
                            {req.leave_type === 'wfh' ? <Home className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                          </div>
                          <span className="capitalize font-black text-[var(--text-secondary)] text-[10px] uppercase tracking-widest">{req.leave_type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs font-bold text-[var(--text-secondary)] line-clamp-2 leading-relaxed italic pr-4">
                          {cleanReason(req.reason)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex justify-end gap-3">
                          {req.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl" onClick={() => handleCancel(req.id)}>
                              <XCircle className="h-5 w-5" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-indigo-50 rounded-xl transition-all"
                            onClick={() => { setSelectedRequest(req); fetchTimeline(req.id); }}
                          >
                            <Info className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </EmployeeSectionCard>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Overview</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span className="capitalize">{selectedRequest.leave_type.replace('_', ' ')} request</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <>
              <DialogBody className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-subtle)] p-3 rounded-lg border border-[var(--border-subtle)] text-xs">
                  <div>
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase">Type</Label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="capitalize font-semibold">{selectedRequest.leave_type.replace('_', ' ')}</span>
                      {selectedRequest.is_half_day && <Badge className="text-[9px]">Half day</Badge>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase">Status</Label>
                    <div className="mt-0.5"><StatusBadge status={selectedRequest.status} /></div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase">Period</Label>
                    <p className="font-semibold mt-0.5">
                      {format(parseISO(selectedRequest.start_date), 'PP')}
                      {selectedRequest.start_date !== selectedRequest.end_date && ` – ${format(parseISO(selectedRequest.end_date), 'PP')}`}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-[var(--text-muted)] uppercase">Reason</Label>
                    <p className="font-medium mt-0.5 leading-relaxed">{cleanReason(selectedRequest.reason)}</p>
                  </div>
                  {selectedRequest.manager_comment && (
                    <div className="col-span-2 pt-2 border-t border-[var(--border-subtle)]">
                      <Label className="text-[10px] text-[var(--accent-primary)] uppercase">Manager Feedback</Label>
                      <p className="font-medium mt-0.5 leading-relaxed">{cleanReason(selectedRequest.manager_comment)}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Approval Timeline
                  </h4>
                  {isTimelineLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
                    </div>
                  ) : (
                    <ApprovalTimeline entries={timelineEntries} />
                  )}
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </EmployeePageShell>
  );
}
