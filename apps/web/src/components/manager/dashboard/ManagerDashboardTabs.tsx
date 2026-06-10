'use client';

import { cn } from '@/lib/utils';
import { ManagerDashboardTabId } from '@/lib/manager-dashboard/types';

const TABS: { id: ManagerDashboardTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'team', label: 'Team' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'projects', label: 'Projects & Tasks' },
  { id: 'eod', label: 'EOD & Reports' },
];

interface ManagerDashboardTabsProps {
  activeTab: ManagerDashboardTabId;
  onTabChange: (tab: ManagerDashboardTabId) => void;
}

export function ManagerDashboardTabs({ activeTab, onTabChange }: ManagerDashboardTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-1 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-3 py-2 rounded-t-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap',
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
