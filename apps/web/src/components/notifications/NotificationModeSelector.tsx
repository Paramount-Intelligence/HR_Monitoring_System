'use client';

import type { BannerMode } from '@/lib/notifications/notification-preferences';

export const BANNER_MODE_LABELS: Record<BannerMode, string> = {
  always: 'Always',
  app_open: 'Only when app is open',
  never: 'Never',
};

const MODES: BannerMode[] = ['always', 'app_open', 'never'];

interface NotificationModeSelectorProps {
  id: string;
  label: string;
  description?: string;
  value: BannerMode;
  onChange: (mode: BannerMode) => void;
}

export function NotificationModeSelector({
  id,
  label,
  description,
  value,
  onChange,
}: NotificationModeSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-bold text-[var(--text-primary)]">
          {label}
        </label>
        {description ? (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        ) : (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{BANNER_MODE_LABELS[value]}</p>
        )}
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as BannerMode)}
        className="min-w-[200px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
      >
        {MODES.map((mode) => (
          <option key={mode} value={mode}>
            {BANNER_MODE_LABELS[mode]}
          </option>
        ))}
      </select>
    </div>
  );
}
