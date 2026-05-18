'use client';

import { useEffect, useState } from 'react';
import { reportsApi, ReportSummary } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Users, Download, AlertTriangle, Clock, MapPin, TrendingUp, ShieldCheck } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api/client';

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
      toast.error(getErrorMessage(error));
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
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Team Reports</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Team Reports</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Aggregated performance and activity metrics for your direct reports</p>
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
          <Button variant="outline" className="h-12 rounded-2xl border-[var(--border-default)] font-black text-[10px] uppercase tracking-[0.2em] px-8 bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] transition-all">
            <Download className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
            title="Team Hours"
            value={totalTeamHours.toFixed(1)}
            description="Total tracked hours of all team members"
            icon={Clock}
            variant="indigo"
        />
        <KPICard 
            title="Total Exceptions"
            value={totalExceptions}
            description="Late logins and early logouts"
            icon={AlertTriangle}
            variant={totalExceptions > 5 ? "warning" : "default"}
        />
        <KPICard 
            title="Team Absences"
            value={totalAbsences}
            description="Number of absent days"
            icon={Users}
            variant={totalAbsences > 0 ? "danger" : "default"}
        />
      </div>

      <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                <Users className="h-6 w-6 text-[var(--accent-primary)]" />
                Team Performance
            </CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight mt-1">Performance data for each direct report</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10"><TableSkeleton rows={8} cols={5} /></div>
          ) : reports.length === 0 ? (
            <div className="py-20">
              <EmptyState title="No Team Data Found" message="No reports available for the selected period." icon={Users} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  <TableRow className="h-16 border-b border-[var(--border-subtle)]">
                    <TableHead className="pl-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Team Member</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Hours</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Late</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Early</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">WFH</TableHead>
                    <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Absences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.user_id} className="h-20 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]/30 transition-all text-[var(--text-primary)]">
                      <TableCell className="pl-10">
                        <span className="font-black text-[var(--text-primary)] text-sm tracking-tight">{r.user_name}</span>
                        <div className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-0.5">ID: {r.user_id.substring(0, 8)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                            <span className="font-bold text-[var(--text-secondary)] text-xs">{r.total_hours.toFixed(1)}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                            "rounded-lg text-[8px] font-black uppercase tracking-widest px-2",
                            r.late_logins > 0 ? "bg-amber-50 text-amber-700 border-amber-100 font-bold" : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)] font-bold"
                        )}>
                            {r.late_logins} LATE
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className={cn(
                            "rounded-lg text-[8px] font-black uppercase tracking-widest px-2",
                            r.early_logouts > 0 ? "bg-amber-50 text-amber-700 border-amber-100 font-bold" : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)] font-bold"
                        )}>
                            {r.early_logouts} EARLY
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-[var(--accent-primary)] text-xs">
                            <MapPin className="h-3.5 w-3.5" />
                            {r.wfh_days} <span className="text-[9px] text-[var(--text-muted)] ml-0.5 tracking-widest uppercase">WFH</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <span className={cn(
                            "font-black text-xs",
                            r.absences > 0 ? "text-rose-500" : "text-[var(--text-muted)]"
                        )}>
                            {r.absences} <span className="text-[9px] uppercase tracking-widest ml-0.5">DAYS</span>
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
      
      {!isLoading && totalExceptions > 0 && (
          <Card className="rounded-[2.5rem] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] shadow-xl overflow-hidden text-[var(--text-primary)]">
            <CardContent className="p-10 flex items-start gap-6">
                <div className="h-14 w-14 rounded-2xl bg-[var(--bg-surface)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                    <TrendingUp className="h-8 w-8 text-[var(--accent-primary)]" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-[var(--text-primary)]">Trend Insights</h3>
                    <p className="text-[var(--text-secondary)] font-bold text-sm leading-relaxed max-w-3xl">
                        Your team has accumulated {totalExceptions} attendance exceptions this period. 
                        Targeted 1:1 sessions regarding punctuality could improve organizational alignment by up to 15% in the next cycle.
                    </p>
                </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
