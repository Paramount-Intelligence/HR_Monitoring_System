'use client';

import { useEffect, useState } from 'react';
import { attendanceApi, AttendanceSession } from '@/lib/api/attendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, MapPin, Home } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AttendancePage() {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office');

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
      toast.error(error.response?.data?.detail || 'Failed to check in');
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
      toast.error(error.response?.data?.detail || 'Failed to check out');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'PPp');
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-slate-50 text-slate-700">Completed</Badge>;
      case 'incomplete':
        return <Badge variant="destructive">Incomplete</Badge>;
      case 'corrected':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Corrected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
                <Button 
                  onClick={handleCheckOut} 
                  disabled={isActionLoading}
                  variant="destructive"
                  className="min-w-[120px]"
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  Check Out
                </Button>
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
                    <TableHead>Date & Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{formatDate(session.check_in_at)}</TableCell>
                      <TableCell>{formatDate(session.check_out_at)}</TableCell>
                      <TableCell className="capitalize">{session.work_mode}</TableCell>
                      <TableCell>{getStatusBadge(session.session_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
