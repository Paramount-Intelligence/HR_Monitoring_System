'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, DashboardAlertCard } from '@/lib/api/dashboard';
import { cn } from '@/lib/utils';
import {
  dashboardActionCardMeta,
  DashboardRole,
  getDashboardRoleConfig,
  normalizeDashboardCardKey,
  uniqueCards,
} from '@/lib/dashboard/dashboard-card-config';

interface CompactActionCenterProps {
  role: DashboardRole;
}

export function CompactActionCenter({ role }: CompactActionCenterProps) {
  const [cards, setCards] = useState<DashboardAlertCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .getAlertCards()
      .then((data) => setCards(data.cards))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  const roleConfig = getDashboardRoleConfig(role);
  const roleMeta = dashboardActionCardMeta[role];

  const urgentChips = useMemo(() => {
    return uniqueCards(
      cards
        .map((card) => {
          const key = normalizeDashboardCardKey(card.key, role);
          const meta = roleMeta[key];
          if (!meta || !roleConfig.actionCards.includes(key)) return null;
          return {
            ...card,
            key,
            chipLabel: meta.chipLabel,
            href: meta.href,
          };
        })
        .filter((card): card is DashboardAlertCard & { chipLabel: string } => Boolean(card)),
    )
      .filter((card) => card.count > 0)
      .sort((a, b) => roleConfig.actionCards.indexOf(a.key) - roleConfig.actionCards.indexOf(b.key));
  }, [cards, role, roleConfig.actionCards, roleMeta]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Action Center</p>
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-28 shrink-0 rounded-full bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Action Center</p>
      {urgentChips.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No urgent actions right now.</p>
      ) : (
        <div className="flex flex-wrap gap-2 max-w-full">
          {urgentChips.map((chip) => {
            const isHigh = chip.severity === 'high' && chip.count > 0;
            return (
              <Link
                key={chip.key}
                href={chip.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors shrink-0',
                  isHigh
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
                )}
              >
                <span>{chip.chipLabel}</span>
                <span className="tabular-nums font-bold">{chip.count}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
