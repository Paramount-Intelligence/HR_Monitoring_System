'use client';

import { useEffect, useState } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Users, Download, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ManagerReportsPage() {
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

      const data = await reportsApi.getManagerReports(
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd')
      );
      setReports(data);
    } catch (error) {
      toast.error('Failed to load team reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const totalTeamHours = reports.reduce((acc, curr) => acc + curr.total_hours, 0);
  const totalExceptions = reports.reduce((acc, curr) => acc + curr.late_logins + curr.early_logouts, 0);
  const totalAbsences = reports.reduce((acc, curr) => acc + curr.absences, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team Insights</h1>
          <p className="text-sm text-slate-500">Aggregated performance data for your direct reports.</p>
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
          <Button variant="outline" className="text-slate-600">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white border-none shadow-lg shadow-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase">Team Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTeamHours.toFixed(1)}</div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Productivity Volume</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Total Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={totalExceptions > 5 ? "text-3xl font-bold text-red-600" : "text-3xl font-bold text-slate-900"}>
                {totalExceptions}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Late/Early Logouts</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Team Absences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalAbsences}</div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Capacity Impact</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-400" />
                Team Performance Table
            </CardTitle>
            <CardDescription>Detailed breakdown per team member.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No team data found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="pl-6">Team Member</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Early</TableHead>
                    <TableHead>WFH</TableHead>
                    <TableHead>Absences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.user_id} className="hover:bg-slate-50/30 transition-colors">
                      <TableCell className="pl-6 font-medium text-slate-900">{r.user_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {r.total_hours.toFixed(1)}h
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={r.late_logins > 0 ? "text-amber-600 font-bold" : "text-slate-500"}>
                            {r.late_logins}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={r.early_logouts > 0 ? "text-amber-600 font-bold" : "text-slate-500"}>
                            {r.early_logouts}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-blue-400" />
                            {r.wfh_days}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={r.absences > 0 ? "text-red-500 font-bold" : "text-slate-500"}>
                            {r.absences}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {totalExceptions > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Attendance Concern</p>
              <p className="text-xs text-amber-700 mt-0.5">
                  Your team has accumulated {totalExceptions} attendance exceptions this period. Consider reviewing shift assignments or discussing punctuality during your next 1:1 sessions.
              </p>
            </div>
          </div>
      )}
    </div>
  );
}
