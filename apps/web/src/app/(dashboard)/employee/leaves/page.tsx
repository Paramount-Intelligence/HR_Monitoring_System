'use client';

import { useEffect, useState } from 'react';
import { leavesApi, LeaveRequest, ApprovalTimelineEntry } from '@/lib/api/leaves';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, Plus, Info, XCircle } from 'lucide-react';
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
import { ApprovalTimeline } from '@/components/approvals/approval-timeline';

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
    setIsSubmitLoading(true);
    try {
      await leavesApi.submitRequest({
        start_date: startDate,
        end_date: isHalfDay ? startDate : endDate,
        leave_type: isHalfDay ? 'half_day' : leaveType,
        reason,
        is_half_day: isHalfDay,
        half_day_period: isHalfDay ? halfDayPeriod : null,
      });
      toast.success('Request submitted successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      await leavesApi.cancelRequest(id);
      toast.success('Request cancelled');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to cancel request');
    }
  };

  const resetForm = () => {
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setLeaveType('annual');
    setReason('');
    setIsHalfDay(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'escalated':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">Escalated</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'needs_clarification':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium animate-pulse">Needs Clarification</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leave & WFH Requests</h1>
          <p className="text-sm text-slate-500">Submit and track your time-off and remote work requests.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Request</DialogTitle>
                <DialogDescription>
                  Fill in the details for your leave or WFH request.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-6">
                <div className="grid gap-2">
                  <Label htmlFor="type">Request Type</Label>
                  <Select 
                    value={leaveType} 
                    onValueChange={(val: any) => {
                        setLeaveType(val);
                        if (val === 'half_day') setIsHalfDay(true);
                        else setIsHalfDay(false);
                    }}
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="wfh">Work From Home</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start">Start Date</Label>
                    <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50" required />
                  </div>
                  {!isHalfDay && (
                    <div className="grid gap-2">
                      <Label htmlFor="end">End Date</Label>
                      <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50" required />
                    </div>
                  )}
                </div>

                {isHalfDay && (
                  <div className="grid gap-2">
                    <Label>Period</Label>
                    <Select value={halfDayPeriod} onValueChange={(val: any) => setHalfDayPeriod(val)}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_half">First Half (Morning)</SelectItem>
                        <SelectItem value="second_half">Second Half (Afternoon)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="reason">Reason / Notes</Label>
                  <Textarea id="reason" placeholder="Provide a brief explanation..." value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px] bg-slate-50" required />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[100px]">
                  {isSubmitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Available Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">12 Days</div>
            <p className="text-xs text-slate-500 mt-1">Annual balance for 2026</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting manager approval</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">WFH Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {requests.filter(r => r.leave_type === 'wfh' && r.status === 'approved').length} Days
            </div>
            <p className="text-xs text-slate-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle>History</CardTitle>
          <CardDescription>Track the status of your previous submissions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">No requests found. Start by creating a new one!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[180px]">Dates</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="max-w-[300px]">Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {format(parseISO(req.start_date), 'MMM d, yyyy')}
                          </span>
                          {req.start_date !== req.end_date && (
                            <span className="text-xs text-slate-500">
                              to {format(parseISO(req.end_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {req.is_half_day && (
                            <span className="text-[10px] font-bold text-blue-500 uppercase mt-0.5">
                              {req.half_day_period?.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-slate-700">{req.leave_type.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-slate-500 text-sm">
                        {req.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleCancel(req.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                            onClick={() => { setSelectedRequest(req); fetchTimeline(req.id); }}
                          >
                            <Info className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                Request Detail
                {selectedRequest && getStatusBadge(selectedRequest.status)}
            </DialogTitle>
            <DialogDescription>
              Detailed view of your request and its approval history.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="grid gap-6 py-4">
               <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Type</Label>
                    <p className="capitalize font-medium text-slate-900">{selectedRequest.leave_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Dates</Label>
                    <p className="text-sm font-medium text-slate-900">
                        {format(parseISO(selectedRequest.start_date), 'PP')}
                        {selectedRequest.start_date !== selectedRequest.end_date && ` - ${format(parseISO(selectedRequest.end_date), 'PP')}`}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Reason</Label>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedRequest.reason}</p>
                  </div>
               </div>

               <div>
                 <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Approval Timeline
                 </h4>
                 <div className="pl-2">
                    {isTimelineLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <ApprovalTimeline entries={timelineEntries} />
                    )}
                 </div>
               </div>
            </div>
          )}
          
          <DialogFooter>
             <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
