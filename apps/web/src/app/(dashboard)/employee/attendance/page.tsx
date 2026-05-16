'use client';

import { useState, useEffect, useMemo } from 'react';
import { attendanceApi } from '@/lib/api/attendance';
import { AttendanceSession } from '@/types';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatPKDate, formatPKDateTime } from '@/lib/time';
import { TableSkeleton } from '@/components/ui/skeletons';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';

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
      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Session Duration</span>
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
      <div className="flex items-center gap-4">
        <div className="bg-amber-100 p-3 rounded-2xl ring-4 ring-amber-50 shadow-sm"><Coffee className="h-5 w-5 text-amber-600 animate-bounce" /></div>
        <div>
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em] leading-none mb-1.5">Operational Pause: {breakType}</p>
          <p className="text-xl font-black text-slate-800 font-mono tracking-tighter">{elapsed}</p>
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
      toast.success('Check-in protocol initiated');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Check-in failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOutClick = () => {
    if (!activeSession) return;

    // Check if current time in PKT is after shift end
    const now = new Date();
    if (activeSession.expected_shift_end_at) {
      const shiftEnd = new Date(activeSession.expected_shift_end_at);
      if (now > shiftEnd) {
        setCheckoutDialog({ isOpen: true });
        return;
      }
    }

    // Normal checkout
    performCheckOut();
  };

  const performCheckOut = async (justification?: { checkout_after_shift_reason: string, checkout_after_shift_note: string }) => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkOut(justification);
      toast.success('Session committed and finalized');
      setCheckoutDialog({ isOpen: false });
      setCheckoutReason('overtime');
      setCheckoutNote('');
      await fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Check-out failed');
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

  const formatDuration = (hours: number | null | undefined) => {
    if (hours === null || hours === undefined) return '-';
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Authentication Hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Attendance</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Session Governance & Shift Intelligence</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-premium group">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              {currentUser?.shift_name ? 'Assigned Shift' : 'Standard Shift'}
            </div>
            <div className="text-sm font-black text-slate-900">
              {currentUser?.shift_name || 'Workforce Standard'}
            </div>
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter opacity-80">
              {currentUser?.shift_timing || '5:00 PM - 2:00 AM PKT'}
            </div>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50">
          <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Clock className="h-6 w-6 text-indigo-600" />
            Shift Controller
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
          <div className="flex flex-col lg:flex-row items-stretch gap-10">
            <div className={cn(
              "flex-1 p-8 rounded-[2rem] border transition-all duration-500 relative overflow-hidden",
              activeSession ? "bg-indigo-50/30 border-indigo-100 shadow-inner" : "bg-slate-50 border-slate-100"
            )}>
              {activeSession && (
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldCheck className="h-32 w-32 rotate-12" />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "h-3 w-3 rounded-full shadow-sm",
                      activeSession ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="font-black text-slate-900 text-3xl tracking-tighter">
                      {activeSession ? 'Session Active' : 'Session Offline'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-tight opacity-70">
                    {activeSession
                      ? `Started at ${formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' })} PKT • ${activeSession.work_mode.toUpperCase()} Environment`
                      : 'Initialize check-in protocol to begin operational tracking.'}
                  </p>
                </div>
                {activeSession && (
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest border-none shadow-md",
                    activeSession.is_late_login ? "bg-rose-500 text-white" : "bg-indigo-600 text-white"
                  )}>
                    {activeSession.is_late_login ? 'LATE ARRIVAL' : 'ON SCHEDULE'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 relative z-10">
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
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{item.label}</div>
                    <div className={cn("text-base font-black text-slate-800 tracking-tight", item.color)}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-6 relative z-10">
                {!activeSession ? (
                  <>
                    <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-1.5 pr-4 shadow-sm group hover:border-indigo-200 transition-all">
                      <Select value={workMode} onValueChange={(val: 'office' | 'wfh') => setWorkMode(val)}>
                        <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 h-10 font-black text-[10px] uppercase tracking-widest text-slate-600">
                          <SelectValue placeholder="Work Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-premium-lg">
                          <SelectItem value="office" className="text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer">
                            <div className="flex items-center">
                              <MapPin className="mr-3 h-4 w-4 text-indigo-500" />
                              Office Base
                            </div>
                          </SelectItem>
                          <SelectItem value="wfh" className="text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer">
                            <div className="flex items-center">
                              <Home className="mr-3 h-4 w-4 text-indigo-500" />
                              Remote Unit
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCheckIn}
                      disabled={isActionLoading}
                      size="lg"
                      className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl px-10 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                    >
                      {isActionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                      Finalize Check In
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-10 w-full animate-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full">
                      <div className="bg-white p-5 rounded-[1.5rem] border border-indigo-100 shadow-sm flex-1 ring-4 ring-white">
                        <LiveTimer checkInAt={activeSession.check_in_at} />
                      </div>
                      <Button
                        onClick={handleCheckOutClick}
                        disabled={isActionLoading || !!activeSession.active_break}
                        size="lg"
                        className="h-16 min-w-[200px] bg-rose-600 text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-rose-700 rounded-2xl shadow-xl shadow-rose-100 transition-all active:scale-95"
                      >
                        {isActionLoading ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <LogOut className="mr-3 h-5 w-5" />}
                        Check Out
                      </Button>
                    </div>

                    {/* Break Controls */}
                    <div className="pt-8 border-t border-indigo-100/40">
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
                            <div className="flex bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm ring-4 ring-white">
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
                                    breakType === b.id ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm" : "text-slate-400 hover:text-slate-900"
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
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest h-12 px-8 rounded-2xl shadow-lg active:scale-95 transition-all"
                            >
                              {isBreakLoading ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Coffee className="mr-3 h-4 w-4" />}
                              Start Break
                            </Button>
                          </div>
                          
                          {showBreakNote && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 max-w-lg">
                              <Input 
                                placeholder="Purpose of custom operational pause..." 
                                className="h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-slate-50/50 font-bold text-xs uppercase tracking-tight pl-6"
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

      <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <History className="h-6 w-6 text-indigo-600" />
              Session Ledger
            </CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historical Operational Performance</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={5} cols={7} /></div>
          ) : sessions.length === 0 ? (
            <div className="p-20 text-center">
              <EmptyState message="No session history discovered in the organizational records." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-b border-slate-100 h-16">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 pl-10">Date/Time</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Shift Gate</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Execution</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Pause Buffer</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Governance</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Exceptions</TableHead>
                    <TableHead className="text-right pr-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-slate-50/30 transition-all duration-300 border-b border-slate-50 last:border-0 h-24">
                      <TableCell className="font-black text-slate-900 tracking-tight pl-10">
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
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border-indigo-100 py-0 animate-pulse">Open Session</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl w-fit border border-slate-200 shadow-inner">
                          {formatDuration(session.total_hours)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl w-fit border border-amber-100">
                            {(session.total_break_minutes || 0)}m
                          </div>
                          {session.breaks && session.breaks.length > 0 && (
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter opacity-60">
                              {session.breaks.filter(b => b.ended_at).map(b => `${b.break_type[0].toUpperCase()}: ${b.duration_minutes}m`).join(', ')}
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
                            <Badge className="bg-slate-100 text-slate-600 border-none shadow-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Audit</Badge>
                          )}
                          {!session.is_late_login && !session.is_early_logout && !session.is_corrected && (
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-40">Zero</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] shadow-premium-lg border-slate-100 p-2">
                            <DropdownMenuItem
                              className="text-indigo-600 focus:text-indigo-700 font-black text-[10px] uppercase tracking-[0.1em] cursor-pointer rounded-xl h-12"
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
        </CardContent>
      </Card>

      {/* Correction Dialog */}
      <Dialog open={correctionDialog.isOpen} onOpenChange={(open) => setCorrectionDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none shadow-premium-lg p-10 animate-in zoom-in-95 duration-300">
          <DialogHeader className="space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner mb-2">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">Attendance Correction</DialogTitle>
            <DialogDescription className="text-base font-bold text-slate-500 leading-relaxed">
              Submit a formal request to modify this session log. Provide detailed governance justification for administrative review.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <Label htmlFor="reason" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Correction Justification</Label>
            <Textarea
              id="reason"
              className="min-h-[160px] border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 rounded-2xl bg-slate-50/50 font-bold text-sm leading-relaxed p-6 resize-none transition-all"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Explain why the session ledger requires amendment (e.g., technical failure, manual oversight, external disruption)..."
            />
          </div>
          <DialogFooter className="gap-4 flex sm:flex-row flex-col">
            <Button variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex-1" onClick={() => setCorrectionDialog({ isOpen: false, sessionId: '' })}>Discard Request</Button>
            <Button
              className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl px-12 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex-1"
              onClick={handleCorrectionSubmit}
              disabled={isActionLoading}
            >
              {isActionLoading && <Loader2 className="mr-3 h-4 w-4 animate-spin" />}
              Commit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Justification Dialog */}
      <Dialog open={checkoutDialog.isOpen} onOpenChange={(open) => setCheckoutDialog({ isOpen: open })}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] border-none shadow-premium-lg overflow-hidden p-0 animate-in slide-in-from-bottom-8 duration-500">
          <div className="h-3 bg-gradient-to-r from-amber-400 to-orange-500 w-full" />
          <div className="p-12">
            <DialogHeader className="space-y-4">
              <div className="h-16 w-16 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner mb-2 ring-4 ring-amber-50/50">
                <AlertCircle className="h-8 w-8" />
              </div>
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter">
                Overtime Protocol
              </DialogTitle>
              <DialogDescription className="text-sm font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                Session activity detected after scheduled shift end ({currentUser?.shift_timing?.split(' - ')[1] || '2:00 AM PKT'}). Governance justification required.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8 py-10">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Overtime Categorization</Label>
                <RadioGroup value={checkoutReason} onValueChange={(val: 'overtime' | 'forgot_checkout') => setCheckoutReason(val)} className="flex flex-col gap-3">
                  <div className={cn(
                    "flex items-center space-x-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                    checkoutReason === 'overtime' ? "bg-indigo-50 border-indigo-200 shadow-sm ring-4 ring-indigo-50/50" : "bg-white border-slate-100 hover:bg-slate-50"
                  )} onClick={() => setCheckoutReason('overtime')}>
                    <RadioGroupItem value="overtime" id="overtime" className="h-5 w-5 text-indigo-600" />
                    <Label htmlFor="overtime" className="flex-1 font-black text-slate-700 cursor-pointer text-sm">Execution Overtime (Business Requirement)</Label>
                  </div>
                  <div className={cn(
                    "flex items-center space-x-4 p-5 rounded-2xl border transition-all cursor-pointer group",
                    checkoutReason === 'forgot_checkout' ? "bg-amber-50 border-amber-200 shadow-sm ring-4 ring-amber-50/50" : "bg-white border-slate-100 hover:bg-slate-50"
                  )} onClick={() => setCheckoutReason('forgot_checkout')}>
                    <RadioGroupItem value="forgot_checkout" id="forgot_checkout" className="h-5 w-5 text-amber-600" />
                    <Label htmlFor="forgot_checkout" className="flex-1 font-black text-slate-700 cursor-pointer text-sm">Temporal Drift / Terminal Oversight</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label htmlFor="note" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Internal Justification</Label>
                <Textarea
                  id="note"
                  placeholder="Provide objective context for the overtime duration..."
                  className="min-h-[120px] border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 rounded-2xl bg-slate-50/50 font-bold text-sm p-6 resize-none transition-all"
                  value={checkoutNote}
                  onChange={(e) => setCheckoutNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 mt-4"
                disabled={isActionLoading || !checkoutNote.trim()}
                onClick={() => performCheckOut({ checkout_after_shift_reason: checkoutReason, checkout_after_shift_note: checkoutNote })}
              >
                {isActionLoading && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                Commit Final Check Out
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

