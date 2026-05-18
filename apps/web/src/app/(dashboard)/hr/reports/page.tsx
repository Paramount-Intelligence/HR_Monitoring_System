'use client';

import { useEffect, useState } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Shield, Download, BarChart3, Globe, Zap, FileText, TrendingUp, Users, Clock, Play } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

interface HRReportsPageProps {
  role?: 'hr' | 'admin';
}

export default function HRReportsPage({ role = 'hr' }: HRReportsPageProps) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'this_week' | 'last_week' | 'this_month'>('this_week');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let start: Date, end: Date;
      const now = new Date();
      
      if (period === 'this_week') {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = now;
      } else if (period === 'last_week') {
        const lastWeek = subWeeks(now, 1);
        start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        end = endOfWeek(lastWeek, { weekStartsOn: 1 });
      } else {
        start = startOfMonth(now);
        end = now;
      }

      const fetchFn = role === 'admin' ? reportsApi.getAdminReports : reportsApi.getHRReports;
      const data = await fetchFn(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setReports(data);
    } catch (error) {
      toast.error('Failed to load organizational reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const totalOrgHours = reports.reduce((acc, curr) => acc + curr.total_hours, 0);
  const orgExceptions = reports.reduce((acc, curr) => acc + curr.late_logins + curr.early_logouts, 0);
  const wfhRatio = reports.length > 0 ? (reports.reduce((acc, curr) => acc + curr.wfh_days, 0) / (reports.length * 5) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Analytics</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">HR Reports</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Organizational Performance & Attendance Reports</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-[var(--bg-surface)] border-[var(--border-default)] font-bold text-xs uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
              <SelectItem value="this_week" className="text-xs font-bold">This Week</SelectItem>
              <SelectItem value="last_week" className="text-xs font-bold">Last Week</SelectItem>
              <SelectItem value="this_month" className="text-xs font-bold">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-12 bg-[var(--accent-primary)] hover:opacity-90 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl border-none shadow-xl transition-all">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2rem] overflow-hidden text-[var(--text-primary)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Total Loged Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{totalOrgHours.toFixed(0)}<span className="text-sm ml-1 text-[var(--text-muted)]">H</span></div>
            <p className="text-[9px] text-[var(--text-muted)] font-black mt-1 uppercase tracking-widest">Aggregate logged hours</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2rem] overflow-hidden text-[var(--text-primary)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Total Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-rose-500 tracking-tighter">{orgExceptions}</div>
            <p className="text-[9px] text-[var(--text-muted)] font-black mt-1 uppercase tracking-widest">Attendance exceptions</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2rem] overflow-hidden text-[var(--text-primary)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Remote Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-[var(--accent-primary)] tracking-tighter">{wfhRatio}<span className="text-sm ml-1">%</span></div>
            <p className="text-[9px] text-[var(--text-muted)] font-black mt-1 uppercase tracking-widest">WFH requests</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2rem] overflow-hidden text-[var(--text-primary)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{reports.length}</div>
            <p className="text-[9px] text-[var(--text-muted)] font-black mt-1 uppercase tracking-widest">Tracked employees</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden text-[var(--text-primary)]">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)] flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                        <Globe className="h-6 w-6 text-[var(--accent-primary)]" />
                        Team Overview
                    </CardTitle>
                    <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight mt-1">Daily operational breakdown</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-10"><TableSkeleton rows={8} cols={4} /></div>
              ) : reports.length === 0 ? (
                <div className="py-20"><EmptyState title="No records found" icon={FileText} /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-[var(--bg-subtle)]">
                    <TableRow className="h-16 border-b border-[var(--border-subtle)] hover:bg-transparent">
                      <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Name</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Total Hours</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Exceptions</TableHead>
                      <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">WFH Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.user_id} className="h-20 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]/50 transition-all">
                        <TableCell className="pl-10">
                            <div className="flex flex-col">
                                <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{r.user_name}</span>
                                <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest">ID: {r.user_id.substring(0, 8)}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                <span className="font-bold text-[var(--text-secondary)] text-xs">{r.total_hours.toFixed(1)}h</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn(
                                "rounded-lg text-[8px] font-black uppercase tracking-widest px-2 border-none",
                                r.late_logins + r.early_logouts > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-400"
                            )}>
                                {r.late_logins + r.early_logouts} FLAG
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-10 font-bold text-[var(--text-secondary)] text-xs">{r.wfh_days} <span className="text-[9px] text-[var(--text-muted)] ml-1">DAYS</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden self-start text-[var(--text-primary)]">
          <CardHeader className="px-10 pt-10 pb-6">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-[var(--accent-primary)]" />
                Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-8">
             <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
                    <span>Attendance Health</span>
                    <span className="text-[var(--accent-primary)]">92%</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent-primary)] w-[92%] shadow-sm" />
                </div>
             </div>
             
             <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">
                    <span>Exception Rate</span>
                    <span className="text-rose-500">8%</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-[8%] shadow-sm" />
                </div>
             </div>

             <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 mt-4 space-y-2">
                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    Insight
                </p>
                <p className="text-xs text-indigo-700/80 font-bold leading-relaxed italic">
                    Recent attendance trends indicate stable operational hours. Remote requests peak on Fridays.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
