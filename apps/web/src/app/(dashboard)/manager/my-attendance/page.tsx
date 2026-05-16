'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, MapPin, Home, Clock, Coffee, Zap, Utensils, MoreVertical, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatPKDate, formatPKDateTime } from '@/lib/time';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import apiClient from '@/lib/api/client';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// --- Sub-components (extracted for parity with employee version) ---

const LiveTimer = ({ checkInAt }: { checkInAt: string }) => {
  const [elapsed, setElapsed] = useState('');
  
  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(checkInAt).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setElapsed(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [checkInAt]);

  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Session Live Counter</span>
      <span className="text-3xl font-black text-indigo-700 font-mono tracking-tighter">{elapsed}</span>
    </div>
  );
};

const BreakTimer = ({ startedAt, breakType }: { startedAt: string, breakType: string }) => {
  const [elapsed, setElapsed] = useState('');
  
  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${m}m ${s.toString().padStart(2, '0')}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-amber-100 p-2 rounded-lg">
          <Coffee className="h-4 w-4 text-amber-600 animate-bounce" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none mb-1">On {breakType} break</p>
          <p className="text-sm font-black text-slate-800 font-mono">{elapsed}</p>
        </div>
      </div>
    </div>
  );
};

function getErrorMessage(error: any) {
  return error.response?.data?.detail || error.message;
}

export default function AttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');

  // Correction Dialog
  const [correctionDialog, setCorrectionDialog] = useState<{ isOpen: boolean, sessionId: string }>({ isOpen: false, sessionId: '' });
  const [correctionReason, setCorrectionReason] = useState('');

  // Checkout Justification Dialog
  const [checkoutDialog, setCheckoutDialog] = useState({ isOpen: false });
  const [checkoutReason, setCheckoutReason] = useState<'overtime' | 'forgot_checkout'>('overtime');
  const [checkoutNote, setCheckoutNote] = useState('');

  // Break State
  const [isBreakLoading, setIsBreakLoading] = useState(false);
  const [breakNote, setBreakNote] = useState('');
  const [breakType, setBreakType] = useState<string>('dinner');
  const [showBreakNote, setShowBreakNote] = useState(false);

  const fetchData = async () => {
    try {
      const [sessionsData, userData] = await Promise.all([
        attendanceApi.getMySessions(),
        apiClient.get('/users/me').then(res => res.data)
      ]);
      setSessions(sessionsData);
      setCurrentUser(userData);
    } catch (error) {
      toast.error('Failed to load attendance history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeSession = useMemo(() => sessions.find(s => s.session_status === 'active'), [sessions]);

  const handleCheckIn = async () => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkIn(workMode);
      toast.success('Checked in successfully');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to check in');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOutClick = () => {
    if (!activeSession) return;
    const now = new Date();
    if (activeSession.expected_shift_end_at) {
      const shiftEnd = new Date(activeSession.expected_shift_end_at);
      if (now > shiftEnd) {
        setCheckoutDialog({ isOpen: true });
        return;
      }
    }
    performCheckOut();
  };

  const performCheckOut = async (justification?: { checkout_after_shift_reason: string, checkout_after_shift_note: string }) => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkOut(justification);
      toast.success('Checked out successfully');
      setCheckoutDialog({ isOpen: false });
      setCheckoutReason('overtime');
      setCheckoutNote('');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to check out');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (breakType === 'other' && !breakNote.trim()) {
      toast.error('Note is required for "Other" break type');
      return;
    }
    setIsBreakLoading(true);
    try {
      await attendanceApi.startBreak(breakType, breakNote);
      toast.success(`${breakType.charAt(0).toUpperCase() + breakType.slice(1)} break started`);
      setBreakNote('');
      setShowBreakNote(false);
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to start break');
    } finally {
      setIsBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setIsBreakLoading(true);
    try {
      await attendanceApi.endBreak();
      toast.success('Break ended');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to end break');
    } finally {
      setIsBreakLoading(false);
    }
  };

  const handleCorrectionSubmit = async () => {
    if (!correctionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setIsActionLoading(true);
    try {
      await attendanceApi.requestCorrection(correctionDialog.sessionId, correctionReason);
      toast.success('Correction request submitted');
      setCorrectionDialog({ isOpen: false, sessionId: '' });
      setCorrectionReason('');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to submit correction request');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDuration = (hours: number | null | undefined) => {
    if (hours === null || hours === undefined) return '-';
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Personal Attendance</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your professional work sessions and availability status.</p>
        </div>
        <div className="text-right bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned Shift</div>
          <div className="text-sm font-bold text-indigo-600">
            {currentUser?.shift_name || 'Management Standard'}
          </div>
          <div className="text-xs font-medium text-slate-500">
            {currentUser?.shift_timing || '5:00 PM - 2:00 AM'}
          </div>
        </div>
      </div>

      <Card className="rounded-xl shadow-premium border-slate-100 overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-600">
            <Clock className="h-4 w-4 text-indigo-600" />
            Session Control
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-stretch gap-6">
            <div className={cn(
              "flex-1 p-6 rounded-2xl border transition-all duration-300",
              activeSession ? "bg-indigo-50/30 border-indigo-100" : "bg-slate-50 border-slate-100"
            )}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      activeSession ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="font-bold text-slate-900 text-xl tracking-tight">
                      {activeSession ? 'Session Active' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    {activeSession
                      ? `Clocked in at ${formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' })} • ${activeSession.work_mode.toUpperCase()} Mode`
                      : 'Initialize your professional tracking session.'}
                  </p>
                </div>
                {activeSession && (
                  <Badge className="bg-indigo-600 text-white border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                    {activeSession.is_late_login ? 'LATE LOG' : 'VERIFIED'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Shift Start", value: currentUser?.shift_timing?.split(' - ')[0] || '5:00 PM' },
                  { label: "Shift End", value: currentUser?.shift_timing?.split(' - ')[1] || '2:00 AM' },
                  { label: "Actual In", value: activeSession ? formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' }) : '-' },
                  { 
                    label: "Overage", 
                    value: activeSession?.is_late_login ? `${Math.floor((activeSession.late_minutes || 0) / 60)}h ${(activeSession.late_minutes || 0) % 60}m` : '0m',
                    color: activeSession?.is_late_login ? 'text-rose-600' : 'text-emerald-600'
                  }
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.label}</div>
                    <div className={cn("text-sm font-bold text-slate-700", item.color)}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {!activeSession ? (
                  <>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1 pr-3 shadow-sm">
                      <Select value={workMode} onValueChange={(val: 'office' | 'wfh') => setWorkMode(val)}>
                        <SelectTrigger className="w-[130px] border-none shadow-none focus:ring-0 h-9 font-bold text-xs uppercase tracking-tight text-slate-600">
                          <SelectValue placeholder="Work Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-premium-lg">
                          <SelectItem value="office" className="text-xs font-bold uppercase tracking-tight">
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                              Office
                            </div>
                          </SelectItem>
                          <SelectItem value="wfh" className="text-xs font-bold uppercase tracking-tight">
                            <div className="flex items-center">
                              <Home className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                              WFH
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCheckIn}
                      disabled={isActionLoading}
                      size="lg"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 shadow-premium"
                    >
                      {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                      CHECK IN
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-6 w-full">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
                      <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm flex-1">
                        <LiveTimer checkInAt={activeSession.check_in_at} />
                      </div>
                      <Button
                        onClick={handleCheckOutClick}
                        disabled={isActionLoading || !!activeSession.active_break}
                        size="lg"
                        className="min-w-[160px] h-14 bg-rose-600 text-white font-bold hover:bg-rose-700 rounded-xl shadow-premium uppercase tracking-widest text-xs"
                      >
                        {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                        CHECK OUT
                      </Button>
                    </div>

                    <div className="pt-6 border-t border-indigo-100/50">
                      {activeSession.active_break ? (
                        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-2">
                          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 flex-1 w-full">
                            <BreakTimer 
                              startedAt={activeSession.active_break.started_at} 
                              breakType={activeSession.active_break.break_type} 
                            />
                          </div>
                          <Button 
                            onClick={handleEndBreak}
                            disabled={isBreakLoading}
                            variant="outline"
                            className="w-full sm:w-auto min-w-[160px] h-12 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 font-bold"
                          >
                            {isBreakLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coffee className="mr-2 h-4 w-4" />}
                            END BREAK
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                              {[
                                { id: 'dinner', icon: Utensils, label: 'Dinner' },
                                { id: 'prayer', icon: Zap, label: 'Prayer' },
                                { id: 'other', icon: MoreVertical, label: 'Other' },
                              ].map((b) => (
                                <Button 
                                  key={b.id}
                                  variant={breakType === b.id ? 'secondary' : 'ghost'} 
                                  size="sm" 
                                  className={cn(
                                    "h-8 gap-2 rounded-lg font-bold text-[10px] uppercase tracking-wider px-3",
                                    breakType === b.id ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "text-slate-500"
                                  )}
                                  onClick={() => { setBreakType(b.id); setShowBreakNote(b.id === 'other'); }}
                                >
                                  <b.icon className="h-3.5 w-3.5" />
                                  {b.label}
                                </Button>
                              ))}
                            </div>
                            
                            <Button 
                              onClick={handleStartBreak}
                              disabled={isBreakLoading}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-xl shadow-sm uppercase tracking-widest text-[10px]"
                            >
                              {isBreakLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coffee className="mr-2 h-4 w-4" />}
                              START BREAK
                            </Button>
                          </div>
                          
                          {showBreakNote && (
                            <div className="animate-in fade-in slide-in-from-top-1 max-w-md">
                              <Input 
                                placeholder="Annotate break purpose..." 
                                className="h-10 border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50/50 text-xs font-bold"
                                value={breakNote}
                                onChange={(e) => setBreakNote(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-premium border-slate-100 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-600">Archive & Integrity History</CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit trail of personal sessions</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : sessions.length === 0 ? (
            <EmptyState 
                title="No Session Logs"
                description="Your professional activity archive is currently empty."
                icon={Clock}
            />
          ) : (
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 px-6 py-4">Filing Date</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 px-6 py-4">Verification In/Out</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 px-6 py-4">Duration</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 px-6 py-4">Breaks</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 px-6 py-4">Integrity Status</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500 px-6 py-4">Exceptions</TableHead>
                    <TableHead className="text-right px-6 py-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <TableCell className="font-bold text-slate-700 whitespace-nowrap px-6 py-4">
                        {formatPKDate(session.check_in_at)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <LogIn className="h-3 w-3" />
                            {formatPKDateTime(session.check_in_at, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {session.check_out_at ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                              <LogOut className="h-3 w-3" />
                              {formatPKDateTime(session.check_out_at, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-400 italic tracking-widest">IN PROGRESS</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg w-fit border border-slate-200 shadow-inner">
                          {formatDuration(session.total_hours)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg w-fit border border-amber-100">
                            {(session.total_break_minutes || 0)}m
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={session.attendance_classification || 'active'} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {session.is_late_login && (
                            <StatusBadge status="late" className="bg-rose-50 text-rose-600 border-rose-100" />
                          )}
                          {!session.is_late_login && !session.is_corrected && (
                            <span className="text-[9px] font-bold text-slate-300 uppercase">Clear</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-premium-lg border-slate-100 p-1">
                            <DropdownMenuItem
                              className="text-indigo-600 focus:text-indigo-700 font-bold text-[10px] uppercase tracking-widest cursor-pointer rounded-lg h-9"
                              onClick={() => setCorrectionDialog({ isOpen: true, sessionId: session.id })}
                              disabled={session.correction_requested}
                            >
                              File Correction
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Correction Dialog */}
      <Dialog open={correctionDialog.isOpen} onOpenChange={(open) => setCorrectionDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-premium-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Session Integrity Correction</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500">
              Provide justification for the requested data adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason" className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2 block">Adjustment Rationale</Label>
            <Textarea
              id="reason"
              className="min-h-[120px] border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50/50 font-bold text-xs"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Annotate correction reason..."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold text-slate-500 hover:text-slate-900 text-xs" onClick={() => setCorrectionDialog({ isOpen: false, sessionId: '' })}>DISCARD</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 shadow-sm text-xs"
              onClick={handleCorrectionSubmit}
              disabled={isActionLoading}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              SUBMIT AUDIT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
