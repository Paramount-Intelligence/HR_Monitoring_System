'use client';

import { useState, useEffect, useMemo } from 'react';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { 
  Clock, LogIn, LogOut, Coffee, Utensils, Zap, MoreVertical, 
  MapPin, Home, Loader2, AlertCircle, ShieldCheck, History,
  LayoutDashboard, Info, ArrowRight, RefreshCcw
} from 'lucide-react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatAttendanceDuration, formatSafeDurationFromSeconds } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatPKDate, formatPKDateTime } from '@/lib/time';
import { TableSkeleton } from '@/components/ui/skeletons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';

function getErrorMessage(error: any) {
  return error.response?.data?.detail || error.message;
}

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
      <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] mb-1">Session Duration</span>
      <span className="text-lg font-bold text-[var(--accent-primary)] font-mono tracking-tight">{elapsed}</span>
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
      <div className="flex items-center gap-4">
        <div className="bg-amber-100 p-3 rounded-2xl ring-4 ring-amber-50 shadow-sm"><Coffee className="h-5 w-5 text-amber-600 animate-bounce" /></div>
        <div>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em] leading-none mb-1.5">Break: {breakType}</p>
          <p className="text-xl font-black text-[var(--text-primary)] font-mono tracking-tighter">{elapsed}</p>
        </div>
      </div>
    </div>
  );
};


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
      toast.success('Check-in process initiated');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Check-in failed');
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
      const msg = getErrorMessage(error) || 'Check-out failed';
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
      toast.error('Note is required for custom break types');
      return;
    }
    
    setIsBreakLoading(true);
    try {
      await attendanceApi.startBreak(breakType, breakNote);
      toast.success(`${breakType.toUpperCase()} break started`);
      setBreakNote('');
      setShowBreakNote(false);
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to initiate break');
    } finally {
      setIsBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setIsBreakLoading(true);
    try {
      await attendanceApi.endBreak();
      toast.success('Break finalized');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to end break');
    } finally {
      setIsBreakLoading(false);
    }
  };

  const handleCorrectionSubmit = async () => {
    if (!correctionReason.trim()) {
      toast.error('Justification is required');
      return;
    }
    setIsActionLoading(true);
    try {
      await attendanceApi.requestCorrection(correctionDialog.sessionId, correctionReason);
      toast.success('Correction request submitted for review');
      setCorrectionDialog({ isOpen: false, sessionId: '' });
      setCorrectionReason('');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to submit request');
    } finally {
      setIsActionLoading(false);
    }
  };


  const todaySession = useMemo(() => {
    if (activeSession) return activeSession;
    return sessions[0] ?? null;
  }, [activeSession, sessions]);

  const breakMinutes = Number(activeSession?.total_break_minutes);
  const breakLabel = Number.isFinite(breakMinutes) && breakMinutes >= 0
    ? formatSafeDurationFromSeconds(breakMinutes * 60)
    : '0m';

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="Attendance"
        subtitle="Daily shift activity and tracked work hours"
        icon={ShieldCheck}
        actions={
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
            <LayoutDashboard className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {currentUser?.shift_name ? 'Assigned Shift' : 'Standard Shift'}
              </p>
              <p className="font-semibold text-[var(--text-primary)]">{currentUser?.shift_name || 'Standard Shift'}</p>
              <p className="text-[10px] text-[var(--accent-primary)]">{currentUser?.shift_timing || '5:00 PM - 2:00 AM PKT'}</p>
            </div>
          </div>
        }
      />

      <EmployeeMetricGrid>
        <EmployeeMetricCard
          title="Attendance Status"
          value={activeSession ? 'Checked In' : 'Not Checked In'}
          icon={LogIn}
        />
        <EmployeeMetricCard
          title="Today Check-In"
          value={activeSession ? formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' }) : '—'}
          icon={Clock}
        />
        <EmployeeMetricCard
          title="Logged Duration"
          value={activeSession ? formatAttendanceDuration(activeSession) : (todaySession ? formatAttendanceDuration(todaySession) : '—')}
          icon={Clock}
        />
        <EmployeeMetricCard title="Break Duration" value={activeSession ? breakLabel : '0m'} icon={Coffee} />
      </EmployeeMetricGrid>

      <EmployeeSectionCard title="Shift Controller" icon={Clock}>
          <div className="flex flex-col lg:flex-row items-stretch gap-4">
            <div className={cn(
              "flex-1 p-4 rounded-xl border transition-all relative overflow-hidden",
              activeSession ? "bg-[var(--accent-soft)] border-[var(--accent-primary)]/20" : "bg-[var(--bg-subtle)] border-[var(--border-subtle)]"
            )}>
              {activeSession && (
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldCheck className="h-32 w-32 rotate-12" />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("h-2 w-2 rounded-full", activeSession ? "bg-emerald-500 animate-pulse" : "bg-[var(--text-muted)]")} />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {activeSession ? 'Shift Session Active' : 'Session Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {activeSession
                      ? `Started at ${formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' })} PKT • ${activeSession.work_mode.toUpperCase()} Environment`
                      : 'Check in to begin your shift.'}
                  </p>
                </div>
                {activeSession && (
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-none shadow-md text-white",
                    activeSession.is_late_login ? "bg-rose-500" : "bg-[var(--accent-primary)]"
                  )}>
                    {activeSession.is_late_login ? 'LATE ARRIVAL' : 'ON SCHEDULE'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 relative z-10">
                {[
                  { label: "Expected In", value: currentUser?.shift_timing?.split(' - ')[0] || '5:00 PM' },
                  { label: "Expected Out", value: currentUser?.shift_timing?.split(' - ')[1] || '2:00 AM' },
                  { label: "Actual In", value: activeSession ? formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' }) : '—' },
                  { 
                    label: "Late Penalty", 
                    value: activeSession?.is_late_login ? `${Math.floor((activeSession.late_minutes || 0) / 60)}h ${(activeSession.late_minutes || 0) % 60}m` : '0m',
                    color: activeSession?.is_late_login ? 'text-rose-600' : 'text-emerald-600'
                  }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.2em]">{item.label}</div>
                    <div className={cn("text-base font-black text-[var(--text-secondary)] tracking-tight", item.color)}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-6 relative z-10">
                {!activeSession ? (
                  <>
                    <div className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-1.5 pr-4 shadow-sm group hover:border-indigo-200 transition-all">
                      <Select value={workMode} onValueChange={(val) => { if (val) setWorkMode(val as 'office' | 'wfh'); }}>
                        <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 h-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                          <SelectValue placeholder="Work Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-[var(--border-subtle)] shadow-[var(--shadow-card)] bg-[var(--bg-surface)] text-[var(--text-primary)]">
                          <SelectItem value="office" className="text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer">
                            <div className="flex items-center">
                              <MapPin className="mr-3 h-4 w-4 text-[var(--accent-primary)]" />
                              Office Base
                            </div>
                          </SelectItem>
                          <SelectItem value="wfh" className="text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer">
                            <div className="flex items-center">
                              <Home className="mr-3 h-4 w-4 text-[var(--accent-primary)]" />
                              Work From Home
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCheckIn}
                      disabled={isActionLoading}
                      size="sm"
                      className="rounded-lg"
                    >
                      {isActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                      Check In
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                      <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-subtle)] flex-1">
                        <LiveTimer checkInAt={activeSession.check_in_at} />
                      </div>
                      <Button
                        onClick={handleCheckOutClick}
                        disabled={isActionLoading || !!activeSession.active_break}
                        size="sm"
                        variant="destructive"
                        className="rounded-lg min-w-[140px]"
                      >
                        {isActionLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <LogOut className="mr-3 h-5 w-5" />}
                        Check Out
                      </Button>
                    </div>

                    {/* Break Controls */}
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                      {activeSession.active_break ? (
                        <div className="flex flex-col sm:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-8 py-5 flex-1 w-full shadow-inner">
                            <BreakTimer 
                              startedAt={activeSession.active_break.started_at} 
                              breakType={activeSession.active_break.break_type} 
                            />
                          </div>
                          <Button 
                            onClick={handleEndBreak}
                            disabled={isBreakLoading}
                            variant="outline"
                            className="w-full sm:w-auto h-16 min-w-[200px] rounded-2xl border-amber-200 text-amber-700 hover:bg-amber-50 font-black text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                          >
                            {isBreakLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCcw className="mr-2 h-5 w-5" />}
                            Resume Shift
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-1.5 shadow-sm ring-4 ring-white">
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
                                    "h-10 gap-3 rounded-xl font-black text-[10px] uppercase tracking-widest px-5 transition-all",
                                    breakType === b.id ? "bg-indigo-50 text-[var(--accent-primary)] hover:bg-indigo-100 shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  )}
                                  onClick={() => { setBreakType(b.id); setShowBreakNote(b.id === 'other'); }}
                                >
                                  <b.icon className="h-4 w-4" />
                                  {b.label}
                                </Button>
                              ))}
                            </div>
                            
                            <Button 
                              onClick={handleStartBreak}
                              disabled={isBreakLoading}
                              className="bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg active:scale-95 transition-all border-none"
                            >
                              {isBreakLoading ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Coffee className="mr-3 h-4 w-4" />}
                              Start Break
                            </Button>
                          </div>
                          
                          {showBreakNote && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 max-w-lg">
                              <Input 
                                placeholder="Reason for custom break..." 
                                className="h-12 border-[var(--border-default)] focus:border-[var(--accent-primary)] rounded-xl bg-[var(--bg-subtle)] font-bold text-xs uppercase tracking-tight pl-6 text-[var(--text-primary)]"
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
      </EmployeeSectionCard>

      <EmployeeSectionCard title="Attendance History" description="Log of attendance sessions" icon={History} noPadding contentClassName="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={5} cols={7} /></div>
          ) : sessions.length === 0 ? (
            <div className="p-20 text-center">
              <EmptyState title="No session history" description="No session history discovered in the organizational records." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)]">
                  <TableRow className="hover:bg-transparent border-b border-[var(--border-subtle)] h-16">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)] pl-10">Date/Time</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Shift Times</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Logged Hours</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Break Duration</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Status</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Details</TableHead>
                    <TableHead className="text-right pr-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-[var(--bg-subtle)]/50 transition-all border-b border-[var(--border-subtle)] last:border-0 h-14">
                      <TableCell className="font-black text-[var(--text-primary)] tracking-tight pl-10">
                        {formatPKDate(session.check_in_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-[11px] font-black text-emerald-600 uppercase tracking-tighter">
                            <LogIn className="h-3 w-3" />
                            {formatPKDateTime(session.check_in_at, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {session.check_out_at ? (
                            <div className="flex items-center gap-2 text-[11px] font-black text-rose-500 uppercase tracking-tighter">
                              <LogIn className="h-3 w-3" />
                              {formatPKDateTime(session.check_out_at, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-[var(--accent-primary)] border-indigo-100 py-0 animate-pulse border-none">Open Session</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-black text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-xl w-fit border border-[var(--border-subtle)] shadow-inner">
                          {formatAttendanceDuration(session)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl w-fit border border-amber-100">
                            {(session.total_break_minutes || 0)}m
                          </div>
                          {session.breaks && session.breaks.length > 0 && (
                            <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-tighter opacity-60">
                              {session.breaks.filter(b => b.ended_at).map(b => `${b.break_type.charAt(0).toUpperCase() + b.break_type.slice(1)}: ${b.duration_minutes}m`).join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={session.attendance_classification || 'active'} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {session.is_late_login && (
                            <Badge className="bg-rose-50 text-rose-600 border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Late</Badge>
                          )}
                          {session.is_early_logout && (
                            <Badge className="bg-amber-50 text-amber-600 border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Early</Badge>
                          )}
                          {session.is_corrected && (
                            <Badge className="bg-slate-100 text-[var(--text-secondary)] border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Adjusted</Badge>
                          )}
                          {session.checkout_after_shift_reason === 'auto_checkout' && (
                            <Badge className="bg-amber-100 text-amber-700 border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Auto Closed</Badge>
                          )}
                          {!session.is_late_login && !session.is_early_logout && !session.is_corrected && session.checkout_after_shift_reason !== 'auto_checkout' && (
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-40">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-xl transition-all">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] shadow-[var(--shadow-card)] border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-2">
                            <DropdownMenuItem
                              className="text-[var(--accent-primary)] focus:text-[var(--accent-primary)] font-black text-[10px] uppercase tracking-[0.1em] cursor-pointer rounded-xl h-12"
                              onClick={() => setCorrectionDialog({ isOpen: true, sessionId: session.id })}
                              disabled={session.correction_requested}
                            >
                              Request Correction
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
      </EmployeeSectionCard>

      <Dialog open={correctionDialog.isOpen} onOpenChange={(open) => setCorrectionDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance Correction Request</DialogTitle>
            <DialogDescription>
              Submit a request to adjust this session. Please provide a reason for the adjustment.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="reason" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Adjustment Reason</Label>
            <Textarea
              id="reason"
              className="min-h-[120px] rounded-lg bg-[var(--bg-subtle)] border-[var(--border-default)] text-sm resize-none"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Provide a reason for this request..."
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCorrectionDialog({ isOpen: false, sessionId: '' })}>Cancel</Button>
            <Button size="sm" onClick={handleCorrectionSubmit} disabled={isActionLoading}>
              {isActionLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={earlyCheckoutDialog.isOpen} onOpenChange={(open) => setEarlyCheckoutDialog({ isOpen: open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Early Checkout Reason</DialogTitle>
            <DialogDescription>
              You are checking out before your scheduled shift end time. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Label htmlFor="early-note" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Reason for early checkout</Label>
            <Textarea
              id="early-note"
              placeholder="Provide a reason for checking out early..."
              className="min-h-[120px] rounded-lg bg-[var(--bg-subtle)] border-[var(--border-default)] text-sm resize-none"
              value={earlyCheckoutReason}
              onChange={(e) => setEarlyCheckoutReason(e.target.value)}
            />
          </DialogBody>
          <DialogFooter className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 flex-col gap-3 sm:flex-col">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setEarlyCheckoutDialog({ isOpen: false })}>Cancel</Button>
            <Button
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              disabled={isActionLoading || earlyCheckoutReason.trim().length < 5}
              onClick={() => performCheckOut({ early_checkout_reason: earlyCheckoutReason })}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking out...
                </>
              ) : (
                'Submit Checkout'
              )}
            </Button>
            {earlyCheckoutReason.trim().length < 5 && !isActionLoading && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Enter at least 5 characters to submit checkout.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutDialog.isOpen} onOpenChange={(open) => setCheckoutDialog({ isOpen: open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Overtime Justification</DialogTitle>
            <DialogDescription>
              You are checking out after your shift has ended. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Reason Type</Label>
              <RadioGroup value={checkoutReason} onValueChange={(val: 'overtime' | 'forgot_checkout') => setCheckoutReason(val)} className="flex flex-col gap-2">
                <div className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer",
                  checkoutReason === 'overtime' ? "bg-[var(--accent-soft)] border-[var(--accent-primary)]/30" : "border-[var(--border-default)]"
                )} onClick={() => setCheckoutReason('overtime')}>
                  <RadioGroupItem value="overtime" id="overtime" />
                  <Label htmlFor="overtime" className="flex-1 cursor-pointer text-sm">Overtime Work (Business Requirement)</Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer",
                  checkoutReason === 'forgot_checkout' ? "bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]" : "border-[var(--border-default)]"
                )} onClick={() => setCheckoutReason('forgot_checkout')}>
                  <RadioGroupItem value="forgot_checkout" id="forgot_checkout" />
                  <Label htmlFor="forgot_checkout" className="flex-1 cursor-pointer text-sm">Forgot to check out</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="note" className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Explanation Notes</Label>
              <Textarea
                id="note"
                placeholder="Provide a reason for this request..."
                className="min-h-[100px] rounded-lg bg-[var(--bg-subtle)] border-[var(--border-default)] text-sm resize-none"
                value={checkoutNote}
                onChange={(e) => setCheckoutNote(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 flex-col gap-3 sm:flex-col">
            <Button
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
              disabled={isActionLoading || !checkoutNote.trim()}
              onClick={() => performCheckOut({ checkout_after_shift_reason: checkoutReason, checkout_after_shift_note: checkoutNote })}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking out...
                </>
              ) : (
                'Check Out'
              )}
            </Button>
            {!checkoutNote.trim() && !isActionLoading && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Add explanation notes to enable checkout.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EmployeePageShell>
  );
}
