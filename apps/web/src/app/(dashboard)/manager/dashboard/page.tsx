'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { eodApi, EODReport } from '@/lib/api/eod';
import { projectsApi, Project } from '@/lib/api/projects';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ClipboardCheck, AlertCircle, Loader2, ShieldCheck, Clock, Activity, CheckSquare, Megaphone, Briefcase } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { AnnouncementList } from '@/components/dashboard/announcement-list';

export default function ManagerDashboard() {
  const [data, setData] = useState<any>(null);
  const [eods, setEods] = useState<EODReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myEod, setMyEod] = useState<EODReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, teamEods, myEodData, projectsData, userData] = await Promise.all([
          dashboardApi.getManagerSummary(),
          eodApi.getTeamEODs(),
          eodApi.getMyEOD(),
          projectsApi.getProjects(),
          usersApi.getMe()
        ]);
        setData(summary);
        setEods(teamEods);
        setMyEod(myEodData);
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
  const pendingProjects = projects.filter(p => 
    (p.approval_status === 'pending' || p.approval_status === 'pending_approval') && 
    p.manager_id === currentUser?.id
  );
  const myEodStatus = myEod ? myEod.status : 'Not Started';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your team's activity, EOD approvals, and your personal work.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
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

            {pendingProjects.length > 0 && (
              <Card className="shadow-sm border-amber-100 bg-amber-50/20 sm:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900">Project Approvals</CardTitle>
                  <Briefcase className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700">{pendingProjects.length} Pending</div>
                  <p className="text-xs text-amber-600 mt-1">New projects awaiting your review</p>
                </CardContent>
              </Card>
            )}
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
                      <p className="text-sm font-medium text-slate-900">My Attendance</p>
                      <p className="text-xs text-slate-500">Manage your check-in/out</p>
                    </div>
                  </div>
                  <Link href="/manager/my-attendance" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    Manage
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Link 
                    href="/manager/my-tasks"
                    className={cn(buttonVariants({ variant: "outline" }), "h-16 flex flex-col items-center justify-center gap-1 hover:bg-blue-50 hover:text-blue-600")}
                  >
                    <CheckSquare className="h-5 w-5 text-slate-500" />
                    <span className="text-xs">My Tasks</span>
                  </Link>
                  <Link 
                    href="/manager/my-eod"
                    className={cn(buttonVariants({ variant: "outline" }), "h-16 flex flex-col items-center justify-center gap-1 hover:bg-blue-50 hover:text-blue-600")}
                  >
                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                    <span className="text-xs">My EOD</span>
                  </Link>
                  <Link 
                    href="/manager/projects"
                    className={cn(buttonVariants({ variant: "outline" }), "h-16 flex flex-col items-center justify-center gap-1 hover:bg-blue-50 hover:text-blue-600")}
                  >
                    <Briefcase className="h-5 w-5 text-slate-500" />
                    <span className="text-xs">Projects</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* EOD Review Queue Section */}
            <Card className="shadow-sm border-blue-100">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>EOD Review Queue</CardTitle>
                  <CardDescription>Employee reports pending approval</CardDescription>
                </div>
                {pendingEods.length > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
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
                    pendingEods.slice(0, 2).map((eod) => (
                      <div key={eod.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-semibold text-slate-900">{eod.user_name}</p>
                          <Badge variant="outline" className="text-[10px]">{eod.work_mode}</Badge>
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                          <Link 
                            href={`/manager/eod-reviews?id=${eod.id}`} 
                            className={cn(buttonVariants({ variant: "default", size: "xs" }), "h-7 text-[10px] bg-blue-600 hover:bg-blue-700")}
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {pendingEods.length > 2 && (
                  <div className="mt-4 pt-2 border-t text-center">
                    <Link href="/manager/eod-reviews" className="text-xs text-blue-600 hover:underline">
                      View all {pendingEods.length} reports &rarr;
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Approval Queue Section */}
            <Card className="shadow-sm border-amber-100">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Project Approvals</CardTitle>
                  <CardDescription>Review new project requests</CardDescription>
                </div>
                {pendingProjects.length > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    {pendingProjects.length} New
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingProjects.length === 0 ? (
                    <div className="text-sm text-slate-500 py-4 text-center border rounded-lg border-dashed">
                      No projects pending approval.
                    </div>
                  ) : (
                    pendingProjects.slice(0, 3).map((project) => (
                      <div key={project.id} className="p-3 border rounded-lg bg-white shadow-sm flex flex-col gap-2 text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[150px]">{project.description}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">{project.priority}</Badge>
                        </div>
                        <div className="flex gap-2 justify-end mt-1">
                          <Link 
                            href={`/manager/projects/${project.id}`} 
                            className={cn(buttonVariants({ variant: "default", size: "xs" }), "h-7 text-[10px] bg-amber-600 hover:bg-amber-700")}
                          >
                            Review
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {pendingProjects.length > 3 && (
                  <div className="mt-4 pt-2 border-t text-center">
                    <Link href="/manager/projects" className="text-xs text-amber-600 hover:underline">
                      View all {pendingProjects.length} requests &rarr;
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-blue-100 bg-blue-50/10">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                  Announcements
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AnnouncementList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
