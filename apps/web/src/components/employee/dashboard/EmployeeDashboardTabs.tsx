'use client';

import { cn } from '@/lib/utils';

export type EmployeeDashboardTabId = 'overview' | 'work' | 'attendance' | 'productivity';

const TABS: { id: EmployeeDashboardTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'work', label: 'Work & Tasks' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'productivity', label: 'Productivity' },
];

interface EmployeeDashboardTabsProps {
  activeTab: EmployeeDashboardTabId;
  onTabChange: (tab: EmployeeDashboardTabId) => void;
}

export function EmployeeDashboardTabs({ activeTab, onTabChange }: EmployeeDashboardTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] pb-1 scrollbar-hide">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'shrink-0 px-3 py-2 rounded-t-lg text-[10px] font-bold uppercase tracking-wider transition-all',
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
