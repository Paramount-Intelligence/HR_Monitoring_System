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
  FileText, ListTodo, Goal, History, User2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

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
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  } catch (e) {
    return dateString;
  }
};

const formatShortDate = (dateString?: string) => {
  if (!dateString) return '—';
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

  useEffect(() => {
    if (data?.profile?.full_name) {
      (window as any).__BREADCRUMB_LABEL__ = data.profile.full_name;
      window.dispatchEvent(new Event('breadcrumb-update'));
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__BREADCRUMB_LABEL__;
        window.dispatchEvent(new Event('breadcrumb-update'));
      }
    };
  }, [data]);

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
        <div className="flex flex-col items-center text-[var(--text-muted)]">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="font-medium text-sm">Loading Employee Profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertOctagon className="h-16 w-16 text-[var(--status-danger-text)]" />
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Profile Not Found</h2>
        <p className="text-[var(--text-secondary)] text-sm">The requested user profile does not exist or you lack permission to view it.</p>
        <Button onClick={() => router.push('/admin/users')} className="btn-primary">Back to Users</Button>
      </div>
    );
  }

  const { 
    profile, 
    attendance_summary, 
    attendance_sessions, 
    leave_requests, 
    eod_submissions, 
    tasks, 
    time_logs, 
    projects, 
    goals, 
    notes, 
    activity_timeline 
  } = data;

  // Overview calculated statistics
  const completedTasksCount = tasks ? tasks.filter((t: any) => t.status === 'completed' || t.status === 'done').length : 0;
  const totalTasksCount = tasks ? tasks.length : 0;
  const productivityScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const activityCount = activity_timeline ? activity_timeline.length : 0;
  const activityLevel = activityCount > 8 ? 'High' : activityCount > 3 ? 'Medium' : 'Low';
  const taskCompletionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;

  // SVG circular visuals
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (productivityScore / 100) * circumference;

  return (
    <div className="app-page space-y-6 pb-12">
      {/* Breadcrumb Section - Standardized without UUID */}
      <div className="flex items-center space-x-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
        <span>Admin</span>
        <span className="text-[var(--text-muted)]">/</span>
        <span>Human Resources</span>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-primary)]">Employee Profile</span>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div className="flex items-center gap-3.5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/admin/users')} 
            className="btn-ghost h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
                {profile.full_name || 'Employee Profile'}
              </h1>
              <Badge variant="outline" className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] uppercase text-[9px] font-bold tracking-wider py-0.5 px-2">
                {profile.status || 'Active'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[var(--text-secondary)] text-xs font-semibold">
              <span>{ROLE_LABELS[profile.role] || profile.role}</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span>{profile.department_name || profile.department || 'No Department'}</span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="text-[var(--text-muted)] font-normal">{profile.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Timeframe</span>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px] h-9 bg-[var(--bg-elevated)] border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] rounded-xl">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] rounded-xl">
              <SelectItem value="7days" className="text-xs font-medium">Last 7 Days</SelectItem>
              <SelectItem value="30days" className="text-xs font-medium">Last 30 Days</SelectItem>
              <SelectItem value="month" className="text-xs font-medium">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Row (Exactly 4 Cards, Desktop: 4 Col, Tablet: 2 Col, Mobile: 1 Col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="app-surface border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-[var(--status-info-bg)] flex items-center justify-center text-[var(--status-info-text)]">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Check-ins</p>
              <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{attendance_summary.total_check_ins}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-surface border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-[var(--status-success-bg)] flex items-center justify-center text-[var(--status-success-text)]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Hours Logged</p>
              <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{attendance_summary.total_worked_hours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-surface border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-[var(--status-warning-bg)] flex items-center justify-center text-[var(--status-warning-text)]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Leaves Requested</p>
              <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{leave_requests ? leave_requests.length : 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="app-surface border border-[var(--border-default)] shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-[var(--status-info-bg)] flex items-center justify-center text-[var(--status-info-text)]">
              <ListTodo className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Assigned Tasks</p>
              <p className="text-xl font-black text-[var(--text-primary)] mt-0.5">{tasks ? tasks.length : 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Panel (Full Width, Card Container) */}
      <div className="app-surface col-span-full w-full border border-[var(--border-default)] shadow-sm rounded-2xl overflow-hidden">
        <Tabs defaultValue="overview" className="w-full space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
            {/* Left side: vertical tab menu */}
            <aside className="border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] p-3 bg-[var(--bg-subtle)]/30 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 select-none shrink-0 scrollbar-none w-full lg:w-[260px]">
              <TabsList className="bg-transparent p-0 flex flex-row lg:flex-col justify-start items-stretch gap-1 w-full border-none h-auto overflow-x-auto lg:overflow-x-visible">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  Attendance & Breaks
                </TabsTrigger>
                <TabsTrigger 
                  value="leaves" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  Leaves & WFH
                </TabsTrigger>
                <TabsTrigger 
                  value="eod" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  EOD Submissions
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  Tasks & Logs
                </TabsTrigger>
                <TabsTrigger 
                  value="projects" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  Projects
                </TabsTrigger>
                <TabsTrigger 
                  value="goals" 
                  className="rounded-xl py-2.5 px-4 text-xs font-bold text-left justify-start text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 data-[state=active]:border-l-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-[var(--accent-primary)] data-[state=active]:shadow-sm transition-all duration-150 w-full shrink-0"
                >
                  Goals & Notes
                </TabsTrigger>
              </TabsList>
            </aside>

            {/* Right side: selected tab content */}
            <section className="w-full min-w-0 p-6">
              <div className="w-full min-w-0">
              {/* Overview Tab (Productivity & Status) */}
              <TabsContent value="overview" className="w-full outline-none mt-0">
                <div className="space-y-4 w-full">
                  <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider">Productivity & Status</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {/* Productivity Score */}
                    <Card className="app-surface-elevated border border-[var(--border-subtle)] shadow-sm rounded-xl w-full h-full">
                      <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Productivity Score</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center p-6 pt-2 relative">
                        <div className="relative flex items-center justify-center h-20 w-20">
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="stroke-[var(--border-default)]"
                              strokeWidth="5"
                              fill="transparent"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r={radius}
                              className="stroke-[var(--accent-primary)] transition-all duration-500 ease-out"
                              strokeWidth="5"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-[var(--text-primary)]">
                            {productivityScore}%
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-3 uppercase tracking-wider">Overall Performance</p>
                      </CardContent>
                    </Card>

                    {/* Activity Level */}
                    <Card className="app-surface-elevated border border-[var(--border-subtle)] shadow-sm rounded-xl w-full h-full">
                      <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Activity Level</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center p-6 pt-2 h-[120px]">
                        <span className={cn(
                          "text-lg font-black capitalize tracking-widest px-5 py-1.5 rounded-full border shadow-sm",
                          activityLevel === 'High' 
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]' 
                            : activityLevel === 'Medium' 
                              ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]' 
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'
                        )}>
                          {activityLevel}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold mt-3 uppercase tracking-wider">
                          Based on {activityCount} events
                        </span>
                      </CardContent>
                    </Card>

                    {/* Task Completion */}
                    <Card className="app-surface-elevated border border-[var(--border-subtle)] shadow-sm rounded-xl w-full h-full">
                      <CardHeader className="pb-1.5 p-4">
                        <CardTitle className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Task Completion</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col justify-center p-6 pt-2 h-[120px] w-full">
                        <div className="space-y-2.5 w-full">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-[var(--text-secondary)] uppercase tracking-wider">Ratio</span>
                            <span className="text-[var(--text-primary)]">{completedTasksCount} / {totalTasksCount}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] overflow-hidden">
                            <div 
                              className="h-full bg-[var(--status-info-text)] rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${Math.min(100, Math.max(0, taskCompletionRate))}%` }}
                            />
                          </div>
                          <div className="text-right text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                            {Math.round(taskCompletionRate)}% Completed
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Attendance & Breaks */}
              <TabsContent value="attendance" className="w-full outline-none mt-0">
                <div className="app-table-shell w-full overflow-x-auto border border-[var(--border-default)] rounded-xl">
                  <Table className="w-full min-w-full">
                    <TableHeader>
                      <TableRow className="app-table-head bg-[var(--bg-subtle)] border-[var(--border-default)]">
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Check In</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Check Out</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Duration</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Mode</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Flags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!attendance_sessions || attendance_sessions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            No records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendance_sessions.map((s: any) => (
                          <TableRow key={s.id} className="app-table-row border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/30">
                            <TableCell className="font-bold text-xs text-[var(--text-primary)]">{formatShortDate(s.check_in_at)}</TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs">{formatDate(s.check_in_at)}</TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs">{formatDate(s.check_out_at)}</TableCell>
                            <TableCell className="text-[var(--text-primary)] font-bold text-xs">{s.duration_minutes ? `${(s.duration_minutes / 60).toFixed(1)}h` : '—'}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-[10px] font-bold py-0.5 px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">{s.work_mode}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {s.is_late_login && <Badge variant="destructive" className="bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-none font-bold text-[9px] tracking-wider py-0.5 px-1.5">Late In</Badge>}
                                {s.is_early_logout && <Badge variant="destructive" className="bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-none font-bold text-[9px] tracking-wider py-0.5 px-1.5" title={s.early_checkout_reason}>Early Out</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Leaves & WFH */}
              <TabsContent value="leaves" className="w-full outline-none mt-0">
                <div className="app-table-shell w-full overflow-x-auto border border-[var(--border-default)] rounded-xl">
                  <Table className="w-full min-w-full">
                    <TableHeader>
                      <TableRow className="app-table-head bg-[var(--bg-subtle)] border-[var(--border-default)]">
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Duration</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Reason</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Requested On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!leave_requests || leave_requests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            No records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        leave_requests.map((l: any) => (
                          <TableRow key={l.id} className="app-table-row border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/30">
                            <TableCell>
                              <span className="font-bold text-xs text-[var(--text-primary)]">{l.leave_type}</span>
                              {l.is_half_day && <span className="ml-2 text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-2 py-0.5 rounded">Half Day ({l.half_day_period})</span>}
                            </TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs font-medium">
                              {formatShortDate(l.start_date)} - {formatShortDate(l.end_date)}
                            </TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs max-w-xs truncate font-medium" title={l.reason}>{l.reason}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-[10px] font-bold py-0.5 px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">{l.status}</Badge></TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs font-medium">{formatShortDate(l.created_at)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* EOD Submissions */}
              <TabsContent value="eod" className="w-full outline-none mt-0">
                <div className="grid grid-cols-1 gap-4 w-full">
                  {!eod_submissions || eod_submissions.length === 0 ? (
                    <div className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)] border-dashed">
                      No records found.
                    </div>
                  ) : (
                    eod_submissions.map((eod: any) => (
                      <Card key={eod.id} className="app-surface border border-[var(--border-default)] shadow-sm rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2.5">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                            EOD for {formatShortDate(eod.report_date)}
                          </h4>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-bold uppercase py-0.5 px-2.5 rounded-full border",
                            eod.manager_reviewed 
                              ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]' 
                              : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]'
                          )}>
                            {eod.manager_reviewed ? 'Reviewed' : 'Pending Review'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Today's Summary</h4>
                            <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)] p-3 rounded-lg whitespace-pre-wrap leading-relaxed font-medium">{eod.summary}</p>
                          </div>
                          <div className="space-y-3.5">
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Blockers</h4>
                              <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)]/50 p-2.5 rounded-lg font-medium">{eod.blockers || 'None'}</p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Tomorrow's Plan</h4>
                              <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-subtle)]/50 p-2.5 rounded-lg font-medium">{eod.next_day_plan || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Tasks & Logs */}
              <TabsContent value="tasks" className="w-full outline-none mt-0">
                <div className="space-y-6 w-full">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Assigned Tasks</h3>
                    <div className="app-table-shell w-full overflow-x-auto border border-[var(--border-default)] rounded-xl">
                      <Table className="w-full min-w-full">
                        <TableHeader>
                          <TableRow className="app-table-head bg-[var(--bg-subtle)] border-[var(--border-default)]">
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Title</TableHead>
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Priority</TableHead>
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Due Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!tasks || tasks.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                No records found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            tasks.map((t: any) => (
                              <TableRow key={t.id} className="app-table-row border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/30">
                                <TableCell className="font-bold text-xs text-[var(--text-primary)]">{t.title}</TableCell>
                                <TableCell><Badge variant="outline" className="capitalize text-[10px] font-bold py-0.5 px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">{t.status.replace('_', ' ')}</Badge></TableCell>
                                <TableCell><Badge variant="outline" className="capitalize text-[10px] font-bold py-0.5 px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">{t.priority}</Badge></TableCell>
                                <TableCell className="text-[var(--text-secondary)] text-xs font-medium">{formatShortDate(t.due_date)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Time Logs</h3>
                    <div className="app-table-shell w-full overflow-x-auto border border-[var(--border-default)] rounded-xl">
                      <Table className="w-full min-w-full">
                        <TableHeader>
                          <TableRow className="app-table-head bg-[var(--bg-subtle)] border-[var(--border-default)]">
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Started At</TableHead>
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Ended At</TableHead>
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Duration</TableHead>
                            <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!time_logs || time_logs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                No records found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            time_logs.map((tl: any) => (
                              <TableRow key={tl.id} className="app-table-row border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/30">
                                <TableCell className="text-[var(--text-secondary)] text-xs font-medium">{formatDate(tl.started_at)}</TableCell>
                                <TableCell className="text-[var(--text-secondary)] text-xs font-medium">{formatDate(tl.ended_at)}</TableCell>
                                <TableCell className="font-bold text-xs text-[var(--text-primary)]">{tl.duration_minutes}m</TableCell>
                                <TableCell><Badge variant="secondary" className="capitalize text-[9px] font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">{tl.source}</Badge></TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Projects */}
              <TabsContent value="projects" className="w-full outline-none mt-0">
                <div className="app-table-shell w-full overflow-x-auto border border-[var(--border-default)] rounded-xl">
                  <Table className="w-full min-w-full">
                    <TableHeader>
                      <TableRow className="app-table-head bg-[var(--bg-subtle)] border-[var(--border-default)]">
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Project Title</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Priority</TableHead>
                        <TableHead className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-wider">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!projects || projects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                            No records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        projects.map((p: any) => (
                          <TableRow key={p.id} className="app-table-row border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/30">
                            <TableCell className="font-bold text-xs text-[var(--text-primary)]">{p.title}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-[10px] font-bold py-0.5 px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">{p.status}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-[10px] font-bold py-0.5 px-2 bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]">{p.priority}</Badge></TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs font-medium">
                              {p.owner_id === profile.id ? 'Owner' : 'Participant'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Goals & Notes */}
              <TabsContent value="goals" className="w-full outline-none mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <Goal className="h-4 w-4 text-[var(--text-muted)]" />
                      Goals
                    </h3>
                    <div className="space-y-4">
                      {!goals || goals.length === 0 ? (
                        <div className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)] border-dashed uppercase tracking-wider">
                          No records found.
                        </div>
                      ) : (
                        goals.map((g: any) => (
                          <div key={g.id} className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2.5 shadow-sm">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-xs text-[var(--text-primary)]">{g.title}</h4>
                              <Badge variant="outline" className="capitalize text-[9px] font-bold bg-[var(--bg-surface)] py-0.5 px-1.5">{g.status.replace('_', ' ')}</Badge>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-semibold">
                              <span>Target: {g.target_value} {g.target_metric} (Current: {g.current_value})</span>
                              {g.deadline && <span>Due: {formatShortDate(g.deadline)}</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                      Personal & Admin Notes
                    </h3>
                    <div className="space-y-4">
                      {!notes || notes.length === 0 ? (
                        <div className="text-center py-12 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)] border-dashed uppercase tracking-wider">
                          No records found.
                        </div>
                      ) : (
                        notes.map((n: any) => (
                          <div key={n.id} className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2.5 shadow-sm">
                            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-medium">{n.content}</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold text-right uppercase tracking-wider">{formatShortDate(n.note_date)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              </div>
            </section>
          </div>
        </Tabs>
      </div>

      {/* Account Info and Recent Activity Side-by-Side (Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="app-surface border border-[var(--border-default)] shadow-sm rounded-2xl p-6">
          <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider mb-5 pb-2 border-b border-[var(--border-subtle)]">
            Account Information
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Joined On</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{formatShortDate(profile.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Designation</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{profile.designation || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Reporting Manager</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{profile.manager_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Work Shift</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">
                {profile.shift_name ? `${profile.shift_name} (${profile.shift_timing})` : 'Default'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Department</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">
                {profile.department_name || profile.department || 'No Department'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Role</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5 capitalize">
                {ROLE_LABELS[profile.role] || profile.role}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</p>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5 capitalize">
                {profile.status || 'Active'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="app-surface border border-[var(--border-default)] shadow-sm rounded-2xl p-6">
          <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-wider mb-5 pb-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-[var(--text-muted)]" />
            Recent Activity
          </h3>
          <div className="divide-y divide-[var(--border-subtle)]">
            {!activity_timeline || activity_timeline.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-6 font-semibold uppercase tracking-wider">
                No recent activity found.
              </p>
            ) : (
              activity_timeline.slice(0, 6).map((event: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0 gap-4">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">{event.title}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0 font-semibold">{formatShortDate(event.date)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
