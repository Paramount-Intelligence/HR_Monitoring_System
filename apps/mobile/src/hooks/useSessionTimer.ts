import { useEffect, useState } from 'react';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function useSessionTimer(
  checkInAt: string | null | undefined,
  active: boolean
): string {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!active || !checkInAt) {
      setElapsed('00:00:00');
      return;
    }

    const startMs = new Date(checkInAt).getTime();
    if (Number.isNaN(startMs)) {
      setElapsed('00:00:00');
      return;
    }

    const tick = () => setElapsed(formatElapsed(Date.now() - startMs));
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [active, checkInAt]);

  return elapsed;
}
