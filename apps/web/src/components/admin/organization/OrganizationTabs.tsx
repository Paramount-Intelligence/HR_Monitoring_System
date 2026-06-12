'use client';

import { cn } from '@/lib/utils';
import { Building, Clock, Calendar, Megaphone } from 'lucide-react';

export type OrganizationTabId = 'departments' | 'shifts' | 'holidays' | 'announcements';

const TABS: { id: OrganizationTabId; label: string; icon: typeof Building }[] = [
  { id: 'departments', label: 'Departments', icon: Building },
  { id: 'shifts', label: 'Work Shifts', icon: Clock },
  { id: 'holidays', label: 'Holidays', icon: Calendar },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
];

interface OrganizationTabsProps {
  activeTab: OrganizationTabId;
  onTabChange: (tab: OrganizationTabId) => void;
}

export function OrganizationTabs({ activeTab, onTabChange }: OrganizationTabsProps) {
  return (
    <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
      <div className="flex flex-nowrap sm:flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-1 min-w-max sm:min-w-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0',
                activeTab === tab.id
                  ? 'bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--border-default)] border-b-[var(--bg-elevated)] -mb-px shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
