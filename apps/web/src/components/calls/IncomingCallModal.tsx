'use client';

import { Phone, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CallModalOverlay } from './CallModalOverlay';

interface IncomingCallModalProps {
  callerName: string;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  callerName,
  callType,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const initial = callerName.charAt(0).toUpperCase();
  const typeLabel = callType === 'video' ? 'video' : 'voice';

  return (
    <CallModalOverlay>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-950 p-8 sm:p-10 text-center shadow-2xl shadow-black/60">
        <div className="relative mx-auto mb-6 h-28 w-28">
          <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" aria-hidden />
          <span className="absolute inset-2 rounded-full bg-emerald-500/10 animate-pulse" aria-hidden />
          <Avatar className="relative h-28 w-28 ring-4 ring-emerald-400/40 shadow-xl">
            <AvatarFallback className="text-4xl font-black bg-gradient-to-br from-blue-600 to-slate-800 text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 mb-2">
          Incoming {typeLabel} call
        </p>
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">{callerName}</h2>
        <p className="text-sm text-slate-400 font-medium mb-8">is calling you…</p>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onDecline}
            aria-label="Decline call"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
          >
            <PhoneOff className="h-5 w-5" />
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            aria-label="Accept call"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
          >
            <Phone className="h-5 w-5" />
            Accept
          </button>
        </div>
      </div>
    </CallModalOverlay>
  );
}
