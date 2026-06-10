'use client';

import { Reply, Info, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MessageActionsMenuProps {
  isSelf: boolean;
  canDelete: boolean;
  showDelete: boolean;
  showReply?: boolean;
  onReply: () => void;
  onInfo: () => void;
  onDelete: () => void;
  className?: string;
}

export function MessageActionsMenu({
  isSelf,
  canDelete,
  showDelete,
  showReply = true,
  onReply,
  onInfo,
  onDelete,
  className,
}: MessageActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]',
            'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
            'opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 sm:group-focus-within/message:opacity-100',
            className
          )}
          aria-label="Message actions"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isSelf ? 'end' : 'start'} className="min-w-[10rem]">
        {showReply && (
          <DropdownMenuItem onClick={onReply}>
            <Reply className="h-4 w-4" />
            Reply
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onInfo}>
          <Info className="h-4 w-4" />
          Message info
        </DropdownMenuItem>
        {showDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            disabled={!canDelete}
            className="text-red-600 focus:text-red-600 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
