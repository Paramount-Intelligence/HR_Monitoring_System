'use client';

import { displayEodTextField } from '@/lib/eod/eod-review';

interface ReadOnlyEodTextBlockProps {
  title: string;
  value: string | null | undefined;
  emptyText: string;
}

export function ReadOnlyEodTextBlock({ title, value, emptyText }: ReadOnlyEodTextBlockProps) {
  const text = displayEodTextField(value, emptyText);
  const isEmpty = text === emptyText;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
        {title}
      </p>
      <div
        className={`rounded-xl border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isEmpty
            ? 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 text-[var(--text-muted)] italic'
            : 'border-[var(--border-default)] bg-white text-[var(--text-primary)]'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
