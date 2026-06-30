'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  UserPlus,
  Megaphone,
  Video,
  ClipboardPlus,
  Users,
  ClipboardCheck,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import { DashboardRole } from '@/lib/dashboard/dashboard-card-config';
import { organizationTabHref } from '@/lib/navigation/organization-nav';

export interface DashboardQuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
}

const quickActionsByRole: Record<DashboardRole, DashboardQuickAction[]> = {
  admin: [
    { label: 'Add User', href: '/admin/users', icon: UserPlus, color: 'text-emerald-600' },
    { label: 'Announcement', href: organizationTabHref('announcements'), icon: Megaphone, color: 'text-blue-600' },
    { label: 'Create Meeting', href: '/calendar', icon: Video, color: 'text-purple-600' },
    { label: 'Assign Task', href: '/admin/tasks', icon: ClipboardPlus, color: 'text-orange-600' },
  ],
  manager: [
    { label: 'Team Directory', href: '/manager/team', icon: Users, color: 'text-[var(--accent-primary)]' },
    { label: 'Approvals', href: '/manager/approvals', icon: ClipboardCheck, color: 'text-amber-600' },
    { label: 'Assign Task', href: '/manager/tasks', icon: UserPlus, color: 'text-emerald-600' },
    { label: 'Completion Requests', href: '/manager/tasks?tab=completion-requests', icon: CheckSquare, color: 'text-blue-600' },
    { label: 'EOD Reviews', href: '/manager/eod-reviews', icon: ShieldCheck, color: 'text-purple-600' },
  ],
  employee: [],
  intern: [],
  hr: [],
};

interface DashboardQuickActionsProps {
  role: DashboardRole;
  actions?: DashboardQuickAction[];
}

export function DashboardQuickActions({ role, actions }: DashboardQuickActionsProps) {
  const items = actions ?? quickActionsByRole[role] ?? [];
  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors min-h-[40px]"
          >
            <div
              className={`h-7 w-7 shrink-0 rounded-md bg-[var(--bg-subtle)] flex items-center justify-center ${action.color ?? 'text-[var(--accent-primary)]'}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
