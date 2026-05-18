'use client';

import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeletons';
import { 
  Users, Briefcase, Activity, AlertTriangle, Loader2, TrendingUp, ShieldCheck, 
  CheckCircle2, Clock, CalendarX, Building, RefreshCcw, Info, ArrowUpRight,
  TrendingDown, Search, Filter, MoreHorizontal
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const analytics = await dashboardApi.getAdminAnalytics();
      // Ensure data is valid before setting
      if (!analytics || !analytics.kpis) {
        throw new Error('Malformed analytics data');
      }
      setData(analytics);
    } catch (e) {
      console.error('Failed to load admin analytics', e);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm p-10 bg-white rounded-[2.5rem] shadow-premium-lg border border-slate-100">
          <div className="h-20 w-20 rounded-full bg-rose-50 flex items-center justify-center ring-8 ring-rose-50/50">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Intelligence Offline</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              We encountered a disruption while aggregating organizational insights. Please verify your connection or try again.
            </p>
          </div>
          <Button 
            onClick={loadData} 
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  const {
    kpis,
    attendance_trend,
    task_statistics,
    project_statistics,
    department_comparison,
    people_exceptions,
    recent_activity
  } = data;

  // Formatting Task Data for Donut Chart - Null safe
  const taskData = [
    { name: 'Completed', value: task_statistics?.completed || 0, color: '#10b981' }, 
    { name: 'In Progress', value: task_statistics?.in_progress || 0, color: '#4f46e5' }, 
    { name: 'Pending', value: task_statistics?.pending || 0, color: '#f59e0b' }, 
    { name: 'On Hold', value: task_statistics?.on_hold || 0, color: '#64748b' }, 
    { name: 'Blocked', value: task_statistics?.rejected || 0, color: '#ef4444' }, 
  ].filter(d => d.value > 0);

  const stats = [
    {
      title: 'Global Workforce',
      value: kpis.total_employees || 0,
      sub: `${kpis.checked_in_today || 0} Present Now`,
      icon: Users,
      trend: `${kpis.attendance_rate || 0}% Rate`,
      gradient: 'from-blue-600 to-indigo-700'
    },
    {
      title: 'Active Projects',
      value: kpis.total_projects || 0,
      sub: `${project_statistics?.active || 0} In Execution`,
      icon: Briefcase,
      trend: `${project_statistics?.pending || 0} Pending`,
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Pending Actions',
      value: kpis.pending_approvals || 0,
      sub: kpis.pending_approvals > 5 ? 'High Volume' : 'Under Control',
      icon: Activity,
      trend: 'Awaiting Decision',
      gradient: kpis.pending_approvals > 10 ? 'from-rose-500 to-orange-600' : 'from-slate-700 to-slate-900'
    },
    {
      title: 'Late Arrivals',
      value: kpis.late_today || 0,
      sub: `${kpis.wfh_today || 0} Working Remotely`,
      icon: Clock,
      trend: 'Today',
      gradient: 'from-amber-500 to-orange-600'
    }
  ];

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Administrative Command Center</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">Admin Dashboard</h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight uppercase opacity-60">Governance & Execution Layer</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button size="sm" className="h-10 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Data
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="relative overflow-hidden border-none shadow-premium rounded-[2rem] group hover:shadow-premium-lg transition-all duration-500 bg-white p-1">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500", stat.gradient)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-7">
              <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{stat.title}</CardTitle>
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-500", stat.gradient)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="px-7 pb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.trend}</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-2.5 flex items-center gap-2">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  stat.sub === 'Requires attention' || stat.sub === 'High Volume' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                )} />
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Left: Attendance Trend */}
        <Card className="lg:col-span-8 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Attendance Dynamics
                  <ArrowUpRight className="h-4 w-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">7-Day Organizational Velocity</CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-10">
            {attendance_trend?.length === 0 ? (
              <div className="h-[300px]">
                <EmptyState message="No trend data recorded in the last 7 days." />
              </div>
            ) : (
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <LineChart data={attendance_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}}
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}}
                      dx={-10}
                    />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px'}}
                      labelStyle={{fontWeight: 900, color: '#0f172a', marginBottom: '8px', fontSize: '12px'}}
                      itemStyle={{fontSize: '11px', fontWeight: 700}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '30px'}} />
                    <Line type="monotone" name="Present" dataKey="checked_in" stroke="#4f46e5" strokeWidth={4} dot={{r: 4, strokeWidth: 3, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 0}} />
                    <Line type="monotone" name="Late" dataKey="late" stroke="#f59e0b" strokeWidth={4} dot={{r: 4, strokeWidth: 3, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 0}} />
                    <Line type="monotone" name="Absent" dataKey="absent" stroke="#ef4444" strokeWidth={4} dot={{r: 4, strokeWidth: 3, fill: '#fff'}} activeDot={{r: 6, strokeWidth: 0}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Task Donut */}
        <Card className="lg:col-span-4 border-none shadow-premium bg-white rounded-[2.5rem] flex flex-col group">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Execution Hub</CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregate Task Distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-8 pt-10 relative">
            {taskData.length === 0 ? (
              <div className="h-[300px]">
                <EmptyState message="No tasks assigned in this organization." />
              </div>
            ) : (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{task_statistics?.total || 0}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Total Unit Focus</span>
                </div>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={taskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={125}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {taskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Exceptions & Performance */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Left: People Exceptions */}
        <Card className="lg:col-span-5 border-none shadow-premium bg-white rounded-[2.5rem] flex flex-col">
          <CardHeader className="px-8 pt-8 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Focus Protocol</CardTitle>
              <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Late or Absent Intelligence</CardDescription>
            </div>
            {people_exceptions?.length > 0 && (
              <div className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs ring-4 ring-rose-50/50">
                {people_exceptions.length}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 flex-1 max-h-[460px] overflow-y-auto scrollbar-hide">
            {people_exceptions?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Full Compliance</p>
                  <p className="text-xs font-bold text-slate-400 tracking-wide">All active units are accounted for today.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-50/50">
                {people_exceptions.map((person: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-8 py-5 hover:bg-slate-50/30 transition-all duration-300 group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg group-hover:scale-105 transition-transform",
                        person.status === 'Absent' ? 'bg-gradient-to-br from-rose-500 to-rose-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'
                      )}>
                        {person.status === 'Absent' ? <CalendarX className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-900 tracking-tight">{person.employee_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Building className="h-3 w-3" /> {person.department_name || 'Organization'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border-none",
                        person.status === 'Absent' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        {person.status}
                      </Badge>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none opacity-80">{person.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Department Performance */}
        <Card className="lg:col-span-7 border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50/50">
            <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Unit Comparison</CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance Efficiency by Department</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-10">
            {department_comparison?.length === 0 ? (
              <div className="h-[380px]">
                <EmptyState message="No department performance data available." />
              </div>
            ) : (
              <div className="h-[380px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={department_comparison} margin={{ top: 0, right: 30, left: -10, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      type="number"
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 800}}
                    />
                    <YAxis 
                      type="category"
                      dataKey="department_name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{fontSize: 11, fill: '#475569', fontWeight: 800}}
                      width={110}
                    />
                    <RechartsTooltip 
                      cursor={{fill: '#f8fafc', radius: 12}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                      formatter={(value: number) => [`${value}%`, 'Attendance Rate']}
                    />
                    <Bar dataKey="attendance_rate" radius={[0, 10, 10, 0]} barSize={28}>
                      {department_comparison.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.attendance_rate < 80 ? '#f43f5e' : entry.attendance_rate < 95 ? '#4f46e5' : '#10b981'} 
                          fillOpacity={0.9}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity Feed */}
      <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-slate-50/50 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Organizational Ledger</CardTitle>
            <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Latest System Events & Broadcasts</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 h-9 rounded-xl transition-all">View All Logs</Button>
        </CardHeader>
        <CardContent className="p-0">
          {recent_activity?.length === 0 ? (
            <div className="p-20 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">No recent system activity.</div>
          ) : (
            <div className="divide-y divide-slate-50/50">
              {recent_activity.map((act: any, idx: number) => {
                const isAlert = act.title.toLowerCase().includes('alert');
                return (
                  <div key={idx} className="px-10 py-7 hover:bg-slate-50/30 transition-all duration-500 flex gap-6 items-start group">
                    <div className="mt-1 flex-shrink-0">
                      {isAlert ? (
                        <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl shadow-sm ring-1 ring-rose-100 group-hover:scale-110 transition-transform"><AlertTriangle className="h-5 w-5" /></div>
                      ) : (
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm ring-1 ring-indigo-100 group-hover:scale-110 transition-transform"><Activity className="h-5 w-5" /></div>
                      )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-black text-slate-900 tracking-tight">{act.title.replace('Alert: ', '').replace('Announcement: ', '')}</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-80">
                          {act.created_at ? format(parseISO(act.created_at), 'MMM d, yyyy • h:mm a') : 'Temporal Stamp Missing'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-4xl">{act.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center animate-in fade-in zoom-in duration-500">
      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
        <Info className="h-6 w-6" />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">{message}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10 pb-20 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-[2rem]" />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-12">
        <Skeleton className="lg:col-span-8 h-[440px] rounded-[2.5rem]" />
        <Skeleton className="lg:col-span-4 h-[440px] rounded-[2.5rem]" />
      </div>
    </div>
  );
}
