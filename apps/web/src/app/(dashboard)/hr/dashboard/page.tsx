'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, CalendarCheck, Palmtree, Megaphone, Building, 
  TrendingUp, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function HRDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">HR & Operations</h1>
        <p className="text-slate-500">Welcome back, {user?.full_name}. Manage people, policies, and org operations.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">—</div>
            <p className="text-xs text-blue-700">Active workforce members</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Pending Leaves</CardTitle>
            <Palmtree className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">—</div>
            <p className="text-xs text-amber-700">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900">Active Today</CardTitle>
            <CalendarCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">—</div>
            <p className="text-xs text-emerald-700">Checked in today</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-rose-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-rose-900">Missing Checkout</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">—</div>
            <p className="text-xs text-rose-700">Incomplete sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-base">User Management</CardTitle>
            <CardDescription>Create and manage employee accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/admin/users" className="text-sm text-blue-600 font-medium hover:text-blue-700">
              Open User Management →
            </a>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-2 group-hover:bg-amber-100 transition-colors">
              <Palmtree className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-base">Leave Approvals</CardTitle>
            <CardDescription>Review pending leave requests org-wide</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/manager/approvals" className="text-sm text-blue-600 font-medium hover:text-blue-700">
              Review Leaves →
            </a>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
              <Building className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-base">Organization Setup</CardTitle>
            <CardDescription>Configure departments, shifts, and holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/admin/organization" className="text-sm text-blue-600 font-medium hover:text-blue-700">
              Open Organization →
            </a>
          </CardContent>
        </Card>
      </div>

      {/* HR Info Panel */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>HR Operations Role</CardTitle>
          <CardDescription>Your access scope as HR & Operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'View All Users', 'Create Employees', 'Approve Leaves', 
              'Manage Departments', 'Manage Holidays', 'Create Announcements',
              'Manage Shifts', 'View Org Reports', 'Attendance Management'
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
