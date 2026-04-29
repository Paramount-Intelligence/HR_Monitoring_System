'use client';

import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Users, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Activity, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { analyticsApi } from '@/lib/api/analytics';

// Mock data for charts if API returns empty
const productivityData = [
  { name: 'Mon', score: 65 },
  { name: 'Tue', score: 72 },
  { name: 'Wed', score: 85 },
  { name: 'Thu', score: 78 },
  { name: 'Fri', score: 90 },
  { name: 'Sat', score: 45 },
  { name: 'Sun', score: 30 },
];

const workloadData = [
  { name: 'Alice', tasks: 12 },
  { name: 'Bob', tasks: 15 },
  { name: 'Charlie', tasks: 8 },
  { name: 'David', tasks: 22 },
  { name: 'Eve', tasks: 10 },
];

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
      // Keep loading as false but don't show toast for every fail in dev
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Intelligence & Analytics</h1>
        <p className="text-slate-500">Deep insights into team performance, workload balance, and productivity trends.</p>
      </div>

      {/* Top Insights Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-600">Avg. Productivity</p>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">84%</div>
                <div className="flex items-center text-xs font-medium text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> +12%
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">vs last 7 days</p>
            </div>
            <div className="h-1.5 w-full bg-slate-100">
              <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: '84%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-600">Burnout Risk</p>
                <div className="p-2 bg-rose-50 rounded-lg text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{burnoutRisks.length} Members</div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Showing high risk signals</p>
            </div>
            <div className="h-1.5 w-full bg-slate-100">
              <div className="h-full bg-rose-600 transition-all duration-1000" style={{ width: '15%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-600">Tasks Completed</p>
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">142</div>
                <div className="flex items-center text-xs font-medium text-rose-600">
                  <ArrowDownRight className="h-3 w-3 mr-1" /> -4%
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">This month so far</p>
            </div>
            <div className="h-1.5 w-full bg-slate-100">
              <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: '65%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-600">Active Members</p>
                <div className="p-2 bg-violet-50 rounded-lg text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">18 / 20</div>
              </div>
              <p className="text-xs text-slate-500 mt-1">Currently checked in</p>
            </div>
            <div className="h-1.5 w-full bg-slate-100">
              <div className="h-full bg-violet-600 transition-all duration-1000" style={{ width: '90%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Productivity Trend */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Team Productivity Trend
            </CardTitle>
            <CardDescription>Daily performance aggregate across all team members.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Workload Distribution */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Workload Distribution
            </CardTitle>
            <CardDescription>Number of active tasks assigned per member.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workload.length > 0 ? workload : workloadData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Performers */}
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Team Performance Leaderboard</CardTitle>
            <CardDescription>Members with highest task completion and consistency.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bestPerformers.slice(0, 5).map((performer, idx) => (
                <div key={performer.user_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                      idx === 0 ? "bg-amber-100 text-amber-700" : 
                      idx === 1 ? "bg-slate-200 text-slate-700" :
                      idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{performer.full_name}</div>
                      <div className="text-xs text-slate-500">{performer.completed_tasks} tasks completed</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{performer.score}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Score</div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                      {Math.round(performer.attendance_consistency * 100)}% Consistency
                    </Badge>
                  </div>
                </div>
              ))}
              {bestPerformers.length === 0 && (
                <div className="text-center py-8 text-slate-500 italic">Calculating performance metrics...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Burnout Risks */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-rose-600">Risk Signals</CardTitle>
            <CardDescription>Members showing early signs of burnout.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {burnoutRisks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">All Good!</p>
                  <p className="text-xs text-slate-500">No team members are currently at risk.</p>
                </div>
              ) : (
                burnoutRisks.map((risk) => (
                  <div key={risk.user_id} className="p-3 rounded-lg border border-rose-100 bg-rose-50/30">
                    <div className="font-medium text-slate-900">{risk.full_name}</div>
                    <div className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {risk.consecutive_high_hour_days} consecutive 10h+ days
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-200">
                        {risk.risk_level} Risk
                      </Badge>
                    </div>
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

// Helper for dynamic classes
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
