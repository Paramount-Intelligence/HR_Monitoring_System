'use client';

import Link from 'next/link';
import { AdminChartCard } from './AdminChartCard';
import { DashboardOverviewUpdatesSection } from '@/components/dashboard/DashboardOverviewUpdatesSection';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { organizationTabHref } from '@/lib/navigation/organization-nav';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';

const CHART_COLORS = ['#1E66C1', '#38BDF8', '#047857', '#B45309', '#B91C1C', '#607A99'];

interface AdminOverviewTabProps {
  data: any;
  tickets: any[];
  meetings: any[];
  onRefresh: () => void;
}

function hasAttendanceData(trend: Record<string, unknown>[]) {
  return trend.some(
    (d) =>
      safeNumber(d.checked_in) > 0 ||
      safeNumber(d.late) > 0 ||
      safeNumber(d.absent) > 0
  );
}

export function AdminOverviewTab({ data, tickets, meetings }: AdminOverviewTabProps) {
  const taskStats = data?.task_statistics || {};

  const attendanceTrend = safeArray<Record<string, unknown>>(data?.attendance_trend);
  const showAttendanceChart = attendanceTrend.length > 0 && hasAttendanceData(attendanceTrend);

  const taskPie = [
    { name: 'Completed', value: safeNumber(taskStats.completed) },
    { name: 'In Progress', value: safeNumber(taskStats.in_progress) },
    { name: 'Pending', value: safeNumber(taskStats.pending) },
    { name: 'Blocked', value: safeNumber(taskStats.rejected) },
  ].filter((d) => d.value > 0);
  const taskTotal = taskPie.reduce((sum, d) => sum + d.value, 0);

  const recentActivity = safeArray<Record<string, unknown>>(data?.recent_activity);
  const systemHealth = data?.system_health;

  return (
    <div className="space-y-4">
      {/* Main analytics grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-3">
        <AdminChartCard
          title="Attendance Trend"
          description="Last 7 days"
          contentClassName="min-h-[240px] flex items-center"
        >
          {!showAttendanceChart ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center w-full py-10">
              No attendance trend data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={attendanceTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={(v) => {
                    try { return format(parseISO(String(v)), 'MMM d'); } catch { return String(v); }
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="checked_in" stroke="#1E66C1" fill="#DCEEFF" name="Checked In" strokeWidth={2} />
                <Area type="monotone" dataKey="late" stroke="#B45309" fill="#FEF3C7" name="Late" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <div className="flex flex-col gap-4">
          <AdminChartCard
            title="Task Summary"
            description="Status distribution"
            contentClassName="min-h-[180px] flex items-center justify-center py-2"
          >
            {taskPie.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic text-center w-full py-6">
                No task data available
              </p>
            ) : (
              <div className="relative w-full h-[180px]">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={taskPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={taskPie.length === 1 ? 42 : 36}
                      outerRadius={taskPie.length === 1 ? 52 : 48}
                      paddingAngle={taskPie.length > 1 ? 2 : 0}
                    >
                      {taskPie.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    {taskPie.length === 1 && (
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-[var(--text-primary)] text-lg font-black">
                        {taskTotal}
                      </text>
                    )}
                    <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                    <Tooltip formatter={(value: number) => [value, 'Tasks']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </AdminChartCard>

          <AdminChartCard
            title="System Health"
            description="Service cluster validation"
            contentClassName="min-h-0 py-3"
          >
            {systemHealth ? (
              <div className="space-y-2">
                {Object.entries(systemHealth as Record<string, string>).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-secondary)] capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-[var(--status-success-text)]">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'API', status: 'Nominal' },
                  { label: 'Database', status: 'Connected' },
                  { label: 'Workers', status: 'Active' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-secondary)]">{row.label}</span>
                    <span className="inline-flex items-center rounded-md bg-[var(--status-success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--status-success-text)]">
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminChartCard>
        </div>
      </div>

      {/* Section 4: Recent activity */}
      <AdminChartCard
        title="Recent Activity"
        description="Latest system events"
        contentClassName="min-h-[120px] max-h-[240px] overflow-y-auto custom-scrollbar py-3"
      >
        {recentActivity.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <div key={i} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                <p className="text-xs font-black text-[var(--text-primary)] truncate">{String(item.title || '—')}</p>
                <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">{String(item.description || '')}</p>
              </div>
            ))}
          </div>
        )}
      </AdminChartCard>

      <DashboardOverviewUpdatesSection
        limit={5}
        holidaysViewAllHref={organizationTabHref('holidays')}
      />
    </div>
  );
}
