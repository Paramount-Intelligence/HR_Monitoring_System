'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Users, TrendingUp, Clock, Award, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function TeamLeadDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Team Lead Dashboard</h1>
        <p className="text-slate-500">Welcome, {user?.full_name}. Oversee your team's tasks and delivery.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">My Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">—</div>
            <p className="text-xs text-blue-700">Active assignments</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Team Active</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">—</div>
            <p className="text-xs text-emerald-700">Currently checked in</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">—</div>
            <p className="text-xs text-amber-700">Logged today</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-violet-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-900">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900">—</div>
            <p className="text-xs text-violet-700">Tasks this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
              <CheckSquare className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-base">Team Tasks</CardTitle>
            <CardDescription>View and manage tasks for your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/manager/tasks" className="text-sm text-blue-600 font-medium hover:text-blue-700">Open Team Tasks →</a>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-base">My Attendance</CardTitle>
            <CardDescription>View your own attendance and check-in history</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/employee/attendance" className="text-sm text-blue-600 font-medium hover:text-blue-700">View Attendance →</a>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-2 group-hover:bg-amber-100 transition-colors">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-base">My Growth</CardTitle>
            <CardDescription>Track your personal development and goals</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/employee/growth" className="text-sm text-blue-600 font-medium hover:text-blue-700">View Growth →</a>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Team Lead Role</CardTitle>
          <CardDescription>Your access scope as a Team Lead</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'View Own Attendance', 'View Team Tasks', 'Create Tasks for Team',
              'Set Task Priorities', 'Review Team EODs', 'View Team Reports',
              'Apply for Leave', 'View Team Analytics', 'Own Growth Dashboard'
            ].map((cap) => (
              <div key={cap} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700">{cap}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
