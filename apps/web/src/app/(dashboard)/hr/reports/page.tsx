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
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Analytics</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">HR Reports</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Organizational Performance & Attendance Audits</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-white border-slate-200 font-bold text-xs uppercase tracking-widest shadow-sm">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-premium-lg">
              <SelectItem value="this_week" className="text-xs font-bold">This Week</SelectItem>
              <SelectItem value="last_week" className="text-xs font-bold">Last Week</SelectItem>
              <SelectItem value="this_month" className="text-xs font-bold">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl transition-all">
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Workforce Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{totalOrgHours.toFixed(0)}<span className="text-sm ml-1 text-slate-400">H</span></div>
            <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">Aggregate log</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-rose-500 tracking-tighter">{orgExceptions}</div>
            <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">Policy deviations</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Remote Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-indigo-600 tracking-tighter">{wfhRatio}<span className="text-sm ml-1">%</span></div>
            <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">WFH Penetration</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{reports.length}</div>
            <p className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">Tracked reports</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Globe className="h-6 w-6 text-indigo-600" />
                        Workforce Overview
                    </CardTitle>
                    <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight mt-1">Daily operational breakdown</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-10"><TableSkeleton rows={8} cols={4} /></div>
              ) : reports.length === 0 ? (
                <div className="py-20"><EmptyState title="No records found" icon={FileText} /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="h-16 border-b border-slate-100">
                      <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-slate-400">Employee Name</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Total Hours</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Exceptions</TableHead>
                      <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-slate-400">WFH Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.user_id} className="h-20 border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-all">
                        <TableCell className="pl-10">
                            <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-sm tracking-tight">{r.user_name}</span>
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">ID: {r.user_id.substring(0, 8)}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                                <span className="font-bold text-slate-600 text-xs">{r.total_hours.toFixed(1)}h</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn(
                                "rounded-lg text-[8px] font-black uppercase tracking-widest px-2",
                                r.late_logins + r.early_logouts > 0 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"
                            )}>
                                {r.late_logins + r.early_logouts} FLAG
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-10 font-bold text-slate-600 text-xs">{r.wfh_days} <span className="text-[9px] text-slate-400 ml-1">DAYS</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden self-start">
          <CardHeader className="px-10 pt-10 pb-6">
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
                Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-8">
             <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span>Attendance Health</span>
                    <span className="text-indigo-600">92%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[92%] shadow-sm" />
                </div>
             </div>
             
             <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span>Exception Rate</span>
                    <span className="text-rose-500">8%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-[8%] shadow-sm" />
                </div>
             </div>

             <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 mt-4 space-y-2">
                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5" />
                    Predictive Insight
                </p>
                <p className="text-xs text-indigo-700/80 font-bold leading-relaxed italic">
                    Based on recent cycles, team velocity is stable. Peak WFH demand occurs on Fridays.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
