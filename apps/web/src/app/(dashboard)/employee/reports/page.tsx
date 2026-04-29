'use client';

import { useEffect, useState } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, subMonths, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock, AlertCircle, Download, TrendingUp } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Performance Report</h1>
          <p className="text-sm text-slate-500">Analyze your attendance and productivity metrics.</p>
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
          <Button variant="outline" size="icon" className="text-slate-500">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{report.total_hours.toFixed(1)}</div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                  <TrendingUp className="h-3 w-3" />
                  STABLE
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Late Logins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={report.late_logins > 1 ? "text-3xl font-bold text-red-600" : "text-3xl font-bold text-slate-900"}>
                  {report.late_logins}
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Exceptions</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">WFH Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{report.wfh_days} Days</div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Remote Work</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Absences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{report.absences}</div>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Unplanned</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Attendance Patterns</CardTitle>
                <CardDescription>Visual summary of your work habits.</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center border-t border-slate-50">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-sm text-slate-500">Pattern analysis is being computed...</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Early Bird: 80%</Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">WFH Mix: 20%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Action Items</CardTitle>
                <CardDescription>Notifications based on your recent activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.late_logins > 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Late login detected</p>
                      <p className="text-xs text-amber-700">You were late {report.late_logins} time(s). Maintain consistency to avoid alerts.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Excellent Punctuality</p>
                      <p className="text-xs text-emerald-700">You have no late logins for this period. Great job!</p>
                    </div>
                  </div>
                )}
                
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <p className="text-sm font-semibold text-slate-900">Leave Balance</p>
                  <p className="text-xs text-slate-600 mt-1">You have 12 days of annual leave remaining. Planning ahead helps the team!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-24 text-slate-500">
          No data found for the selected period.
        </div>
      )}
    </div>
  );
}
