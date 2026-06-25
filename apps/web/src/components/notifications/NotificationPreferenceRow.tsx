'use client';

import { ReactNode } from 'react';
import { NotificationPreferenceToggle } from './NotificationPreferenceToggle';

interface NotificationPreferenceRowProps {
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function NotificationPreferenceRow({
  label,
  subtitle,
  icon,
  checked,
  onCheckedChange,
  disabled,
}: NotificationPreferenceRowProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      {icon ? (
        <span className="text-[var(--text-muted)] shrink-0">{icon}</span>
      ) : null}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)]">{label}</p>
        {subtitle ? <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p> : null}
      </div>
      <NotificationPreferenceToggle
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
