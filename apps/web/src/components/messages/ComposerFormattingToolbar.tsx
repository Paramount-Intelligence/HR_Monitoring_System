'use client';

import { Bold, Italic, Underline, Link2, List, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormatAction } from '@/components/messages/composer-formatting';

const TOOLBAR_ITEMS: Array<{ action: FormatAction; icon: typeof Bold; label: string }> = [
  { action: 'bold', icon: Bold, label: 'Bold' },
  { action: 'italic', icon: Italic, label: 'Italic' },
  { action: 'underline', icon: Underline, label: 'Underline' },
  { action: 'link', icon: Link2, label: 'Link' },
  { action: 'list', icon: List, label: 'Bullet list' },
  { action: 'code', icon: Code, label: 'Inline code' },
];

interface ComposerFormattingToolbarProps {
  disabled?: boolean;
  onAction: (action: FormatAction) => void;
}

export function ComposerFormattingToolbar({ disabled, onAction }: ComposerFormattingToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar px-2 py-1 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
      {TOOLBAR_ITEMS.map(({ action, icon: Icon, label }) => (
        <button
          key={action}
          type="button"
          disabled={disabled}
          title={label}
          aria-label={label}
          onMouseDown={event => event.preventDefault()}
          onClick={() => onAction(action)}
          className={cn(
            'shrink-0 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
