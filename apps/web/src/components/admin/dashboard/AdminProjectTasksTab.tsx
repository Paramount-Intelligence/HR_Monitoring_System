'use client';

import Link from 'next/link';
import { Briefcase, CheckSquare, AlertTriangle, Clock } from 'lucide-react';
import { AdminMetricCard } from './AdminMetricCard';
import { AdminChartCard } from './AdminChartCard';
import { AdminDataTable } from './AdminDataTable';
import { AdminTabError } from './AdminTabError';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { Badge } from '@/components/ui/badge';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { ProjectsTasksAnalyticsData } from '@/lib/admin-dashboard/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS = ['#1E66C1', '#38BDF8', '#047857', '#B45309', '#B91C1C'];

interface AdminProjectTasksTabProps {
  data: ProjectsTasksAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Override quick links (e.g. manager routes) */
  projectsHref?: string;
  tasksHref?: string;
}

export function AdminProjectTasksTab({
  data,
  loading,
  error,
  onRetry,
  projectsHref = '/admin/projects',
  tasksHref = '/admin/tasks',
}: AdminProjectTasksTabProps) {
  if (loading) {
    return <div className="py-20 text-center text-sm text-[var(--text-muted)] font-semibold">Loading project & task analytics...</div>;
  }
  if (error) {
    return <AdminTabError tabName="Project & Tasks" message={error} onRetry={onRetry} />;
  }
  if (!data) {
    return <AdminTabError tabName="Project & Tasks" message="No analytics payload received." onRetry={onRetry} />;
  }

  const s = data.summary || {};
  const taskStatus = safeArray(data.task_status_distribution);
  const taskPriority = safeArray(data.task_priority_distribution);
  const projectProgress = safeArray(data.project_progress);
  const tasksByDept = safeArray(data.tasks_by_department);
  const projects = safeArray<Record<string, unknown>>(data.projects);
  const tasks = safeArray<Record<string, unknown>>(data.tasks);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href={projectsHref} className="text-xs font-black text-[var(--accent-primary)] hover:underline">Create Project</Link>
        <Link href={tasksHref} className="text-xs font-black text-[var(--accent-primary)] hover:underline">Assign Task</Link>
        <Link href={tasksHref} className="text-xs font-black text-[var(--accent-primary)] hover:underline">Task Board</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <AdminMetricCard title="Total Projects" value={safeNumber(s.total_projects)} icon={Briefcase} />
        <AdminMetricCard title="Active" value={safeNumber(s.active_projects)} />
        <AdminMetricCard title="Completed" value={safeNumber(s.completed_projects)} />
        <AdminMetricCard title="On Hold" value={safeNumber(s.blocked_projects)} />
        <AdminMetricCard title="Active Tasks" value={safeNumber(s.active_tasks)} icon={CheckSquare} />
        <AdminMetricCard title="Overdue" value={safeNumber(s.overdue_tasks)} icon={AlertTriangle} />
        <AdminMetricCard title="Completed Tasks" value={safeNumber(s.completed_tasks)} />
        <AdminMetricCard title="Pending" value={safeNumber(s.pending_tasks)} icon={Clock} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminChartCard title="Task Status">
          {taskStatus.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No tasks</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={taskStatus} dataKey="count" nameKey="label" cx="50%" cy="45%" innerRadius={35} outerRadius={55}>
                  {taskStatus.map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <AdminChartCard title="Task Priority">
          {taskPriority.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={taskPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E66C1" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <AdminChartCard title="Project Progress" description="% complete">
          {projectProgress.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No projects</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={projectProgress.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 8 }} width={70} />
                <Tooltip />
                <Bar dataKey="count" fill="#38BDF8" radius={4} name="Progress %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <AdminChartCard title="Tasks by Department">
          {tasksByDept.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tasksByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#047857" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>
      </div>

      <div>
        <h3 className="text-sm font-black mb-3 uppercase tracking-wider">Projects</h3>
        <AdminDataTable
          data={projects}
          emptyMessage="No projects"
          columns={[
            { key: 'name', header: 'Project', render: (r) => String(r.name || '—') },
            { key: 'owner', header: 'Owner', render: (r) => String(r.owner_name || '—') },
            { key: 'team', header: 'Team', render: (r) => safeNumber(r.team_size) },
            { key: 'status', header: 'Status', render: (r) => <Badge variant="outline">{String(r.status || '—')}</Badge> },
            { key: 'progress', header: 'Progress', render: (r) => `${safeNumber(r.progress)}%` },
            {
              key: 'tasks',
              header: 'Tasks',
              render: (r) => `${safeNumber(r.active_tasks)} active / ${safeNumber(r.completed_tasks)} done`,
            },
            { key: 'overdue', header: 'Overdue', render: (r) => safeNumber(r.overdue_tasks) },
          ]}
        />
      </div>

      <div>
        <h3 className="text-sm font-black mb-3 uppercase tracking-wider">Tasks</h3>
        <AdminDataTable
          data={tasks}
          emptyMessage="No tasks"
          columns={[
            { key: 'title', header: 'Task', render: (r) => String(r.title || '—') },
            { key: 'project', header: 'Project', render: (r) => String(r.project_name || '—') },
            {
              key: 'assignee',
              header: 'Assignee',
              render: (r) => (
                <div className="flex items-center gap-2">
                  <UserProfilePicture
                    user={{
                      full_name: String(r.assignee_name || ''),
                      profile_picture_url: r.assignee_avatar_url as string | null,
                      avatar_url: r.assignee_avatar_url as string | null,
                    }}
                    name={String(r.assignee_name || '')}
                    size="sm"
                  />
                  <span>{String(r.assignee_name || '—')}</span>
                </div>
              ),
            },
            { key: 'priority', header: 'Priority', render: (r) => String(r.priority || '—') },
            { key: 'status', header: 'Status', render: (r) => String(r.status || '—') },
            { key: 'due', header: 'Due', render: (r) => String(r.due_date || '—') },
            {
              key: 'time',
              header: 'Logged',
              render: (r) => {
                const mins = safeNumber(r.logged_minutes);
                return `${Math.floor(mins / 60)}h ${mins % 60}m`;
              },
            },
            {
              key: 'link',
              header: '',
              render: (r) => (
                <Link href={tasksHref} className="text-[10px] font-black text-[var(--accent-primary)]">Open</Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
