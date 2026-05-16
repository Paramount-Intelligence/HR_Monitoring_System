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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full text-amber-600 animate-pulse shadow-sm">
          <Coffee className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-[0.1em]">On Break</span>
        </div>
      )}

      {/* Task Timer Pill */}
      {activeTimer && (
        <Link 
          href="/employee/tasks"
          className={cn(
            "flex items-center gap-2.5 px-3 py-1.5 border rounded-full transition-all shadow-sm group hover:shadow-md",
            activeTimer.status === 'running' 
              ? "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-white hover:border-indigo-200" 
              : "bg-slate-100/50 border-slate-200 text-slate-400 hover:bg-slate-50"
          )}
        >
          <div className={cn(
            "flex items-center justify-center h-5 w-5 rounded-full text-white group-hover:scale-110 transition-transform shadow-lg",
            activeTimer.status === 'running' ? "bg-indigo-600 shadow-indigo-100" : "bg-slate-400 shadow-slate-100"
          )}>
            {activeTimer.status === 'running' ? <Play className="h-2 w-2 fill-current" /> : <Clock className="h-2 w-2" />}
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={cn(
              "text-xs font-bold truncate max-w-[140px]",
              activeTimer.status === 'running' ? "text-slate-700" : "text-slate-500"
            )}>
              {activeTimer.task_title || 'Active Task'}
            </span>
            <div className="h-3 w-px bg-slate-200" />
            <TaskTimer 
              startedAt={activeTimer.started_at} 
              lastResumedAt={activeTimer.last_resumed_at}
              accumulatedSeconds={activeTimer.accumulated_seconds}
              status={activeTimer.status}
              className={cn(
                "text-xs font-mono font-black",
                activeTimer.status === 'running' ? "text-indigo-600" : "text-slate-400"
              )} 
            />
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
        </Link>
      )}
    </div>
  );
}
