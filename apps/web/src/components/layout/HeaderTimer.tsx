'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Coffee, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { timeLogsApi, TimeLog, TaskTimerSession } from '@/lib/api/timeLogs';
import { attendanceApi, AttendanceBreak } from '@/lib/api/attendance';
import { TaskTimer } from '@/components/tasks/TaskTimer';

export function HeaderTimer() {
  const [activeTimer, setActiveTimer] = useState<TaskTimerSession | null>(null);
  const [activeBreak, setActiveBreak] = useState<AttendanceBreak | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Find active task timer
      const timer = await timeLogsApi.getActiveTimer();
      setActiveTimer(timer);

      // Find active break
      const currentBreak = await attendanceApi.getCurrentBreak();
      setActiveBreak(currentBreak);
    } catch (error) {
      console.error('Failed to fetch header status', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 60 seconds to sync state
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Break Indicator */}
      {activeBreak && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] rounded-full text-[var(--status-warning-text)] animate-pulse shadow-[var(--shadow-soft)]">
          <Coffee className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">On Break</span>
        </div>
      )}

      {/* Task Timer Pill */}
      {activeTimer && (
        <Link 
          href="/employee/tasks"
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 border rounded-full transition-all shadow-[var(--shadow-soft)] group hover:shadow-md",
            activeTimer.status === 'running' 
              ? "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--accent-primary)]/50" 
              : "bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
          )}
        >
          <div className={cn(
            "flex items-center justify-center h-5 w-5 rounded-full text-white group-hover:scale-110 transition-transform shadow-[var(--shadow-soft)]",
            activeTimer.status === 'running' ? "bg-[var(--accent-primary)]" : "bg-[var(--text-muted)]"
          )}>
            {activeTimer.status === 'running' ? <Play className="h-2 w-2 fill-current shrink-0" /> : <Clock className="h-2 w-2 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={cn(
              "text-xs font-bold truncate max-w-[140px] hidden sm:inline-block",
              activeTimer.status === 'running' ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            )}>
              {activeTimer.task_title || 'Active Task'}
            </span>
            {activeTimer.status === 'paused' && (
              <>
                <div className="h-3 w-px bg-[var(--border-default)] hidden sm:block" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 hidden sm:inline-block">
                  {activeTimer.pause_reason === 'attendance_checkout' ? 'Paused after checkout' : 
                   activeTimer.pause_reason === 'break_started' ? 'Paused for break' : 'Paused'}
                </span>
              </>
            )}
            <div className="h-3 w-px bg-[var(--border-default)] hidden sm:block" />
            <TaskTimer 
              startedAt={activeTimer.started_at} 
              lastResumedAt={activeTimer.last_resumed_at}
              accumulatedSeconds={activeTimer.accumulated_seconds}
              status={activeTimer.status}
              className={cn(
                "text-xs font-mono font-black",
                activeTimer.status === 'running' ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"
              )} 
            />
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      )}
    </div>
  );
}
