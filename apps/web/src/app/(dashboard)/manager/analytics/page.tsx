'use client';

import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api/analytics';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  BarChart3, PieChart as PieChartIcon, AlertTriangle, Trophy, Users, Loader2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { KPICard } from '@/components/dashboard/KPICard';
import { cn } from '@/lib/utils';

export default function ManagerAnalyticsPage() {
  const [bestPerformers, setBestPerformers] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [burnoutRisks, setBurnoutRisks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [best, wrk, risks] = await Promise.all([
        analyticsApi.getBestPerformers(),
        analyticsApi.getWorkloadBalance(),
        analyticsApi.getBurnoutRisks()
      ]);
      setBestPerformers(best || []);
      setWorkload(wrk || []);
      setBurnoutRisks(risks || []);
    } catch (error) {
      console.error('Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Intelligence & Analytics</h1>
        <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Deep-tissue insights into team performance, workload balance, and productivity vectors.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          title="Productivity Yield" 
          value="84.2%" 
          change={12.5} 
          icon={TrendingUp} 
          description="Aggregate team efficiency"
        />
        <KPICard 
          title="Operational Friction" 
          value={burnoutRisks.length.toString()} 
          change={-2.4} 
          icon={AlertTriangle} 
          description="Active burnout risk signals"
          variant={burnoutRisks.length > 0 ? "warning" : "default"}
        />
        <KPICard 
          title="Completed Tasks" 
          value="142" 
          change={-4.1} 
          icon={CheckCircle2} 
          description="Tasks completed this cycle"
        />
        <KPICard 
          title="Active Capacity" 
          value="18/20" 
          change={2.1} 
          icon={Users} 
          description="Members currently verified"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl shadow-premium border-[var(--border-subtle)] overflow-hidden">
          <CardHeader className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-[var(--text-secondary)]">
              <Activity className="h-4 w-4 text-indigo-600" />
              Efficiency Vectors
            </CardTitle>
            <CardDescription className="text-xs font-medium">Daily performance aggregate across all teams.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#fff' }}
                    itemStyle={{ color: '#818cf8', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#fff', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-premium border-[var(--border-subtle)] overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-[var(--text-secondary)]">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Load Distribution
            </CardTitle>
            <CardDescription className="text-xs font-medium">Execution bandwidth allocation per team member.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload.length > 0 ? workload : workloadData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#fff' }}
                    itemStyle={{ color: '#818cf8', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#fff', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <Bar dataKey="tasks" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 rounded-2xl shadow-premium border-[var(--border-subtle)] overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Performance Leaderboard</CardTitle>
            <CardDescription className="text-xs font-medium">Top contributors based on completion velocity and consistency.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {bestPerformers.slice(0, 5).map((performer, idx) => (
                <div key={performer.user_id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all hover:translate-x-1 duration-200">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm",
                      idx === 0 ? "bg-indigo-600 text-white" : 
                      idx === 1 ? "bg-slate-800 text-white" :
                      idx === 2 ? "bg-[var(--text-muted)] text-white" : "bg-[var(--bg-soft)] text-[var(--text-muted)]"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)] text-sm leading-none mb-1">{performer.full_name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{performer.completed_tasks} Tasks Verified</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-black text-[var(--text-primary)] leading-none mb-1">{performer.score}</div>
                      <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Efficiency</div>
                    </div>
                    <div className="hidden sm:block">
                        <StatusBadge status="active" text={`${Math.round(performer.attendance_consistency * 100)}% Match`} />
                    </div>
                  </div>
                </div>
              ))}
              {bestPerformers.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest animate-pulse">Synchronizing Intelligence Data...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-[var(--shadow-card)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] overflow-hidden">
          <CardHeader className="border-b border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-rose-600">
                <AlertTriangle className="h-4 w-4" />
                Risk Signals
            </CardTitle>
            <CardDescription className="text-xs font-medium text-rose-500">Early indicators of operational burnout.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {burnoutRisks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-[var(--status-success-bg)] flex items-center justify-center text-[var(--status-success-text)] mb-4 border border-[var(--status-success-border)] shadow-sm">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest">System Nominal</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1">No burnout risks detected in current cycle.</p>
                </div>
              ) : (
                burnoutRisks.map((risk) => (
                  <div key={risk.user_id} className="p-4 rounded-xl border border-[var(--status-danger-border)] bg-[var(--bg-surface)] shadow-sm transition-all hover:shadow-md">
                    <div className="font-bold text-[var(--text-primary)] text-sm leading-none mb-2">{risk.full_name}</div>
                    <div className="text-[10px] text-rose-600 font-bold uppercase tracking-tight flex items-center gap-1.5 mb-3">
                      <Activity className="h-3 w-3" />
                      {risk.consecutive_high_hour_days} Consecutive Overages
                    </div>
                    <StatusBadge status="critical" text={`${risk.risk_level} RISK`} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
