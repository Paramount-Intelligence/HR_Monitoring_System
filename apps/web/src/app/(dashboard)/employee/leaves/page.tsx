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
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';

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
      label: "Approved Units", 
      value: requests.filter(r => r.status === 'approved').length, 
      icon: CheckCircle2, 
      color: "text-emerald-600", 
      bg: "bg-emerald-50" 
    },
    { 
      label: "Rejected / Defunct", 
      value: requests.filter(r => r.status === 'rejected').length, 
      icon: XCircle, 
      color: "text-rose-600", 
      bg: "bg-rose-50" 
    },
    { 
      label: "WFH Protocol", 
      value: requests.filter(r => r.leave_type === 'wfh' && r.status === 'approved').length, 
      icon: Home, 
      color: "text-indigo-600", 
      bg: "bg-indigo-50" 
    }
  ];

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <Plane className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Leave Summary</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Leave Requests</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Governance, Absence & Remote Protocols</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl px-10 shadow-xl shadow-indigo-100 transition-all active:scale-95">
              <Plus className="mr-3 h-5 w-5" />
              Initialize Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-premium-lg p-10">
            <form onSubmit={handleSubmit}>
              <DialogHeader className="space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner mb-2">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Create Leave Request</DialogTitle>
                <DialogDescription className="text-base font-bold text-slate-500 leading-relaxed">
                  Submit a formal request for leave or WFH. Ensure all operational context is provided for review.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-8 py-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Protocol Type</Label>
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
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-4 ring-indigo-50/50" 
                            : "bg-white border-slate-100 hover:bg-slate-50 text-slate-500"
                        )}
                      >
                        {type.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="start" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Commencement Date</Label>
                    <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-14 border-slate-100 focus:border-indigo-500 rounded-2xl bg-slate-50/50 font-bold" required />
                  </div>
                  {leaveType !== 'half_day' && (
                    <div className="space-y-2">
                      <Label htmlFor="end" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Termination Date</Label>
                      <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-14 border-slate-100 focus:border-indigo-500 rounded-2xl bg-slate-50/50 font-bold" required />
                    </div>
                  )}
                </div>

                {leaveType === 'half_day' && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Temporal Period</Label>
                    <RadioGroup value={halfDayPeriod} onValueChange={(val: any) => setHalfDayPeriod(val)} className="flex gap-4">
                      <div className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer flex-1",
                        halfDayPeriod === 'first_half' ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100"
                      )} onClick={() => setHalfDayPeriod('first_half')}>
                        <RadioGroupItem value="first_half" id="first_half" className="h-4 w-4" />
                        <Label htmlFor="first_half" className="font-black text-slate-700 text-[10px] uppercase tracking-widest cursor-pointer">First Half</Label>
                      </div>
                      <div className={cn(
                        "flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer flex-1",
                        halfDayPeriod === 'second_half' ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100"
                      )} onClick={() => setHalfDayPeriod('second_half')}>
                        <RadioGroupItem value="second_half" id="second_half" className="h-4 w-4" />
                        <Label htmlFor="second_half" className="font-black text-slate-700 text-[10px] uppercase tracking-widest cursor-pointer">Second Half</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Justification</Label>
                  <Textarea id="reason" placeholder="Explain the context of this protocol..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[120px] border-slate-100 focus:border-indigo-500 rounded-2xl bg-slate-50/50 font-bold p-5 resize-none" required />
                </div>
              </div>

              <DialogFooter className="gap-4">
                <Button variant="ghost" type="button" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button type="submit" disabled={isSubmitLoading} className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl px-12 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1">
                  {isSubmitLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : 'Commit Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <CardContent className="p-8">
              <div className="flex items-center gap-5">
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center ring-8 ring-white shadow-sm", stat.bg, stat.color)}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <History className="h-6 w-6 text-indigo-600" />
              Request Ledger
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Absence and Mobility History</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={5} cols={5} /></div>
          ) : requests.length === 0 ? (
            <div className="p-20 text-center">
              <EmptyState message="No governance records discovered in the organization archives." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 h-16">
                    <TableHead className="w-[220px] font-black text-[10px] uppercase tracking-widest text-slate-400 pl-10">Timeline</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Classification</TableHead>
                    <TableHead className="max-w-[300px] font-black text-[10px] uppercase tracking-widest text-slate-400">Justification</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Protocol Status</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/30 transition-all duration-300 border-b border-slate-50 last:border-0 h-24">
                      <TableCell className="pl-10">
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-slate-900 tracking-tight">
                            {format(parseISO(req.start_date), 'MMM d, yyyy')}
                          </span>
                          {req.start_date !== req.end_date && (
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                              to <ArrowRight className="h-3 w-3" /> {format(parseISO(req.end_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {req.is_half_day && (
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border-blue-100 py-0 mt-1">
                              {req.half_day_period?.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-xl flex items-center justify-center",
                            req.leave_type === 'wfh' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-600"
                          )}>
                            {req.leave_type === 'wfh' ? <Home className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                          </div>
                          <span className="capitalize font-black text-slate-700 text-[10px] uppercase tracking-widest">{req.leave_type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs font-bold text-slate-500 line-clamp-2 leading-relaxed italic pr-4">
                          "{req.reason}"
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
                            className="h-10 w-10 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
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
        </CardContent>
      </Card>

      {/* Detail Dialog with Timeline */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                <LayoutDashboard className="h-7 w-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">Request Overview</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedRequest?.id.slice(0, 8)}</span>
                  <StatusBadge status={selectedRequest?.status || 'pending'} />
                </div>
              </div>
            </div>
          </DialogHeader>

          {selectedRequest && (
            <div className="grid gap-10 py-6">
               <div className="grid grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Classification</Label>
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-black text-slate-800 text-sm tracking-tight">{selectedRequest.leave_type.replace('_', ' ')}</span>
                      {selectedRequest.is_half_day && <Badge className="bg-blue-600 text-white border-none text-[8px] h-4">HALF DAY</Badge>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Temporal Range</Label>
                    <p className="text-sm font-black text-slate-800 tracking-tight">
                        {format(parseISO(selectedRequest.start_date), 'PP')}
                        {selectedRequest.start_date !== selectedRequest.end_date && ` - ${format(parseISO(selectedRequest.end_date), 'PP')}`}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Governance Justification</Label>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{selectedRequest.reason}"</p>
                  </div>
                  {selectedRequest.manager_comment && (
                    <div className="col-span-2 space-y-1 pt-4 border-t border-slate-100">
                      <Label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Manager Feedback</Label>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">"{selectedRequest.manager_comment}"</p>
                    </div>
                  )}
               </div>

               <div>
                 <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <Clock className="h-4 w-4 text-indigo-600" />
                    Approval Audit Trail
                 </h4>
                 <div className="pl-4">
                    {isTimelineLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-200" />
                        </div>
                    ) : (
                        <ApprovalTimeline entries={timelineEntries} />
                    )}
                 </div>
               </div>
            </div>
          )}
          
          <DialogFooter>
             <Button variant="ghost" className="h-14 w-full rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all" onClick={() => setSelectedRequest(null)}>Close Overview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
