'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, CalendarCheck, Palmtree, Megaphone, Building, 
  TrendingUp, Clock, AlertTriangle, CheckCircle2, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { KPICard, KPICardSkeleton } from '@/components/dashboard/KPICard';
import { DashboardOverviewUpdatesSection } from '@/components/dashboard/DashboardOverviewUpdatesSection';
import { dashboardApi } from '@/lib/api/dashboard';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { organizationTabHref } from '@/lib/navigation/organization-nav';

export default function HRDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await dashboardApi.getAdminSummary(); // HR typically shares admin summary or has its own
        setSummary(data);
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setIsLoading(false);
      }
    }
    loadSummary();
  }, []);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">People Operations</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">HR Dashboard</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Global Team Overview</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KPICard 
                title="Team Size"
                value={summary?.total_employees || 0}
                description="Active employees"
                icon={Users}
            />
            <KPICard 
                title="Pending Approvals"
                value={summary?.pending_leaves || 0}
                description="Awaiting HR review"
                icon={Palmtree}
                variant={(summary?.pending_leaves || 0) > 0 ? "warning" : "default"}
            />
            <KPICard 
                title="Active Today"
                value={summary?.active_today || 0}
                description="Successfully checked in"
                icon={CalendarCheck}
                variant="indigo"
            />
            <KPICard 
                title="Attendance Exceptions"
                value={summary?.missing_checkouts || 0}
                description="Incomplete sessions"
                icon={AlertTriangle}
                variant={(summary?.missing_checkouts || 0) > 0 ? "danger" : "default"}
            />
        </div>
      )}

      <DashboardOverviewUpdatesSection
        limit={5}
        announcementsViewAllHref={organizationTabHref('announcements')}
        holidaysViewAllHref={organizationTabHref('holidays')}
      />

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
          <CardHeader className="p-8 pb-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-[var(--accent-primary)]" />
            </div>
            <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">User Management</CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight">Lifecycle & Account Governance</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <a href="/admin/users" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] hover:underline">
              Open Directory &rarr;
            </a>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
          <CardHeader className="p-8 pb-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Palmtree className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">Leave Approvals</CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight">Review leave and WFH requests</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <a href="/manager/approvals" className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] hover:underline">
              Review Leaves &rarr;
            </a>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
          <CardHeader className="p-8 pb-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building className="h-6 w-6 text-emerald-600" />
            </div>
            <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">Organization Setup</CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight">Organizational Policy</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <a href="/admin/organization" className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] hover:underline">
              Manage Setup &rarr;
            </a>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="p-8 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black text-[var(--text-primary)] tracking-tight">System Overview</CardTitle>
          <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight">System access and capability scope</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              'Personnel Directory', 'Employee Onboarding', 'Leave Approvals', 
              'Policy Configuration', 'Holiday Management', 'System Announcements',
              'Shift Scheduling', 'Team Analytics', 'Attendance Audits'
            ].map((cap) => (
              <div key={cap} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-tight">{cap}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
