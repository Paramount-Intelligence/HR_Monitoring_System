'use client';

import {
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComposerFormatAction } from '@/components/messages/RichTextComposer';

export interface ToolbarActiveState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  orderedList: boolean;
  code: boolean;
  link: boolean;
}

const TOOLBAR_ITEMS: Array<{
  action: ComposerFormatAction;
  icon: typeof Bold;
  label: string;
  shortcut?: string;
  isActive?: (state: ToolbarActiveState) => boolean;
}> = [
  { action: 'bold', icon: Bold, label: 'Bold', shortcut: 'Ctrl+B', isActive: s => s.bold },
  { action: 'italic', icon: Italic, label: 'Italic', shortcut: 'Ctrl+I', isActive: s => s.italic },
  { action: 'underline', icon: Underline, label: 'Underline', shortcut: 'Ctrl+U', isActive: s => s.underline },
  { action: 'link', icon: Link2, label: 'Link', isActive: s => s.link },
  { action: 'bulletList', icon: List, label: 'Bullet list', shortcut: 'Ctrl+Shift+8', isActive: s => s.bulletList },
  { action: 'orderedList', icon: ListOrdered, label: 'Numbered list', shortcut: 'Ctrl+Shift+7', isActive: s => s.orderedList },
  { action: 'code', icon: Code, label: 'Inline code', isActive: s => s.code },
];

interface ComposerFormattingToolbarProps {
  disabled?: boolean;
  activeState?: ToolbarActiveState;
  onAction: (action: ComposerFormatAction) => void;
}

export function ComposerFormattingToolbar({
  disabled,
  activeState,
  onAction,
}: ComposerFormattingToolbarProps) {
  const state: ToolbarActiveState = activeState ?? {
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
    code: false,
    link: false,
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar px-2 py-1 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
      {TOOLBAR_ITEMS.map(({ action, icon: Icon, label, shortcut, isActive }) => {
        const active = isActive?.(state) ?? false;
        return (
          <button
            key={action}
            type="button"
            disabled={disabled}
            title={shortcut ? `${label} (${shortcut})` : label}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onAction(action)}
            className={cn(
              'shrink-0 p-1.5 rounded transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
              active
                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]',
              disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** @deprecated Markdown insertion helpers — kept for legacy tests only. */
export type FormatAction = ComposerFormatAction;
