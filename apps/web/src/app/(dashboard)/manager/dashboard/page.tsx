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
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Management Dashboard</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Manager Dashboard</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Team performance, task statuses, and approvals overview</p>
        </div>
        <div className="flex items-center gap-3">
             <Link href="/manager/team" className={cn(buttonVariants({ variant: "outline" }), "h-12 rounded-2xl border-[var(--border-default)] font-black text-[10px] uppercase tracking-[0.2em] px-6 bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] transition-all")}>
                <Users className="mr-2 h-4 w-4 text-[var(--accent-primary)]" />
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
                title="EOD Reports"
                value={pendingEods.length}
                description="Pending End of Day reports"
                icon={ShieldCheck}
                variant={pendingEods.length > 0 ? "indigo" : "default"}
            />
            <KPICard 
                title="Blocked Tasks"
                value={summary.blocked_tasks}
                description="Tasks with active blockers"
                icon={AlertCircle}
                variant={summary.blocked_tasks > 0 ? "danger" : "default"}
            />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Action Queues */}
            <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">EOD Reports</CardTitle>
                </div>
                {pendingEods.length > 0 && (
                  <Badge className="bg-[var(--accent-primary)] text-white font-black text-[8px] rounded-lg px-2 h-5 border-none">
                    {pendingEods.length} PENDING
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <div className="space-y-3">
                  {pendingEods.length === 0 ? (
                    <div className="text-[10px] font-bold text-[var(--text-muted)] py-8 text-center border-2 border-dashed rounded-2xl border-[var(--border-subtle)] uppercase tracking-widest bg-[var(--bg-subtle)]/30">
                      Queue fully processed
                    </div>
                  ) : (
                    pendingEods.slice(0, 3).map((eod) => (
                      <div key={eod.id} className="p-4 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]/50 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center font-bold text-[var(--text-secondary)] uppercase">
                                {eod.user_name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-[var(--text-primary)] leading-none mb-1">{eod.user_name}</p>
                                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{eod.work_mode}</div>
                            </div>
                        </div>
                        <Link 
                            href={`/manager/eod-reviews?id=${eod.id}`} 
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider text-[var(--accent-primary)] border-indigo-100 hover:bg-indigo-50")}
                        >
                            REVIEW
                        </Link>
                      </div>
                    ))
                  )}
                </div>
                {pendingEods.length > 3 && (
                  <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center">
                    <Link href="/manager/eod-reviews" className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-widest hover:underline">
                      Process all {pendingEods.length} reports &rarr;
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)] flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Project Requests</CardTitle>
                </div>
                {pendingProjects.length > 0 && (
                  <Badge className="bg-amber-500 text-white font-black text-[8px] rounded-lg px-2 h-5 border-none">
                    {pendingProjects.length} NEW
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-8 pt-6">
                <div className="space-y-3">
                  {pendingProjects.length === 0 ? (
                    <div className="text-[10px] font-bold text-[var(--text-muted)] py-8 text-center border-2 border-dashed rounded-2xl border-[var(--border-subtle)] uppercase tracking-widest bg-[var(--bg-subtle)]/30">
                      No proposals found
                    </div>
                  ) : (
                    pendingProjects.slice(0, 3).map((project) => (
                      <div key={project.id} className="p-4 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-surface)] hover:border-amber-200 transition-all flex items-center justify-between group">
                        <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm font-bold text-[var(--text-primary)] leading-none mb-1 truncate">{project.title}</p>
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
                  <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center">
                    <Link href="/manager/projects" className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">
                      View all {pendingProjects.length} requests &rarr;
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Personal Work Hub */}
          <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-[var(--border-subtle)]">
              <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">My Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-8">
              <div className="grid gap-6 md:grid-cols-3">
                  <Link 
                    href="/manager/my-attendance"
                    className="group p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm hover:border-[var(--accent-primary)]/50 hover:shadow-[var(--shadow-soft)] transition-all flex flex-col items-center text-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Clock className="h-6 w-6 text-[var(--accent-primary)]" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Attendance</div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">Personal Records</div>
                    </div>
                  </Link>

                  <Link 
                    href="/manager/my-tasks"
                    className="group p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm hover:border-[var(--accent-primary)]/50 hover:shadow-[var(--shadow-soft)] transition-all flex flex-col items-center text-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckSquare className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">My Tasks</div>
                        <div className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-widest">Tasks List</div>
                    </div>
                  </Link>

                  <Link 
                    href="/manager/my-eod"
                    className="group p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm hover:border-[var(--accent-primary)]/50 hover:shadow-[var(--shadow-soft)] transition-all flex flex-col items-center text-center gap-4"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShieldCheck className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">End of Day</div>
                        <div className="text-[10px] font-medium text-[var(--text-muted)] mt-1 uppercase tracking-widest">End of Day reports</div>
                    </div>
                  </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Announcements Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden sticky top-6 text-[var(--text-primary)]">
            <CardHeader className="bg-[var(--accent-primary)] text-white flex flex-row items-center justify-between p-8 py-6 border-none">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Announcements</CardTitle>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-200" />
                    <span className="text-[10px] uppercase tracking-widest">Insights</span>
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
