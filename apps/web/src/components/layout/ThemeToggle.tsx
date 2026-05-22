'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Avoid hydration mismatch — render nothing until client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  function toggle() {
    setTheme(isDark ? 'light' : 'dark');
  }

  // Stable placeholder prevents layout shift during SSR/hydration
  if (!mounted) {
    return (
      <button
        disabled
        aria-label="Toggle theme"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          'border border-[var(--border-default)]',
          'bg-[var(--bg-surface)]',
          'opacity-0 cursor-default'
        )}
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'group relative flex h-9 w-9 items-center justify-center rounded-xl',
        'border border-[var(--border-default)]',
        'bg-[var(--bg-surface)]',
        'text-[var(--text-secondary)]',
        'transition-all duration-200',
        'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]/30',
        'hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-1',
        'active:scale-95'
      )}
    >
      {isDark ? (
        <Sun
          className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
