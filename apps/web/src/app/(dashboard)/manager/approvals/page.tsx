'use client';

import { useState, useEffect } from 'react';
import { leavesApi } from '@/lib/api/leaves';
import { attendanceApi } from '@/lib/api/attendance';
import { LeaveRequest, AttendanceSession } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { cn, cleanReason } from '@/lib/utils';
import { 
  CheckCircle, HelpCircle, XCircle, MessageSquare, Loader2, Clock, 
  User, Calendar, Info, ShieldCheck, Zap, AlertCircle, Inbox,
  CheckCircle2, RefreshCcw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatPKDate, formatPKDateTime } from '@/lib/time';

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
      
      toast.success(`Decision submitted`);
      setSelectedItem(null);
      setComment('');
      setCheckInTime('');
      setCheckOutTime('');
      fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Resolution failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
            <span>Manager</span>
            <span className="opacity-40">/</span>
            <span className="text-[var(--accent-primary)]">Approvals</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Pending Approvals</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Review and approve team submissions</p>
        </div>
      </div>

      <Tabs defaultValue="leaves" className="w-full" orientation="vertical">
        <div className="app-surface overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] p-4 flex flex-col gap-2 bg-[var(--bg-surface)]">
              <TabsList className="flex flex-col gap-2 bg-transparent h-auto w-full p-0" variant="line">
                <TabsTrigger
                  value="leaves"
                  className="w-full flex items-center justify-between rounded-xl px-4 py-4 text-left font-bold transition text-sm tracking-tight text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] bg-transparent border-l-4 border-transparent data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-l-[var(--accent-primary)] data-active:bg-[var(--bg-elevated)] data-active:text-[var(--text-primary)] data-active:border-l-[var(--accent-primary)] shadow-none group"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>Leave & WFH Requests</span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] group-data-[state=active]:bg-[var(--accent-primary)] group-data-[state=active]:text-white group-data-active:bg-[var(--accent-primary)] group-data-active:text-white border border-[var(--border-subtle)] transition-colors">
                      {leaveRequests.length}
                    </span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="corrections"
                  className="w-full flex items-center justify-between rounded-xl px-4 py-4 text-left font-bold transition text-sm tracking-tight text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] bg-transparent border-l-4 border-transparent data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-l-[var(--accent-primary)] data-active:bg-[var(--bg-elevated)] data-active:text-[var(--text-primary)] data-active:border-l-[var(--accent-primary)] shadow-none group"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>Attendance Corrections</span>
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] group-data-[state=active]:bg-[var(--accent-primary)] group-data-[state=active]:text-white group-data-active:bg-[var(--accent-primary)] group-data-active:text-white border border-[var(--border-subtle)] transition-colors">
                      {corrections.length}
                    </span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </aside>

            <section className="w-full min-w-0 p-6">
              <TabsContent value="leaves" className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 focus-visible:outline-none">
                <div className="w-full min-w-0">
                  <div className="flex items-center gap-3 pb-6 border-b border-[var(--border-subtle)] mb-6">
                    <Inbox className="h-6 w-6 text-[var(--accent-primary)]" />
                    <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">Leave Requests</h2>
                  </div>

                  {isLoading ? (
                    <div className="py-12"><TableSkeleton rows={5} cols={5} /></div>
                  ) : leaveRequests.length === 0 ? (
                    <div className="py-12 max-w-xl mx-auto">
                      <EmptyState 
                        title="Approvals Queue Clear"
                        description="No leave or WFH requests are waiting for review."
                        icon={CheckCircle2}
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader className="bg-[var(--bg-subtle)]">
                          <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                            <TableHead className="w-[250px] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Employee</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Request Details</TableHead>
                            <TableHead className="max-w-[300px] font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Reason</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                            <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveRequests.map((req) => (
                            <TableRow key={req.id} className="hover:bg-[var(--bg-subtle)]/30 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28">
                              <TableCell className="pl-10">
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-subtle)] font-black text-xs shadow-inner">
                                    {req.user_full_name ? req.user_full_name.split(' ').map(n => n[0]).join('') : 'U'}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{req.user_full_name || 'Team Member'}</span>
                                    <span className="text-[9px] text-[var(--accent-primary)] uppercase font-black tracking-widest">Employee</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5">
                                  <span className="capitalize font-black text-[var(--text-secondary)] text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="h-3 w-3 text-[var(--accent-primary)]" />
                                    {req.leave_type.replace('_', ' ')}
                                    {req.is_half_day && <Badge className="bg-[var(--accent-primary)] text-white border-none text-[8px] h-4">HALF DAY</Badge>}
                                  </span>
                                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
                                    {formatPKDate(req.start_date)} — {formatPKDate(req.end_date)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[300px]">
                                <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed italic line-clamp-2 pr-6">
                                    {cleanReason(req.reason)}
                                </p>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={req.status} />
                              </TableCell>
                              <TableCell className="text-right pr-10">
                                <div className="flex justify-end gap-3">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-11 w-11 p-0 rounded-xl text-[var(--accent-primary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)] transition-all"
                                    onClick={() => { setSelectedItem({id: req.id, type: 'leave'}); setActionType('clarified'); }}
                                  >
                                    <MessageSquare className="h-5 w-5" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-11 w-11 p-0 rounded-xl text-rose-600 border-[var(--border-default)] hover:bg-rose-50 transition-all"
                                    onClick={() => { setSelectedItem({id: req.id, type: 'leave'}); setActionType('rejected'); }}
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-11 w-11 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg border-none transition-all active:scale-95"
                                    onClick={() => { setSelectedItem({id: req.id, type: 'leave'}); setActionType('approved'); }}
                                  >
                                    <CheckCircle className="h-5 w-5 text-white" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="corrections" className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 focus-visible:outline-none">
                <div className="w-full min-w-0">
                  <div className="flex items-center gap-3 pb-6 border-b border-[var(--border-subtle)] mb-6">
                    <RefreshCcw className="h-6 w-6 text-[var(--accent-primary)]" />
                    <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">Attendance Corrections</h2>
                  </div>

                  {isLoading ? (
                    <div className="py-12"><TableSkeleton rows={5} cols={4} /></div>
                  ) : corrections.length === 0 ? (
                    <div className="py-12 max-w-xl mx-auto">
                      <EmptyState 
                        title="No Attendance Corrections"
                        description="No attendance correction requests are waiting for review."
                        icon={ShieldCheck}
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <Table>
                        <TableHeader className="bg-[var(--bg-subtle)]">
                          <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Employee</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Correction Details</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Reason</TableHead>
                            <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {corrections.map((corr) => (
                            <TableRow key={corr.id} className="hover:bg-[var(--bg-subtle)]/30 transition-all duration-300 border-b border-[var(--border-subtle)] last:border-0 h-28">
                              <TableCell className="pl-10">
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-subtle)] font-black text-xs shadow-inner">
                                    {corr.user_full_name ? corr.user_full_name.split(' ').map(n => n[0]).join('') : 'U'}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{corr.user_full_name || 'Team Member'}</span>
                                    <span className="text-[9px] text-[var(--accent-primary)] uppercase font-black tracking-widest">Employee</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter">
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg w-fit border border-emerald-100/50">
                                      <Clock className="h-3 w-3" />
                                      IN: {formatPKDateTime(corr.check_in_at)}
                                    </div>
                                    <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1 rounded-lg w-fit border border-rose-100/50">
                                      <Clock className="h-3 w-3" />
                                      OUT: {corr.check_out_at ? formatPKDateTime(corr.check_out_at) : 'OPEN SESSION'}
                                    </div>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[350px]">
                                <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed italic line-clamp-2 pr-6">
                                    {cleanReason(corr.correction_reason)}
                                </p>
                              </TableCell>
                              <TableCell className="text-right pr-10">
                                <div className="flex justify-end gap-3">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-11 w-11 p-0 rounded-xl text-rose-600 border-[var(--border-default)] hover:bg-rose-50 transition-all"
                                    onClick={() => { setSelectedItem({id: corr.id, type: 'correction'}); setActionType('rejected'); }}
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-11 w-11 p-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg border-none transition-all active:scale-95"
                                    onClick={() => { 
                                        setSelectedItem({id: corr.id, type: 'correction', check_in_at: corr.check_in_at}); 
                                        setActionType('approved'); 
                                        const dateObj = new Date(corr.check_in_at);
                                        const pktTime = new Intl.DateTimeFormat('en-US', {
                                          timeZone: 'Asia/Karachi',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: false
                                        }).format(dateObj);
                                        setCheckInTime(pktTime);
                                    }}
                                  >
                                    <CheckCircle className="h-5 w-5 text-white" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </section>
          </div>
        </div>
      </Tabs>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] p-10 animate-in zoom-in-95 duration-300 text-[var(--text-primary)]">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-16 w-16 rounded-3xl flex items-center justify-center shadow-inner",
                actionType === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                actionType === 'rejected' ? "bg-rose-50 text-rose-600" : 
                "bg-indigo-50 text-[var(--accent-primary)]"
              )}>
                {actionType === 'approved' && <CheckCircle className="h-8 w-8" />}
                {actionType === 'rejected' && <XCircle className="h-8 w-8" />}
                {actionType === 'clarified' && <MessageSquare className="h-8 w-8" />}
              </div>
              <div>
                <DialogTitle className="text-3xl font-black tracking-tighter capitalize text-[var(--text-primary)]">{actionType} Request</DialogTitle>
                <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">Final Decision</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="grid gap-8 py-8">
            {selectedItem?.type === 'correction' && actionType === 'approved' && (
              <div className="grid grid-cols-2 gap-6 p-6 bg-[var(--bg-subtle)] rounded-[2rem] border border-[var(--border-subtle)] shadow-inner">
                <div className="space-y-2">
                  <Label htmlFor="checkIn" className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Adjusted Check-in</Label>
                  <Input 
                    id="checkIn" 
                    type="time" 
                    value={checkInTime} 
                    onChange={(e) => setCheckInTime(e.target.value)} 
                    className="h-12 rounded-xl border-[var(--border-default)] font-bold bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOut" className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Adjusted Check-out</Label>
                  <Input 
                    id="checkOut" 
                    type="time" 
                    value={checkOutTime} 
                    onChange={(e) => setCheckOutTime(e.target.value)} 
                    className="h-12 rounded-xl border-[var(--border-default)] font-bold bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Reason / Comments</Label>
              <Textarea
                id="comment"
                placeholder={actionType === 'clarified' ? "Specify required clarification..." : "Provide objective context for this decision..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none rounded-[1.5rem] bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)] text-[var(--text-primary)] min-h-[140px] font-bold text-sm leading-relaxed p-6"
              />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="ghost" onClick={() => setSelectedItem(null)} className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1">Discard</Button>
            <Button 
                onClick={handleResolve} 
                disabled={isActionLoading}
                className={cn(
                    "h-14 rounded-2xl font-black text-xs uppercase tracking-widest px-10 shadow-xl border-none transition-all active:scale-95 flex-1 text-white",
                    actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 
                    actionType === 'rejected' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100' : 
                    'bg-[var(--accent-primary)] hover:opacity-90'
                )}
            >
              {isActionLoading ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
