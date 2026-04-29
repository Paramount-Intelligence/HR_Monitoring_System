'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { alertsApi, Alert } from '@/lib/api/alerts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, Activity, AlertTriangle, Loader2, PieChart as PieChartIcon, TrendingUp, ShieldCheck, Bell } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, alertsData] = await Promise.all([
          dashboardApi.getAdminSummary(),
          alertsApi.getAlerts()
        ]);
        setData(summary);
        setAlerts(alertsData.filter(a => a.status === 'OPEN').slice(0, 5));
      } catch (e) {
        console.error('Failed to load admin dashboard', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center -mt-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium animate-pulse">Initializing Organization Intel...</p>
        </div>
      </div>
    );
  }

  const summary = data || {
    total_users: 0,
    active_users: 0,
    checked_in_today: 0,
    wfh_today: 0,
    office_today: 0,
    active_projects: 0,
    open_alerts: 0,
  };

  const attendanceData = [
    { name: 'Office', value: summary.office_today, color: '#3b82f6' },
    { name: 'WFH', value: summary.wfh_today, color: '#60a5fa' },
  ].filter(d => d.value > 0);

  const stats = [
    {
      title: 'Total Force',
      value: summary.total_users,
      sub: `${summary.active_users} Active`,
      icon: Users,
      color: 'blue',
      gradient: 'from-blue-600 to-indigo-600'
    },
    {
      title: 'Active Projects',
      value: summary.active_projects,
      sub: 'In execution',
      icon: Briefcase,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Security Alerts',
      value: summary.open_alerts,
      sub: summary.open_alerts > 0 ? 'Review Required' : 'System Secure',
      icon: AlertTriangle,
      color: summary.open_alerts > 0 ? 'rose' : 'emerald',
      gradient: summary.open_alerts > 0 ? 'from-rose-500 to-orange-600' : 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Operational Health',
      value: 'Stable',
      sub: '99.9% Uptime',
      icon: Activity,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-600'
    }
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500/20 px-2 py-0 text-[10px] uppercase font-bold">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20 px-2 py-0 text-[10px] uppercase font-bold">High</Badge>;
      case 'medium': return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20 px-2 py-0 text-[10px] uppercase font-bold">Medium</Badge>;
      default: return <Badge variant="outline" className="px-2 py-0 text-[10px] uppercase font-bold">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-blue-600 mb-1">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Administrative Control</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Organization Dashboard</h1>
        <p className="text-slate-500 font-medium">Real-time operational intelligence and workforce monitoring.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="relative overflow-hidden border-none shadow-lg group hover:shadow-xl transition-all duration-300">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] group-hover:opacity-[0.05] transition-opacity", stat.gradient)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.title}</CardTitle>
              <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white shadow-md", stat.gradient)}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</div>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                {stat.sub === 'System Secure' || stat.sub === 'Stable' ? (
                   <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : null}
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-7">
        <Card className="md:col-span-4 border-none shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Attendance Intel</span>
            </div>
            <CardTitle className="text-xl font-bold">Workforce Distribution</CardTitle>
            <CardDescription className="font-medium">WFH vs Office check-ins for the current cycle</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-10">
            {attendanceData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <PieChartIcon className="h-16 w-16 mb-4 opacity-20" />
                <span className="text-sm font-bold uppercase tracking-wider">No data detected for today</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="officeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="wfhGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Office' ? 'url(#officeGradient)' : 'url(#wfhGradient)'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontWeight: 'bold', fontSize: '12px', paddingTop: '20px'}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-lg bg-white/80 backdrop-blur-sm flex flex-col overflow-hidden">
          <CardHeader className="border-b border-slate-50">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Security Pulse</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Priority Alerts</CardTitle>
                <CardDescription className="font-medium">Recent operational anomalies</CardDescription>
              </div>
              {alerts.length > 0 && (
                <Badge className="bg-rose-500 text-white border-none animate-pulse">{alerts.length} New</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-slate-400 p-8 text-center gap-2">
                <ShieldCheck className="h-10 w-10 text-emerald-100 mb-2" />
                <span className="font-bold uppercase tracking-wider text-slate-300">All clear</span>
                <p>System operational with no active threats</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {alerts.map(alert => (
                  <div key={alert.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className="font-bold text-sm text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{alert.title}</span>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{alert.message}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      <Activity className="h-3 w-3" />
                      {format(parseISO(alert.created_at), 'PPp')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {alerts.length > 0 && (
            <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
              <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                View All Security Logs
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
