'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TaskTimerProps {
  startedAt: string;
  lastResumedAt?: string;
  accumulatedSeconds?: number;
  status?: 'running' | 'paused' | 'completed';
  className?: string;
}

export function TaskTimer({ 
  lastResumedAt, 
  accumulatedSeconds = 0, 
  status = 'running',
  className 
}: TaskTimerProps) {
  const [elapsed, setElapsed] = useState<string>('00:00:00');

  useEffect(() => {
    if (status !== 'running' || !lastResumedAt) {
      // If paused, just show accumulated time
      const totalSeconds = accumulatedSeconds;
      const s = Math.floor(totalSeconds % 60);
      const m = Math.floor((totalSeconds / 60) % 60);
      const h = Math.floor(totalSeconds / 3600);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      return;
    }

    const start = new Date(lastResumedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((now - start) / 1000));
      const totalSeconds = accumulatedSeconds + diffInSeconds;
      
      const seconds = Math.floor(totalSeconds % 60);
      const minutes = Math.floor((totalSeconds / 60) % 60);
      const hours = Math.floor(totalSeconds / 3600);
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [lastResumedAt, accumulatedSeconds, status]);

  return <span className={cn("tabular-nums", className)}>{elapsed}</span>;
}
