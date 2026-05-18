'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import { User } from '@/types';
import { toast } from 'sonner';
import { 
  ArrowLeft, Loader2, Calendar, Clock, 
  Briefcase, CheckCircle2, AlertOctagon,
  FileText, ListTodo, Goal, History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  hr_operations: 'HR & Operations',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  intern: 'Intern',
  junior_employee: 'Junior Employee',
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  } catch (e) {
    return dateString;
  }
};

const formatShortDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch (e) {
    return dateString;
  }
};

export default function AdminEmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('30days'); // '7days', '30days', 'month'

  useEffect(() => {
    if (id) {
      loadProfileData();
    }
  }, [id, dateFilter]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      
      const now = new Date();
      let startDate = new Date();
      if (dateFilter === '7days') startDate.setDate(now.getDate() - 7);
      else if (dateFilter === '30days') startDate.setDate(now.getDate() - 30);
      else if (dateFilter === 'month') startDate.setDate(1); // start of month
      
      const response = await usersApi.getAdminUserProfile(id as string, {
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
      });
      setData(response);
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to load employee profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center text-slate-400">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="font-medium">Loading Employee Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertOctagon className="h-16 w-16 text-rose-500" />
        <h2 className="text-xl font-semibold text-slate-900">Profile Not Found</h2>
        <p className="text-slate-500">The requested user profile does not exist or you lack permission to view it.</p>
        <Button onClick={() => router.push('/admin/users')}>Back to Users</Button>
      </div>
    );
  }

  const { profile, attendance_summary, attendance_sessions, breaks, leave_requests, eod_submissions, tasks, time_logs, projects, goals, notes, activity_timeline } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')} className="mt-1 h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
              {profile.full_name}
              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 uppercase text-[10px] tracking-wider">
                {profile.status}
              </Badge>
            </h1>
            <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm font-medium">
              <span>{ROLE_LABELS[profile.role] || profile.role}</span>
              <span>•</span>
              <span>{profile.department_name || profile.department || 'No Department'}</span>
              <span>•</span>
              <span>{profile.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Timeframe</span>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-white shadow-sm border-slate-200">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Check-ins</p>
              <p className="text-2xl font-bold text-slate-900">{attendance_summary.total_check_ins}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Hours Logged</p>
              <p className="text-2xl font-bold text-slate-900">{attendance_summary.total_worked_hours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Leaves requested</p>
              <p className="text-2xl font-bold text-slate-900">{leave_requests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <ListTodo className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Assigned Tasks</p>
              <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl h-auto flex flex-wrap max-w-full overflow-x-auto justify-start border border-slate-200">
          <TabsTrigger value="overview" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Attendance & Breaks</TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Leaves & WFH</TabsTrigger>
          <TabsTrigger value="eod" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">EOD Submissions</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Tasks & Logs</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Projects</TabsTrigger>
          <TabsTrigger value="goals" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">Goals</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Joined On</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{formatShortDate(profile.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Designation</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{profile.designation || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Reporting Manager</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{profile.manager_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Work Shift</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{profile.shift_name ? `${profile.shift_name} (${profile.shift_timing})` : 'Default'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-400" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pl-8 md:pl-0">
                    {activity_timeline.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
                    ) : (
                      activity_timeline.map((event: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute -left-10 md:left-1/2">
                            <History className="h-4 w-4" />
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border border-slate-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-slate-900 text-sm">{event.title}</div>
                            </div>
                            <div className="text-xs text-slate-500">{formatDate(event.date)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance_sessions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No attendance records found.</TableCell></TableRow>
                    ) : (
                      attendance_sessions.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{formatShortDate(s.check_in_at)}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{formatDate(s.check_in_at)}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{formatDate(s.check_out_at)}</TableCell>
                          <TableCell>{s.duration_minutes ? `${(s.duration_minutes / 60).toFixed(1)}h` : '-'}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{s.work_mode}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {s.is_late_login && <Badge variant="destructive" className="bg-rose-100 text-rose-700 border-none">Late In</Badge>}
                              {s.is_early_logout && <Badge variant="destructive" className="bg-amber-100 text-amber-700 border-none" title={s.early_checkout_reason}>Early Out</Badge>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="leaves">
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leave_requests.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No leave requests found.</TableCell></TableRow>
                    ) : (
                      leave_requests.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell>
                            <span className="font-semibold">{l.leave_type}</span>
                            {l.is_half_day && <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">Half Day ({l.half_day_period})</span>}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {formatShortDate(l.start_date)} - {formatShortDate(l.end_date)}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm max-w-xs truncate" title={l.reason}>{l.reason}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{l.status}</Badge></TableCell>
                          <TableCell className="text-slate-500 text-sm">{formatShortDate(l.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="eod">
            <div className="grid grid-cols-1 gap-4">
              {eod_submissions.length === 0 ? (
                <Card className="border-none shadow-sm"><CardContent className="text-center py-8 text-slate-500">No EOD submissions found.</CardContent></Card>
              ) : (
                eod_submissions.map((eod: any) => (
                  <Card key={eod.id} className="border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          EOD for {formatShortDate(eod.report_date)}
                        </CardTitle>
                        <Badge variant="outline" className={eod.manager_reviewed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}>
                          {eod.manager_reviewed ? 'Reviewed' : 'Pending Review'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Today's Summary</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded whitespace-pre-wrap">{eod.summary}</p>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">Blockers</h4>
                          <p className="text-sm text-slate-600">{eod.blockers || 'None'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">Tomorrow's Plan</h4>
                          <p className="text-sm text-slate-600">{eod.next_day_plan}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="space-y-6">
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader><CardTitle className="text-lg">Assigned Tasks</CardTitle></CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No tasks found.</TableCell></TableRow>
                      ) : (
                        tasks.map((t: any) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.title}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{t.status.replace('_', ' ')}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{t.priority}</Badge></TableCell>
                            <TableCell className="text-slate-500 text-sm">{formatShortDate(t.due_date)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader><CardTitle className="text-lg">Time Logs</CardTitle></CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>Started At</TableHead>
                        <TableHead>Ended At</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {time_logs.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No time logs found.</TableCell></TableRow>
                      ) : (
                        time_logs.map((tl: any) => (
                          <TableRow key={tl.id}>
                            <TableCell className="text-slate-500 text-sm">{formatDate(tl.started_at)}</TableCell>
                            <TableCell className="text-slate-500 text-sm">{formatDate(tl.ended_at)}</TableCell>
                            <TableCell className="font-medium">{tl.duration_minutes}m</TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize text-[10px]">{tl.source}</Badge></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead>Project Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No projects found.</TableCell></TableRow>
                    ) : (
                      projects.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.title}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{p.status}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{p.priority}</Badge></TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {p.owner_id === profile.id ? 'Owner' : 'Participant'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="goals">
            <div className="grid grid-cols-1 gap-4">
              {goals.length === 0 ? (
                <Card className="border-none shadow-sm"><CardContent className="text-center py-8 text-slate-500">No goals found.</CardContent></Card>
              ) : (
                goals.map((g: any) => (
                  <Card key={g.id} className="border-none shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Goal className="h-4 w-4 text-slate-400" />
                          {g.title}
                        </CardTitle>
                        <Badge variant="outline" className="capitalize">{g.status.replace('_', ' ')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Target: {g.target_value} {g.target_metric}</p>
                          <p className="text-sm text-slate-600">Current: {g.current_value} {g.target_metric}</p>
                        </div>
                        {g.deadline && <p className="text-xs text-slate-400">Due: {formatShortDate(g.deadline)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
