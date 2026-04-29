'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ClipboardCheck, AlertCircle, BarChart3, Loader2, ShieldCheck, Clock, Activity, CheckSquare } from 'lucide-react';
import { buttonVariants, Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ManagerDashboard() {
  const [data, setData] = useState<any>(null);
  const [eods, setEods] = useState<EODReport[]>([]);
  const [myEod, setMyEod] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, teamEods, myEodData] = await Promise.all([
          dashboardApi.getManagerSummary(),
          eodApi.getTeamEODs(),
          eodApi.getMyEOD()
        ]);
        setData(summary);
        setEods(teamEods);
        setMyEod(myEodData);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  // Provide safe defaults
  const summary = data || {
    team_members_active: 0,
    pending_approvals: 0,
    overdue_tasks: 0,
    blocked_tasks: 0,
  };

  const pendingEods = eods.filter(e => e.status === 'Pending Approval');
  const myEodStatus = myEod ? myEod.status : 'Not Started';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your team's activity, EOD approvals, and your personal work.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Team</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.team_members_active}</div>
            <p className="text-xs text-muted-foreground mt-1">Clocked in today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.pending_approvals}</div>
            <p className="text-xs text-amber-600/80 mt-1">Requires your attention</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-100 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending EOD Reviews</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{pendingEods.length}</div>
            <p className="text-xs text-blue-600/80 mt-1">Team EODs to review</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{summary.blocked_tasks}</div>
            <p className="text-xs text-rose-600/80 mt-1">Waiting on unblock</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My EOD Status</CardTitle>
            <Activity className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-700 truncate">{myEodStatus}</div>
            <Link href="/manager/my-eod" className="text-xs text-emerald-600/80 mt-1 hover:underline">
              Manage my EOD &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Manager Personal Work Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>My Personal Work</CardTitle>
            <CardDescription>Your daily tracking and duties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <Clock className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Checked In (Office)</p>
                  <p className="text-xs text-slate-500">Since 09:15 AM • 6h 30m logged</p>
                </div>
              </div>
              <Link href="/manager/my-attendance" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Check Out
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/manager/my-tasks"
                className={cn(buttonVariants({ variant: "outline" }), "h-16 flex flex-col items-center justify-center gap-1 hover:bg-blue-50 hover:text-blue-600")}
              >
                <CheckSquare className="h-5 w-5 text-slate-500" />
                <span>My Tasks (3 active)</span>
              </Link>
              <Link 
                href="/manager/my-eod"
                className={cn(buttonVariants({ variant: "outline" }), "h-16 flex flex-col items-center justify-center gap-1 hover:bg-blue-50 hover:text-blue-600")}
              >
                <ShieldCheck className="h-5 w-5 text-slate-500" />
                <span>Submit My EOD</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* EOD Review Queue Section */}
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>EOD Review Queue</CardTitle>
              <CardDescription>Employee end-of-day reports pending approval</CardDescription>
            </div>
            {pendingEods.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                {pendingEods.length} Pending
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingEods.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center border rounded-lg border-dashed">
                  No EOD reports pending review.
                </div>
              ) : (
                pendingEods.map((eod) => (
                  <div key={eod.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{eod.user_name}</p>
                        <p className="text-xs text-slate-500">{eod.date} • {eod.total_hours}h total • {eod.work_mode.toUpperCase()}</p>
                      </div>
                      {eod.blocked_tasks > 0 && (
                        <Badge variant="destructive" className="text-[10px]">Blocked Work</Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-600 flex gap-4 bg-slate-50 p-2 rounded">
                      <div><span className="font-medium">{eod.completed_tasks}</span> completed</div>
                      <div><span className="font-medium">{eod.duties_performed}</span> duties</div>
                      <div><span className="font-medium text-blue-600">{eod.productivity_score}%</span> prod. score</div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Link 
                        href={`/manager/eod-reviews?id=${eod.id}`} 
                        className={cn(buttonVariants({ variant: "default", size: "sm" }), "bg-blue-600 hover:bg-blue-700")}
                      >
                        Review EOD
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
            {eods.length > pendingEods.length && (
              <div className="mt-4 pt-4 border-t text-center">
                <Link href="/manager/eod-reviews" className="text-sm text-blue-600 hover:underline">
                  View all EOD reports &rarr;
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
