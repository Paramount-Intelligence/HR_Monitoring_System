'use client';

import { PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CallModalOverlay } from './CallModalOverlay';

interface OutgoingCallModalProps {
  recipientName: string;
  callType: 'voice' | 'video';
  onCancel: () => void;
}

export function OutgoingCallModal({ recipientName, callType, onCancel }: OutgoingCallModalProps) {
  const initial = recipientName.charAt(0).toUpperCase();
  const typeLabel = callType === 'video' ? 'Video call' : 'Voice call';

  return (
    <CallModalOverlay>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-950 p-8 sm:p-10 text-center shadow-2xl shadow-black/60">
        <div className="relative mx-auto mb-6 h-28 w-28">
          <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" aria-hidden />
          <Avatar className="relative h-28 w-28 ring-4 ring-blue-400/30 shadow-xl">
            <AvatarFallback className="text-4xl font-black bg-gradient-to-br from-blue-600 to-slate-800 text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 mb-2">Calling…</p>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">{recipientName}</h2>
        <p className="text-sm text-slate-400 font-medium mb-8">{typeLabel}</p>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel call"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
        >
          <PhoneOff className="h-5 w-5" />
          Cancel Call
        </button>
      </div>
    </CallModalOverlay>
  );
}
