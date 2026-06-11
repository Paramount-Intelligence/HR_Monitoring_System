'use client';

import { PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CallModalOverlay } from './CallModalOverlay';

interface CallEndedModalProps {
  participantName: string;
  callType: 'voice' | 'video';
}

export function CallEndedModal({ participantName, callType }: CallEndedModalProps) {
  const initial = participantName.charAt(0).toUpperCase();

  return (
    <CallModalOverlay>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-950 p-8 sm:p-10 text-center shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700/50 ring-2 ring-white/10">
          <PhoneOff className="h-9 w-9 text-slate-300" aria-hidden />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Call ended</p>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="font-bold bg-slate-700 text-white">{initial}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-black text-white">{participantName}</h2>
        </div>
        <p className="text-sm text-slate-400 capitalize">{callType} call</p>
      </div>
    </CallModalOverlay>
  );
}
