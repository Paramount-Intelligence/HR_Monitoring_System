'use client';

import { cn } from '@/lib/utils';

export type AdminDashboardTabId = 'overview' | 'users' | 'communication' | 'projects';

const TABS: { id: AdminDashboardTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Management' },
  { id: 'communication', label: 'Communication' },
  { id: 'projects', label: 'Project & Tasks' },
];

interface AdminDashboardTabsProps {
  activeTab: AdminDashboardTabId;
  onTabChange: (tab: AdminDashboardTabId) => void;
}

export function AdminDashboardTabs({ activeTab, onTabChange }: AdminDashboardTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-3 py-2 rounded-t-lg text-[10px] font-bold uppercase tracking-wider transition-all',
            activeTab === tab.id
              ? 'bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--border-default)] border-b-[var(--bg-elevated)] -mb-px shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
