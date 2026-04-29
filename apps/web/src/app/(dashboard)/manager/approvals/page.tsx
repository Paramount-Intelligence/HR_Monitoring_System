'use client';

import { useEffect, useState } from 'react';
import { leavesApi, LeaveRequest } from '@/lib/api/leaves';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, HelpCircle, User, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export default function ManagerApprovalsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [corrections, setCorrections] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Resolution Modal State
  const [selectedItem, setSelectedItem] = useState<{id: string, type: 'leave' | 'correction', check_in_at?: string} | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'clarified' | null>(null);
  const [comment, setComment] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leaves, pendingCorrections] = await Promise.all([
        leavesApi.getPendingQueue(),
        attendanceApi.getPendingCorrections()
      ]);
      setLeaveRequests(leaves);
      setCorrections(pendingCorrections);
    } catch (error) {
      toast.error('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolve = async () => {
    if (!selectedItem || !actionType) return;
    
    setIsActionLoading(true);
    try {
      if (selectedItem.type === 'leave') {
        await leavesApi.resolveRequest(selectedItem.id, {
          action: actionType as any,
          manager_comment: comment
        });
      } else {
          // Attendance Correction Resolution
          let finalCheckIn = undefined;
          let finalCheckOut = undefined;
          
          if (actionType === 'approved') {
             // For simplicity, appending the times to the existing session date.
             // We need the date from the session. 
             const session = corrections.find(c => c.id === selectedItem.id);
             if (session && checkInTime) {
                const datePart = session.check_in_at.split('T')[0];
                finalCheckIn = `${datePart}T${checkInTime}:00Z`;
             }
             if (session && checkOutTime) {
                const datePart = session.check_in_at.split('T')[0];
                finalCheckOut = `${datePart}T${checkOutTime}:00Z`;
             }
          }
          
          await attendanceApi.resolveCorrection(selectedItem.id, {
              action: actionType === 'clarified' ? 'clarify' : (actionType === 'approved' ? 'approve' : 'reject') as any,
              manager_comment: comment,
              check_in_at: finalCheckIn,
              check_out_at: finalCheckOut
          });
      }
      
      toast.success(`Request ${actionType} successfully`);
      setSelectedItem(null);
      setComment('');
      setCheckInTime('');
      setCheckOutTime('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to resolve request');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
      case 'escalated':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Escalated</Badge>;
      case 'needs_clarification':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Clarification Sent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Approvals Inbox</h1>
        <p className="text-sm text-slate-500">Review and resolve team requests for leaves, WFH, and attendance corrections.</p>
      </div>

      <Tabs defaultValue="leaves" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4">
          <TabsTrigger value="leaves" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Leave & WFH ({leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="corrections" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Attendance Corrections ({corrections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaves">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-0">
                <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
                <CardDescription>Requests awaiting your approval or clarification.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : leaveRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-emerald-100 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No pending leave requests!</p>
                  <p className="text-xs text-slate-400 mt-1">Your inbox is clean.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-[200px]">Employee</TableHead>
                        <TableHead>Type & Dates</TableHead>
                        <TableHead className="max-w-[250px]">Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.map((req) => (
                        <TableRow key={req.id} className="hover:bg-slate-50/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 text-sm">{req.id.slice(0, 8)}...</span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Requester</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="capitalize font-semibold text-slate-700 text-sm">
                                {req.leave_type.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-slate-500">
                                {format(parseISO(req.start_date), 'MMM d')} - {format(parseISO(req.end_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[250px] truncate text-slate-500 text-sm">
                            {req.reason}
                          </TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => { setSelectedItem({id: req.id, type: 'leave'}); setActionType('clarified'); }}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => { setSelectedItem({id: req.id, type: 'leave'}); setActionType('rejected'); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                onClick={() => { setSelectedItem({id: req.id, type: 'leave'}); setActionType('approved'); }}
                              >
                                <CheckCircle className="h-4 w-4 text-white" />
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
        </TabsContent>

        <TabsContent value="corrections">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-0">
                <CardTitle className="text-lg">Attendance Corrections</CardTitle>
                <CardDescription>Review requests for attendance log modifications.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : corrections.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-emerald-100 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No pending corrections!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Original Session</TableHead>
                        <TableHead>Correction Reason</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {corrections.map((corr) => (
                        <TableRow key={corr.id} className="hover:bg-slate-50/30 transition-colors">
                          <TableCell className="font-medium text-sm">{corr.user_id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-slate-500">
                                <span>IN: {format(parseISO(corr.check_in_at), 'Pp')}</span>
                                <span>OUT: {corr.check_out_at ? format(parseISO(corr.check_out_at), 'Pp') : 'Active'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-slate-600 text-sm italic">
                            "{corr.correction_reason}"
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => { setSelectedItem({id: corr.id, type: 'correction'}); setActionType('rejected'); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                onClick={() => { 
                                    setSelectedItem({id: corr.id, type: 'correction', check_in_at: corr.check_in_at}); 
                                    setActionType('approved'); 
                                    const dateObj = new Date(corr.check_in_at);
                                    setCheckInTime(dateObj.toISOString().substr(11, 5));
                                }}
                              >
                                <CheckCircle className="h-4 w-4 text-white" />
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
        </TabsContent>
      </Tabs>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {actionType === 'approved' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              {actionType === 'rejected' && <XCircle className="h-5 w-5 text-red-500" />}
              {actionType === 'clarified' && <MessageSquare className="h-5 w-5 text-blue-500" />}
              {actionType} Request
            </DialogTitle>
            <DialogDescription>
              Provide a comment or reason for your decision. This will be visible to the employee.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedItem?.type === 'correction' && actionType === 'approved' && (
              <div className="grid grid-cols-2 gap-4 border-b pb-4 mb-2">
                <div className="grid gap-2">
                  <Label htmlFor="checkIn">Final Check In Time</Label>
                  <Input 
                    id="checkIn" 
                    type="time" 
                    value={checkInTime} 
                    onChange={(e) => setCheckInTime(e.target.value)} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="checkOut">Final Check Out Time</Label>
                  <Input 
                    id="checkOut" 
                    type="time" 
                    value={checkOutTime} 
                    onChange={(e) => setCheckOutTime(e.target.value)} 
                  />
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="comment">Manager Comment</Label>
              <Textarea
                id="comment"
                placeholder={actionType === 'clarified' ? "Specify what clarification is needed..." : "Optional reason for decision..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-slate-50 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedItem(null)}>Cancel</Button>
            <Button 
                onClick={handleResolve} 
                disabled={isActionLoading}
                className={
                    actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 
                    actionType === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 
                    'bg-blue-600 hover:bg-blue-700'
                }
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm {actionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
