import type { SessionStatus, WorkMode } from './attendance';

export interface AttendanceSummary {
  checked_in_today: boolean;
  check_in_at: string | null;
  check_out_at: string | null;
  work_mode: WorkMode | null;
  session_status: SessionStatus | null;
  duration_minutes: number | null;
}

export interface TaskCounts {
  total: number;
  in_progress: number;
  completed: number;
  blocked: number;
  overdue: number;
}

export interface TimerState {
  active: boolean;
  task_id: string | null;
  task_title: string | null;
  started_at: string | null;
  elapsed_minutes: number | null;
}

export interface EmployeeDashboard {
  attendance: AttendanceSummary;
  tasks: TaskCounts;
  timer: TimerState;
  attendance_status: string | null;
  total_time_today: number;
  productive_time_today: number;
  active_timer_task_id: string | null;
  active_timer_task_title: string | null;
  tasks_in_progress: number;
  tasks_due_soon: number;
}
