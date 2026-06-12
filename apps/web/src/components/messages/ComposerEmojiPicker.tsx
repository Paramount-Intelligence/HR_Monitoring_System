'use client';

import { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😊', '😂',
  '👍', '👏', '🙌', '❤️', '🔥', '✅',
  '🎯', '🚀', '👀', '🙏',
];

interface ComposerEmojiPickerProps {
  disabled?: boolean;
  onSelect: (emoji: string) => void;
}

export function ComposerEmojiPicker({ disabled, onSelect }: ComposerEmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'h-7 w-7 rounded-md',
          open && 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
        )}
        disabled={disabled}
        title="Emoji"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(prev => !prev)}
      >
        <Smile className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-50 mb-1.5 w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 shadow-lg"
          role="menu"
        >
          <div className="grid grid-cols-6 gap-0.5">
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                role="menuitem"
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-[var(--bg-subtle)] transition-colors"
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
