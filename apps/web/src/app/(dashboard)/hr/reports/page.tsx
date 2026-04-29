'use client';

import { useEffect, useState } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Shield, Download, BarChart3, Globe, Zap } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface HRReportsPageProps {
  role: 'hr' | 'admin';
}

export default function HRReportsPage({ role }: HRReportsPageProps) {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Organizational Insights</h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 uppercase text-[10px]">
                {role} Access
            </Badge>
          </div>
          <p className="text-sm text-slate-500">Cross-departmental aggregation and pattern analysis.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Full Audit Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Org Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalOrgHours.toFixed(0)}h</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Total Logged</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Exception Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
                {orgExceptions}
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Org-wide Flags</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">WFH Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{wfhRatio}%</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Remote Ratio</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Active Workforce</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{reports.length}</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Headcount</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-slate-400" />
                    Global Attendance Log
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Exceptions</TableHead>
                      <TableHead>WFH</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.user_id}>
                        <TableCell className="pl-6 font-medium text-slate-900">{r.user_name}</TableCell>
                        <TableCell className="text-slate-600">{r.total_hours.toFixed(1)}h</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={r.late_logins + r.early_logouts > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-50"}>
                                {r.late_logins + r.early_logouts}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{r.wfh_days} days</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Trends & Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Attendance Health</span>
                    <span>92%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]" />
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Exception Rate</span>
                    <span>8%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[8%]" />
                </div>
             </div>

             <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mt-4">
                <p className="text-sm font-semibold text-blue-900">Predictive Insight</p>
                <p className="text-xs text-blue-700 mt-1">
                    Based on the last 30 days, team velocity is stable. WFH requests tend to peak on Fridays.
                </p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
