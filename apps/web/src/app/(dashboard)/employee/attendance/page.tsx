'use client';

import { useEffect, useState, useMemo } from 'react';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { getErrorMessage } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, MapPin, Home, MoreVertical, Clock, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiveTimer } from '@/components/attendance/live-timer';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function AttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');
  
  // Correction Dialog
  const [correctionDialog, setCorrectionDialog] = useState<{isOpen: boolean, sessionId: string}>({isOpen: false, sessionId: ''});
  const [correctionReason, setCorrectionReason] = useState('');

  // Checkout Justification Dialog
  const [checkoutDialog, setCheckoutDialog] = useState({ isOpen: false });
  const [checkoutReason, setCheckoutReason] = useState<'overtime' | 'forgot'>('overtime');
  const [checkoutNote, setCheckoutNote] = useState('');

  const fetchSessions = async () => {
    try {
      const data = await attendanceApi.getMySessions();
      setSessions(data);
    } catch (error) {
      toast.error('Failed to load attendance history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const activeSession = useMemo(() => sessions.find(s => s.session_status === 'active'), [sessions]);

  const handleCheckIn = async () => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkIn(workMode);
      toast.success('Checked in successfully');
      await fetchSessions();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to check in');
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

  const performCheckOut = async (justification?: { reason: string, note: string }) => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkOut(justification);
      toast.success('Checked out successfully');
      setCheckoutDialog({ isOpen: false });
      setCheckoutReason('overtime');
      setCheckoutNote('');
      await fetchSessions();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to check out');
    } finally {
      setIsActionLoading(false);
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
      await fetchSessions();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to submit correction request');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDatePKT = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(date);
    } catch (e) {
      return '-';
    }
  };

  const formatFullDatePKT = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return '-';
    }
  };

  const getStatusBadge = (session: AttendanceSession) => {
    const classification = session.attendance_classification || 'active';
    
    switch (classification) {
      case 'active':
        return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none shadow-sm">ACTIVE</Badge>;
      case 'full_day':
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700 border-none shadow-sm">FULL DAY</Badge>;
      case 'half_day':
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600 border-none shadow-sm">HALF DAY</Badge>;
      case 'short_leave':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600 border-none shadow-sm">SHORT LEAVE</Badge>;
      case 'insufficient':
        return <Badge variant="destructive" className="shadow-sm">INSUFFICIENT</Badge>;
      case 'leave':
        return <Badge className="bg-purple-600 text-white hover:bg-purple-700 border-none shadow-sm">LEAVE</Badge>;
      default:
        return <Badge variant="secondary" className="shadow-sm">{classification.toUpperCase()}</Badge>;
    }
  };

  const getFlags = (session: AttendanceSession) => {
    const flags = [];
    if (session.is_late_login) {
      flags.push(
        <Badge key="late" variant="outline" className="text-red-700 border-red-200 bg-red-50 gap-1 px-2 py-0.5">
          <Clock className="h-3 w-3" /> Late {session.late_minutes ? `${Math.floor(session.late_minutes/60)}h ${session.late_minutes%60}m` : ''}
        </Badge>
      );
    }
    if (session.is_early_logout) {
      flags.push(
        <Badge key="early" variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 gap-1 px-2 py-0.5">
          <AlertCircle className="h-3 w-3" /> Early Out
        </Badge>
      );
    }
    if (session.is_overtime) {
      flags.push(
        <Badge key="overtime" variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 gap-1 px-2 py-0.5">
          Overtime
        </Badge>
      );
    }
    if (session.is_corrected) {
      flags.push(
        <Badge key="corrected" variant="outline" className="text-slate-700 border-slate-200 bg-slate-50 gap-1 px-2 py-0.5">
          Corrected
        </Badge>
      );
    }
    
    if (flags.length === 0) return <span className="text-xs text-slate-400">None</span>;
    return <div className="flex flex-wrap gap-1.5">{flags}</div>;
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">Manage your daily work sessions and shift requirements.</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-500">Current Shift</div>
          <div className="text-lg font-bold text-blue-600">5:00 PM - 2:00 AM (PKT)</div>
        </div>
      </div>

      <Card className="shadow-md border-slate-200 overflow-hidden">
        <div className="h-1 bg-blue-600 w-full" />
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Shift Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-stretch gap-6">
            <div className={`flex-1 p-6 rounded-xl border transition-all ${activeSession ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`h-2.5 w-2.5 rounded-full ${activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="font-bold text-slate-900 text-lg">
                      {activeSession ? 'Actively Working' : 'Not Clocked In'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    {activeSession 
                      ? `Since ${formatDatePKT(activeSession.check_in_at)} • ${activeSession.work_mode.toUpperCase()} Mode` 
                      : 'You are currently offline. Check in to start tracking.'}
                  </p>
                </div>
                {activeSession && (
                  <Badge className="bg-blue-600 text-white border-none px-3 py-1">
                    {activeSession.is_late_login ? 'LATE' : 'ON TIME'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Expected Check-in</div>
                  <div className="font-semibold text-slate-700">5:00 PM</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Expected Check-out</div>
                  <div className="font-semibold text-slate-700">2:00 AM</div>
                </div>
                {activeSession && (
                  <>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Check-in at</div>
                      <div className="font-semibold text-blue-600">{formatDatePKT(activeSession.check_in_at)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Late by</div>
                      <div className={`font-semibold ${activeSession.is_late_login ? 'text-red-600' : 'text-emerald-600'}`}>
                        {activeSession.is_late_login ? `${Math.floor((activeSession.late_minutes || 0)/60)}h ${(activeSession.late_minutes || 0)%60}m` : '0m'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {!activeSession ? (
                  <>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 pr-3">
                       <Select value={workMode} onValueChange={(val: 'office'|'wfh') => setWorkMode(val)}>
                        <SelectTrigger className="w-[130px] border-none shadow-none focus:ring-0 h-9">
                          <SelectValue placeholder="Work Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-4 w-4 text-slate-500" />
                              Office
                            </div>
                          </SelectItem>
                          <SelectItem value="wfh">
                            <div className="flex items-center">
                              <Home className="mr-2 h-4 w-4 text-slate-500" />
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
                      className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-lg shadow-blue-200"
                    >
                      {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                      CHECK IN
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
                    <LiveTimer checkInAt={activeSession.check_in_at} />
                    <Button 
                      onClick={handleCheckOutClick} 
                      disabled={isActionLoading}
                      variant="destructive"
                      size="lg"
                      className="min-w-[140px] shadow-lg shadow-red-200"
                    >
                      {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                      CHECK OUT
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Your recent attendance and worked duration tracking.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-200" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No attendance records found yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Worked Time</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="min-w-[150px]">Flags</TableHead>
                    <TableHead className="text-right">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-semibold text-slate-700 whitespace-nowrap">
                        {formatFullDatePKT(session.check_in_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           <LogIn className="h-3 w-3 text-emerald-500" />
                           {formatDatePKT(session.check_in_at)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">
                        {session.check_out_at ? (
                          <div className="flex items-center gap-2">
                             <LogOut className="h-3 w-3 text-red-400" />
                             {formatDatePKT(session.check_out_at)}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">In Progress</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded w-fit">
                          {formatDuration(session.total_hours)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session)}</TableCell>
                      <TableCell>{getFlags(session)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              className="text-blue-600 focus:text-blue-700 font-medium cursor-pointer"
                              onClick={() => setCorrectionDialog({ isOpen: true, sessionId: session.id })}
                              disabled={session.correction_requested}
                            >
                              Request Correction
                            </DropdownMenuItem>
                            {session.checkout_after_shift_note && (
                              <DropdownMenuItem className="text-xs text-slate-500 cursor-default">
                                View Note: {session.checkout_after_shift_note.substring(0, 20)}...
                              </DropdownMenuItem>
                            )}
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
      <Dialog open={correctionDialog.isOpen} onOpenChange={(open) => setCorrectionDialog(prev => ({...prev, isOpen: open}))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
            <DialogDescription>
              Provide a clear reason for the correction. Your manager will set the final check-in and check-out times.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="font-bold">Reason for correction</Label>
              <Textarea
                id="reason"
                className="min-h-[100px] border-slate-200 focus:border-blue-500"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Forgot to log in, internet issues, or late arrival explanation..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-200 text-slate-600" onClick={() => setCorrectionDialog({ isOpen: false, sessionId: '' })}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6" 
              onClick={handleCorrectionSubmit} 
              disabled={isActionLoading}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Justification Dialog */}
      <Dialog open={checkoutDialog.isOpen} onOpenChange={(open) => setCheckoutDialog({ isOpen: open })}>
        <DialogContent className="sm:max-w-md border-t-4 border-t-amber-500">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Late Checkout Detected
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Your shift ended at 2:00 AM. Please provide a reason for checking out after the scheduled time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-900 uppercase tracking-tight">Select Reason Type</Label>
              <RadioGroup value={checkoutReason} onValueChange={(val: 'overtime' | 'forgot') => setCheckoutReason(val)} className="flex flex-col gap-2">
                <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${checkoutReason === 'overtime' ? 'bg-blue-50 border-blue-200' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <RadioGroupItem value="overtime" id="overtime" className="text-blue-600" />
                  <Label htmlFor="overtime" className="flex-1 font-semibold cursor-pointer">Overtime (Work related)</Label>
                </div>
                <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${checkoutReason === 'forgot' ? 'bg-amber-50 border-amber-200' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <RadioGroupItem value="forgot" id="forgot" className="text-amber-600" />
                  <Label htmlFor="forgot" className="flex-1 font-semibold cursor-pointer">Forgot to Check Out / Mistake</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="note" className="text-sm font-bold text-slate-900 uppercase tracking-tight">Justification Note</Label>
              <Textarea
                id="note"
                placeholder="Explain why the checkout was delayed..."
                className="min-h-[80px] border-slate-200 focus:border-blue-500"
                value={checkoutNote}
                onChange={(e) => setCheckoutNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12" 
              disabled={isActionLoading || !checkoutNote.trim()}
              onClick={() => performCheckOut({ reason: checkoutReason, note: checkoutNote })}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              CONFIRM CHECK OUT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

