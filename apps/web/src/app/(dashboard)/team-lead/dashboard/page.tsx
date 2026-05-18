'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Users, TrendingUp, Clock, Award, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function TeamLeadDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Management</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Team Lead Dashboard</h1>
          <p className="text-[var(--text-secondary)] font-bold text-sm tracking-tight uppercase opacity-60">Welcome, {user?.full_name}. Oversee your team's tasks and delivery.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-[2rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">My Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-[var(--accent-primary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">—</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Active assignments</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-[2rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Team Active</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">—</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Currently checked in</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-[2rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">—</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Logged today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[var(--shadow-soft)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-[2rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">—</div>
            <p className="text-xs text-[var(--text-muted)] mt-1">Tasks this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
          <CardHeader className="p-8 pb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
              <CheckSquare className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-black tracking-tight">Team Tasks</CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">View and manage tasks for your team members</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <a href="/manager/tasks" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] hover:underline">Open Team Tasks &rarr;</a>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
          <CardHeader className="p-8 pb-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-xl font-black tracking-tight">My Attendance</CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">View your own attendance and check-in history</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <a href="/employee/attendance" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] hover:underline">View Attendance &rarr;</a>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-hard)] transition-all duration-500 text-[var(--text-primary)]">
          <CardHeader className="p-8 pb-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-2 group-hover:bg-amber-100 transition-colors">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-xl font-black tracking-tight">My Growth</CardTitle>
            <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">Track your personal development and goals</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <a href="/employee/growth" className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.2em] hover:underline">View Growth &rarr;</a>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="p-8 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black tracking-tight">Team Lead Role</CardTitle>
          <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase mt-1">Your access scope as a Team Lead</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              'View Own Attendance', 'View Team Tasks', 'Create Tasks for Team',
              'Set Task Priorities', 'Review Team EOD Reports', 'View Team Reports',
              'Apply for Leave', 'View Team Analytics', 'Own Growth Dashboard'
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
