'use client';

import { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi, User } from '@/lib/api/users';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  Users, Activity, ClipboardCheck, ShieldCheck, AlertCircle, 
  Megaphone, Clock, CheckSquare, TrendingUp, Zap
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnnouncementList } from '@/components/dashboard/announcement-list';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { StatusBadge } from '@/components/ui/status-badge';

export default function ManagerDashboard() {
  const [data, setData] = useState<any>(null);
  const [eods, setEods] = useState<EODReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, teamEods, projectsData, userData] = await Promise.all([
          dashboardApi.getManagerSummary(),
          eodApi.getTeamEODs(),
          projectsApi.getProjects(),
          usersApi.getMe()
        ]);
        setData(summary);
        setEods(teamEods);
        setProjects(projectsData);
        setCurrentUser(userData);
      } catch (e) {
        console.error('Failed to load dashboard', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const summary = data || {
    team_members_active: 0,
    pending_approvals: 0,
    overdue_tasks: 0,
    blocked_tasks: 0,
  };

  const pendingEods = eods.filter(e => e.status === 'Pending Approval');
  const pendingProjects = projects.filter(p => 
    (p.approval_status === 'pending' || p.approval_status === 'pending_approval') && 
    p.manager_id === currentUser?.id
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Overview</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Manager Dashboard</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Team Operational Status & Execution Metrics</p>
        </div>
        <div className="flex items-center gap-3">
             <Link href="/manager/team" className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-[0.2em] px-6 bg-white shadow-sm hover:bg-slate-50 transition-all")}>
                <Users className="mr-2 h-4 w-4 text-indigo-600" />
                Team Members
            </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KPICard 
                title="Active Team Members"
                value={summary.team_members_active}
                description="Currently clocked in"
                icon={Activity}
                trend={{ value: 12, isPositive: true }}
            />
            <KPICard 
                title="Pending Approvals"
                value={summary.pending_approvals}
                description="Actions requiring review"
                icon={ClipboardCheck}
                variant={summary.pending_approvals > 0 ? "warning" : "default"}
            />
            <KPICard 
                title="Daily Reports"
                value={pendingEods.length}
                description="Unprocessed EOD logs"
                icon={ShieldCheck}
                variant={pendingEods.length > 0 ? "indigo" : "default"}
            />
            <KPICard 
                title="Task Bottlenecks"
                value={summary.blocked_tasks}
                description="Highlighting blocked or delayed tasks"
                icon={AlertCircle}
                variant={summary.blocked_tasks > 0 ? "danger" : "default"}
            />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Action Queues */}
            <Card className="rounded-[2.5rem] shadow-premium border-none bg-white overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Reports</CardTitle>
                </div>
                {pendingEods.length > 0 && (
                  <Badge className="bg-indigo-600 text-white font-black text-[8px] rounded-lg px-2 h-5">
                    {pendingEods.length} PENDING
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <div className="space-y-3">
                  {pendingEods.length === 0 ? (
                    <div className="text-[10px] font-bold text-slate-400 py-8 text-center border-2 border-dashed rounded-2xl border-slate-100 uppercase tracking-widest">
                      Queue fully processed
                    </div>
                  ) : (
                    pendingEods.slice(0, 3).map((eod) => (
                      <div key={eod.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-indigo-200 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                                {eod.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900 leading-none mb-1">{eod.user_name}</p>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{eod.work_mode}</div>
                            </div>
                        </div>
                        <Link 
                            href={`/manager/eod-reviews?id=${eod.id}`} 
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider text-indigo-600 border-indigo-100 hover:bg-indigo-50")}
                        >
                            REVIEW
                        </Link>
                      </div>
                    ))
                  )}
                </div>
                {pendingEods.length > 3 && (
                  <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                    <Link href="/manager/eod-reviews" className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">
                      Process all {pendingEods.length} reports &rarr;
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] shadow-premium border-none bg-white overflow-hidden">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project Approvals</CardTitle>
                </div>
                {pendingProjects.length > 0 && (
                  <Badge className="bg-amber-500 text-white font-black text-[8px] rounded-lg px-2 h-5">
                    {pendingProjects.length} NEW
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <div className="space-y-3">
                  {pendingProjects.length === 0 ? (
                    <div className="text-[10px] font-bold text-slate-400 py-8 text-center border-2 border-dashed rounded-2xl border-slate-100 uppercase tracking-widest">
                      No proposals found
                    </div>
                  ) : (
                    pendingProjects.slice(0, 3).map((project) => (
                      <div key={project.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-amber-200 transition-all flex items-center justify-between group">
                        <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm font-bold text-slate-900 leading-none mb-1 truncate">{project.title}</p>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={project.priority} />
                            </div>
                        </div>
                        <Link 
                            href={`/manager/projects/${project.id}`} 
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider text-amber-600 border-amber-100 hover:bg-amber-50")}
                        >
                            REVIEW
                        </Link>
                      </div>
                    ))
                  )}
                </div>
                {pendingProjects.length > 3 && (
                  <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                    <Link href="/manager/projects" className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">
                      View all {pendingProjects.length} requests &rarr;
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Personal Work Hub */}
          <Card className="rounded-[2.5rem] shadow-premium border-none bg-white overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
              <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">My Workspace</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-8">
              <div className="grid gap-6 md:grid-cols-3">
                  <Link 
                    href="/manager/my-attendance"
                    className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-premium transition-all flex flex-col items-center text-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Clock className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Attendance</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Personal Records</div>
                    </div>
                  </Link>

                  <Link 
                    href="/manager/my-tasks"
                    className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-premium transition-all flex flex-col items-center text-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckSquare className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-slate-900 uppercase tracking-tight">My Tasks</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Execution Queue</div>
                    </div>
                  </Link>

                  <Link 
                    href="/manager/my-eod"
                    className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-premium transition-all flex flex-col items-center text-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShieldCheck className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-slate-900 uppercase tracking-tight">End of Day</div>
                        <div className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Daily Reporting</div>
                    </div>
                  </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] shadow-premium border-none bg-white overflow-hidden sticky top-6">
            <CardHeader className="bg-indigo-600 text-white flex flex-row items-center justify-between p-8 py-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Announcements</CardTitle>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-200" />
                    <span className="text-[10px] uppercase tracking-widest">Trend Insights</span>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <AnnouncementList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
