'use client';

import { useEffect, useState } from 'react';
import { Coffee, Clock } from 'lucide-react';

interface BreakTimerProps {
  startedAt: string;
  breakType: string;
}

export function BreakTimer({ startedAt, breakType }: BreakTimerProps) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setElapsed(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  const getBreakLabel = (type: string) => {
    switch (type) {
      case 'dinner': return 'Dinner Break';
      case 'prayer': return 'Prayer Break';
      default: return 'Short Break';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-orange-50 border border-orange-100 rounded-lg p-3 w-full">
      <div className="flex items-center gap-3 flex-1">
        <div className="bg-orange-100 p-2 rounded-full">
          <Coffee className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-orange-800 uppercase tracking-wider">{getBreakLabel(breakType)}</div>
          <div className="text-lg font-mono font-bold text-orange-900 leading-none mt-0.5">
            {elapsed}
          </div>
        </div>
      </div>
      <div className="text-[10px] font-bold text-orange-700 bg-orange-200/50 px-2 py-0.5 rounded flex items-center gap-1">
        <Clock className="h-3 w-3" />
        PAID BREAK
      </div>
    </div>
  );
}
