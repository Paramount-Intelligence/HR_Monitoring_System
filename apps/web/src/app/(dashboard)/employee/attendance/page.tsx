'use client';

import { useEffect, useState } from 'react';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { getErrorMessage } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, MapPin, Home, MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LiveTimer } from '@/components/attendance/live-timer';

export default function AttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');
  const [correctionDialog, setCorrectionDialog] = useState<{isOpen: boolean, sessionId: string}>({isOpen: false, sessionId: ''});
  const [correctionReason, setCorrectionReason] = useState('');

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

  const activeSession = sessions.find(s => s.session_status === 'active');

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

  const handleCheckOut = async () => {
    setIsActionLoading(true);
    try {
      await attendanceApi.checkOut();
      toast.success('Checked out successfully');
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = parseISO(dateString);
      return new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (session: AttendanceSession) => {
    const classification = session.attendance_classification || 'active';
    
    switch (classification) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>;
      case 'full_day':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Full Day</Badge>;
      case 'half_day':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Half Day</Badge>;
      case 'insufficient':
        return <Badge variant="destructive">Insufficient</Badge>;
      case 'leave':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Leave</Badge>;
      default:
        return <Badge variant="secondary">{classification.toUpperCase()}</Badge>;
    }
  };

  const getFlags = (session: AttendanceSession) => {
    const flags = [];
    if (session.is_late_login) flags.push(<Badge key="late" variant="outline" className="text-red-600 border-red-200 bg-red-50">Late</Badge>);
    if (session.is_early_logout) flags.push(<Badge key="early" variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Early Out</Badge>);
    if (session.is_corrected) flags.push(<Badge key="corrected" variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Corrected</Badge>);
    
    if (flags.length === 0) return <span className="text-xs text-slate-400">None</span>;
    return <div className="flex flex-wrap gap-1">{flags}</div>;
  };

  const formatDuration = (hours: number | null) => {
    if (hours === null || hours === undefined) return '-';
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500">Manage your daily work sessions.</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>Check in to start your day or check out when you are done.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50 p-6 rounded-lg border border-slate-100">
            <div>
              {activeSession ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium text-slate-900">Currently clocked in</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Since {formatDate(activeSession.check_in_at)} • Mode: {activeSession.work_mode.toUpperCase()}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-slate-300" />
                    <span className="font-medium text-slate-700">Not clocked in</span>
                  </div>
                  <p className="text-sm text-slate-500">Ready to start your day?</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {!activeSession ? (
                <>
                  <Select value={workMode} onValueChange={(val: 'office'|'wfh') => setWorkMode(val)}>
                    <SelectTrigger className="w-[140px] bg-white">
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
                  <Button 
                    onClick={handleCheckIn} 
                    disabled={isActionLoading}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                  >
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Check In
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-6">
                  <LiveTimer checkInAt={activeSession.check_in_at} />
                  <Button 
                    onClick={handleCheckOut} 
                    disabled={isActionLoading}
                    variant="destructive"
                    className="min-w-[120px]"
                  >
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Check Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>Your recent attendance records.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No attendance records found.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check In (PKT)</TableHead>
                    <TableHead>Check Out (PKT)</TableHead>
                    <TableHead>Worked Time</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="text-right">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{formatDate(session.check_in_at)}</TableCell>
                      <TableCell>{formatDate(session.check_out_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatDuration((session as any).total_hours)}</TableCell>
                      <TableCell>{getStatusBadge(session)}</TableCell>
                      <TableCell>{getFlags(session)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
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

      <Dialog open={correctionDialog.isOpen} onOpenChange={(open) => setCorrectionDialog(prev => ({...prev, isOpen: open}))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
            <DialogDescription>
              Provide a reason for the correction. Your manager will set the final check-in and check-out times upon approval.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for correction</Label>
              <Input
                id="reason"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="e.g. Forgot to log in, system issue..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionDialog({ isOpen: false, sessionId: '' })}>Cancel</Button>
            <Button onClick={handleCorrectionSubmit} disabled={isActionLoading}>
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
