'use client';

import { useEffect, useState } from 'react';
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
    <div className="flex items-center font-mono text-lg font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
      {elapsed}
    </div>
  );
}
