'use client';

import { useEffect, useState } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, AlertCircle, Download, TrendingUp, Zap } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';

export default function EmployeeReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'this_week' | 'last_week' | 'this_month'>('this_week');

  const fetchReport = async () => {
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

      const data = await reportsApi.getEmployeeReport(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setReport(data);
    } catch (error) {
      toast.error('Failed to load performance report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Personal Analytics</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Employee Reports</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Analyze your attendance and productivity metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
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
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-200 text-slate-400 hover:text-indigo-600 transition-all bg-white shadow-sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <KPICardSkeleton key={i} />)}
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard 
                title="Hours Worked"
                value={report.total_hours.toFixed(1)}
                description="Total session time"
                icon={Clock}
                trend={{ value: 5, isPositive: true }}
            />
            <KPICard 
                title="Late Logins"
                value={report.late_logins}
                description="Policy exceptions"
                icon={AlertCircle}
                variant={report.late_logins > 0 ? "warning" : "default"}
            />
            <KPICard 
                title="WFH Days"
                value={report.wfh_days}
                description="Remote sessions"
                icon={Calendar}
                variant="indigo"
            />
            <KPICard 
                title="Absences"
                value={report.absences}
                description="Unplanned time off"
                icon={AlertCircle}
                variant={report.absences > 0 ? "danger" : "default"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-[2.5rem] shadow-premium border-none bg-white overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Trend Insights</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight">Visual summary of your work habits</CardDescription>
              </CardHeader>
              <CardContent className="p-8 h-[250px] flex items-center justify-center">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trend analysis in progress...</p>
                  <div className="flex gap-2 mt-6 justify-center">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-bold rounded-lg px-3">Early Bird: 80%</Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold rounded-lg px-3">WFH Mix: 20%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] shadow-premium border-none bg-white overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">System Feedback</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-tight">Observations based on recent activity</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {report.late_logins > 0 ? (
                  <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-amber-900 uppercase tracking-tight">Late login detected</p>
                      <p className="text-xs text-amber-700/80 font-bold mt-1">You were late {report.late_logins} time(s). Maintain consistency to avoid policy flags.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Excellent Punctuality</p>
                      <p className="text-xs text-emerald-700/80 font-bold mt-1">No late logins detected. Outstanding organizational alignment.</p>
                    </div>
                  </div>
                )}
                
                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Leave Balance</p>
                  <p className="text-xs text-slate-400 font-bold mt-1">You have 12 days of annual leave remaining. Planning ahead ensures team continuity.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-24 text-slate-400 font-black uppercase tracking-widest border-2 border-dashed rounded-[2.5rem] border-slate-100">
          No data found for the selected period
        </div>
      )}
    </div>
  );
}
