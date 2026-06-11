'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { VideoOff } from 'lucide-react';

interface VideoPlaceholderProps {
  label: string;
  initial: string;
  compact?: boolean;
}

export function VideoPlaceholder({ label, initial, compact }: VideoPlaceholderProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-white">
      <Avatar className={compact ? 'h-12 w-12 mb-1 ring-2 ring-white/20' : 'h-24 w-24 mb-3 ring-2 ring-white/25'}>
        <AvatarFallback
          className={cn(
            'font-black bg-slate-700 text-white',
            compact ? 'text-sm' : 'text-3xl'
          )}
        >
          {initial}
        </AvatarFallback>
      </Avatar>
      {!compact && <VideoOff className="h-5 w-5 text-slate-400 mb-1" aria-hidden />}
      <p className={compact ? 'text-[10px] font-semibold text-slate-300' : 'text-sm font-semibold text-slate-300'}>
        {label}
      </p>
    </div>
  );
}
