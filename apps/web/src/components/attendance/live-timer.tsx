'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { differenceInSeconds, parseISO } from 'date-fns';

interface LiveTimerProps {
  checkInAt: string;
}

export function LiveTimer({ checkInAt }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState<string>('00h 00m 00s');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const start = parseISO(checkInAt);
      const totalSeconds = Math.max(0, differenceInSeconds(now, start));

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
      setElapsed(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [checkInAt]);

  return (
    <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-xl border border-blue-100 shadow-sm">
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 animate-pulse">
        <Clock className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
          Session Duration
        </div>
        <div className="text-xl font-mono font-black text-slate-800 tabular-nums leading-none">
          {elapsed}
        </div>
      </div>
    </div>
  );
}
