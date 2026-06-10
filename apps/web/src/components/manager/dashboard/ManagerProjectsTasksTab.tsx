'use client';

import Link from 'next/link';
import { AdminProjectTasksTab } from '@/components/admin/dashboard/AdminProjectTasksTab';
import { ProjectsTasksAnalyticsData } from '@/lib/admin-dashboard/types';

interface Props {
  data: ProjectsTasksAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/** Manager-scoped projects & tasks tab — reuses admin analytics layout with manager links. */
export function ManagerProjectsTasksTab(props: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs font-bold">
        <Link href="/manager/projects" className="text-[var(--accent-primary)] hover:underline">All Projects</Link>
        <Link href="/manager/tasks" className="text-[var(--accent-primary)] hover:underline">Task Board</Link>
      </div>
      <AdminProjectTasksTab {...props} projectsHref="/manager/projects" tasksHref="/manager/tasks" />
    </div>
  );
}
