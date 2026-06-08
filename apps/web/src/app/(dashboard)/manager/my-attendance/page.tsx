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
      <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] mb-1">Session Live Counter</span>
      <span className="text-3xl font-black text-[var(--accent-primary)] font-mono tracking-tighter">{elapsed}</span>
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
          <p className="text-sm font-black text-[var(--text-primary)] font-mono">{elapsed}</p>
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

  // Early Checkout Dialog
  const [earlyCheckoutDialog, setEarlyCheckoutDialog] = useState({ isOpen: false });
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('');

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

    // Use current time to check against expected shift end
    const now = new Date();
    
    if (activeSession.expected_shift_end_at) {
      const shiftEnd = new Date(activeSession.expected_shift_end_at);
      // We add a 2-minute buffer for clock skew
      const bufferMs = 2 * 60 * 1000;
      
      if (now.getTime() < shiftEnd.getTime() - bufferMs) {
        setEarlyCheckoutDialog({ isOpen: true });
        return;
      }
      if (now.getTime() > shiftEnd.getTime() + bufferMs) {
        setCheckoutDialog({ isOpen: true });
        return;
      }
    } else {
      // Fallback: 5:00 PM to 2:00 AM PKT
      // Convert current time to PKT to evaluate correctly
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const pkt = new Date(utc + (3600000 * 5)); // PKT is UTC+5
      
      const pktHour = pkt.getHours();
      
      // If the PKT time is between 5 PM (17) and 2 AM (2), it's before the end of the shift
      // Specifically: 17, 18, 19, 20, 21, 22, 23, 0, 1
      const isEarly = (pktHour >= 17 || pktHour < 2);
      const isOvertime = (pktHour >= 2 && pktHour < 10); // Between 2 AM and 10 AM PKT
      
      if (isEarly) {
         setEarlyCheckoutDialog({ isOpen: true });
         return;
      }
      if (isOvertime) {
         setCheckoutDialog({ isOpen: true });
         return;
      }
    }

    // Normal checkout
    performCheckOut({});
  };

  const performCheckOut = async (justification: { checkout_after_shift_reason?: string, checkout_after_shift_note?: string, early_checkout_reason?: string } = {}) => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkOut(justification);
      toast.success('Session completed and saved to database');
      setCheckoutDialog({ isOpen: false });
      setEarlyCheckoutDialog({ isOpen: false });
      setCheckoutReason('overtime');
      setCheckoutNote('');
      setEarlyCheckoutReason('');
      await fetchData();
    } catch (error: any) {
      const msg = getErrorMessage(error) || 'Failed to check out';
      toast.error(msg);
      
      // If the backend says it's early but frontend missed it, open the modal
      if (msg.toLowerCase().includes('before your shift ends') || msg.toLowerCase().includes('early checkout')) {
        setEarlyCheckoutDialog({ isOpen: true });
      } else if (msg.toLowerCase().includes('after shift end') || msg.toLowerCase().includes('overtime')) {
        setCheckoutDialog({ isOpen: true });
      }
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
    <div className="space-y-6 animate-in fade-in duration-500 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">My Attendance</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">Manage your daily work sessions, breaks, and attendance history</p>
        </div>
        <div className="text-right bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-sm text-[var(--text-primary)]">
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Assigned Shift</div>
          <div className="text-sm font-bold text-[var(--accent-primary)]">
            {currentUser?.shift_name || 'Standard Shift'}
          </div>
          <div className="text-xs font-medium text-[var(--text-secondary)]">
            {currentUser?.shift_timing || '5:00 PM - 2:00 AM'}
          </div>
        </div>
      </div>

      <Card className="rounded-xl shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="pb-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-[var(--text-muted)]">
            <Clock className="h-4 w-4 text-[var(--accent-primary)]" />
            Session Control
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row items-stretch gap-6">
            <div className={cn(
              "flex-1 p-6 rounded-2xl border transition-all duration-300",
              activeSession ? "bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)]" : "bg-[var(--bg-subtle)]/20 border-[var(--border-subtle)]"
            )}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      activeSession ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="font-bold text-[var(--text-primary)] text-xl tracking-tight">
                      {activeSession ? 'Active Session' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] font-medium">
                    {activeSession
                      ? `Clocked in at ${formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' })} • ${activeSession.work_mode.toUpperCase()} Mode`
                      : 'Start your daily work session by checking in.'}
                  </p>
                </div>
                {activeSession && (
                  <Badge className="bg-[var(--accent-primary)] text-white border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                    {activeSession.is_late_login ? 'LATE' : 'VERIFIED'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Shift Start", value: currentUser?.shift_timing?.split(' - ')[0] || '5:00 PM' },
                  { label: "Shift End", value: currentUser?.shift_timing?.split(' - ')[1] || '2:00 AM' },
                  { label: "Check-in Time", value: activeSession ? formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' }) : '-' },
                  { 
                    label: "Late Minutes", 
                    value: activeSession?.is_late_login ? `${Math.floor((activeSession.late_minutes || 0) / 60)}h ${(activeSession.late_minutes || 0) % 60}m` : '0m',
                    color: activeSession?.is_late_login ? 'text-rose-600' : 'text-emerald-600'
                  }
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">{item.label}</div>
                    <div className={cn("text-sm font-bold text-[var(--text-secondary)]", item.color)}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {!activeSession ? (
                  <>
                    <div className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-1 pr-3 shadow-sm text-[var(--text-primary)]">
                      <Select value={workMode} onValueChange={(val) => { if (val) setWorkMode(val as 'office' | 'wfh'); }}>
                        <SelectTrigger className="w-[130px] border-none shadow-none focus:ring-0 h-9 font-bold text-xs uppercase tracking-tight text-[var(--text-secondary)] bg-transparent">
                          <SelectValue placeholder="Work Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
                          <SelectItem value="office" className="text-xs font-bold uppercase tracking-tight">
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-3.5 w-3.5 text-[var(--accent-primary)]" />
                              Office
                            </div>
                          </SelectItem>
                          <SelectItem value="wfh" className="text-xs font-bold uppercase tracking-tight">
                            <div className="flex items-center">
                              <Home className="mr-2 h-3.5 w-3.5 text-[var(--accent-primary)]" />
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
                      className="bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold rounded-xl px-8 shadow-sm border-none"
                    >
                      {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <LogIn className="mr-2 h-4 w-4 text-white" />}
                      Check-in
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-6 w-full text-[var(--text-primary)]">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
                      <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-sm flex-1">
                        <LiveTimer checkInAt={activeSession.check_in_at} />
                      </div>
                      <Button
                        onClick={handleCheckOutClick}
                        disabled={isActionLoading || !!activeSession.active_break}
                        size="lg"
                        className="min-w-[160px] h-14 bg-rose-600 text-white font-bold hover:bg-rose-700 rounded-xl shadow-sm border-none uppercase tracking-widest text-xs"
                      >
                        {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <LogOut className="mr-2 h-4 w-4 text-white" />}
                        Check-out
                      </Button>
                    </div>

                    <div className="pt-6 border-t border-[var(--border-subtle)]">
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
                            End Break
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-1 shadow-sm text-[var(--text-primary)]">
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
                                    breakType === b.id ? "bg-[var(--bg-subtle)] text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)]/80" : "text-[var(--text-muted)]"
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
                              className="bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold h-10 px-6 rounded-xl border-none shadow-sm uppercase tracking-widest text-[10px]"
                            >
                              {isBreakLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" /> : <Coffee className="mr-2 h-4 w-4 text-white" />}
                              Start Break
                            </Button>
                          </div>
                          
                          {showBreakNote && (
                            <div className="animate-in fade-in slide-in-from-top-1 max-w-md">
                              <Input 
                                placeholder="Reason for break..." 
                                className="h-10 border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl bg-[var(--bg-subtle)] text-xs font-bold text-[var(--text-primary)]"
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

      <Card className="rounded-xl shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Attendance History</CardTitle>
            <CardDescription className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Log of tracked hours and manual entries</CardDescription>
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
            <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-surface)] shadow-sm text-[var(--text-primary)]">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)]">
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Date</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Check-in / Out</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Duration</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Breaks</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Status</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-6 py-4">Exceptions</TableHead>
                    <TableHead className="text-right px-6 py-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-primary)]">
                      <TableCell className="font-bold text-[var(--text-secondary)] whitespace-nowrap px-6 py-4">
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
                            <span className="text-[10px] font-bold text-[var(--accent-primary)] italic tracking-widest">IN PROGRESS</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-mono text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-2 py-1 rounded-lg w-fit border border-[var(--border-subtle)] shadow-inner">
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
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-[var(--shadow-card)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-1">
                            <DropdownMenuItem
                              className="text-[var(--accent-primary)] focus:text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)] font-bold text-[10px] uppercase tracking-widest cursor-pointer rounded-lg h-9"
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
        <DialogContent className="sm:max-w-md rounded-2xl border-none shadow-[var(--shadow-hard)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">Attendance Correction</DialogTitle>
            <DialogDescription className="text-sm font-medium text-[var(--text-muted)]">
              Request adjustment for this attendance session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason" className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Reason for Correction</Label>
            <Textarea
              id="reason"
              className="min-h-[120px] border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl bg-[var(--bg-subtle)]/50 font-bold text-xs text-[var(--text-primary)]"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Explain the reason for correction..."
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs" onClick={() => setCorrectionDialog({ isOpen: false, sessionId: '' })}>Discard</Button>
            <Button
              className="bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold rounded-xl px-8 shadow-sm text-xs border-none"
              onClick={handleCorrectionSubmit}
              disabled={isActionLoading}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Checkout Reason Dialog */}
      <Dialog open={earlyCheckoutDialog.isOpen} onOpenChange={(open) => setEarlyCheckoutDialog({ isOpen: open })}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-[var(--shadow-card)] bg-[var(--bg-surface)] text-[var(--text-primary)] max-h-[90vh] overflow-y-auto p-0 animate-in slide-in-from-bottom-8 duration-500">
          <div className="h-3 bg-gradient-to-r from-red-400 to-rose-600 w-full" />
          <div className="p-12">
            <DialogHeader className="space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner mb-2 ring-4 ring-rose-50/50">
                <AlertCircle className="h-8 w-8" />
              </div>
              <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">
                Early Checkout Reason
              </DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] leading-relaxed uppercase tracking-tight">
                You are checking out before your scheduled shift end time. Please provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-10">
              <div className="space-y-4">
                <Label htmlFor="early-note" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Reason for early checkout</Label>
                <Textarea
                  id="early-note"
                  placeholder="Provide a reason for checking out early..."
                  className="min-h-[120px] border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm p-6 resize-none transition-all"
                  value={earlyCheckoutReason}
                  onChange={(e) => setEarlyCheckoutReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-4 flex sm:flex-row flex-col">
              <Button variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex-1" onClick={() => setEarlyCheckoutDialog({ isOpen: false })}>Cancel</Button>
              <Button
                className="h-14 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 flex-1 border-none"
                disabled={isActionLoading || earlyCheckoutReason.trim().length < 5}
                onClick={() => performCheckOut({ early_checkout_reason: earlyCheckoutReason })}
              >
                {isActionLoading && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                Submit Checkout
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Justification Dialog */}
      <Dialog open={checkoutDialog.isOpen} onOpenChange={(open) => setCheckoutDialog({ isOpen: open })}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-[var(--shadow-card)] bg-[var(--bg-surface)] text-[var(--text-primary)] max-h-[90vh] overflow-y-auto p-0 animate-in slide-in-from-bottom-8 duration-500">
          <div className="h-3 bg-gradient-to-r from-amber-400 to-orange-500 w-full" />
          <div className="p-12">
            <DialogHeader className="space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner mb-2 ring-4 ring-amber-50/50">
                <AlertCircle className="h-8 w-8" />
              </div>
              <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">
                Overtime Justification
              </DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] leading-relaxed uppercase tracking-tight">
                You are checking out after your shift has ended. Please provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-10">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Reason Type</Label>
                <RadioGroup value={checkoutReason} onValueChange={(val: 'overtime' | 'forgot_checkout') => setCheckoutReason(val)} className="flex flex-col gap-3">
                  <div className={cn(
                    "flex items-center space-x-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                    checkoutReason === 'overtime' ? "bg-indigo-50 border-indigo-200 shadow-sm ring-4 ring-indigo-50/50" : "bg-[var(--bg-surface)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
                  )} onClick={() => setCheckoutReason('overtime')}>
                    <RadioGroupItem value="overtime" id="overtime" className="h-5 w-5 text-[var(--accent-primary)]" />
                    <Label htmlFor="overtime" className="flex-1 font-black text-[var(--text-secondary)] cursor-pointer text-sm">Overtime Work (Business Requirement)</Label>
                  </div>
                  <div className={cn(
                    "flex items-center space-x-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                    checkoutReason === 'forgot_checkout' ? "bg-amber-50 border-amber-200 shadow-sm ring-4 ring-amber-50/50" : "bg-[var(--bg-surface)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
                  )} onClick={() => setCheckoutReason('forgot_checkout')}>
                    <RadioGroupItem value="forgot_checkout" id="forgot_checkout" className="h-5 w-5 text-amber-600" />
                    <Label htmlFor="forgot_checkout" className="flex-1 font-black text-[var(--text-secondary)] cursor-pointer text-sm">Forgot to check out</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label htmlFor="note" className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] ml-1">Explanation Notes</Label>
                <Textarea
                  id="note"
                  placeholder="Provide a reason for this request..."
                  className="min-h-[120px] border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm p-6 resize-none transition-all"
                  value={checkoutNote}
                  onChange={(e) => setCheckoutNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full h-16 bg-[var(--bg-elevated)] hover:bg-slate-800 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 mt-4 border-none"
                disabled={isActionLoading || !checkoutNote.trim()}
                onClick={() => performCheckOut({ checkout_after_shift_reason: checkoutReason, checkout_after_shift_note: checkoutNote })}
              >
                {isActionLoading && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                Check Out
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
