import apiClient from './client';

export type TimerSessionStatus = 'running' | 'paused' | 'completed';
export type TimerPauseReason = 'manual_pause' | 'attendance_checkout' | 'system' | 'break_started';

export interface TaskTimerSession {
  id: string;
  task_id: string;
  task_title?: string;
  project_title?: string;
  user_id: string;
  status: TimerSessionStatus;
  started_at: string;
  last_resumed_at: string;
  paused_at: string | null;
  accumulated_seconds: number;
  pause_reason: TimerPauseReason | null;
  created_at: string;
  updated_at: string;
}

export interface TimeLog {
  id: string;
  task_id: string;
  task_title?: string;
  user_id: string;
  user_name?: string;
  project_title?: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  source_type: 'timer' | 'manual';
  notes: string | null;
  status: 'active' | 'completed' | 'invalid';
  created_at: string;
  updated_at: string;
}

export const timeLogsApi = {
  getMyLogs: async () => {
    const response = await apiClient.get<TimeLog[]>('/time-logs/me');
    return response.data;
  },

  getTeamLogs: async () => {
    const response = await apiClient.get<TimeLog[]>('/time-logs/team');
    return response.data;
  },

  getActiveTimer: async () => {
    const response = await apiClient.get<TaskTimerSession | null>('/time-logs/active-timer');
    return response.data;
  },

  startTimer: async (taskId: string) => {
    const response = await apiClient.post<TaskTimerSession>('/time-logs/start', { task_id: taskId });
    return response.data;
  },

  pauseTimer: async (taskId: string) => {
    const response = await apiClient.post<TaskTimerSession>('/time-logs/pause', { task_id: taskId });
    return response.data;
  },

  resumeTimer: async (taskId: string) => {
    const response = await apiClient.post<TaskTimerSession>('/time-logs/resume', { task_id: taskId });
    return response.data;
  },

  stopTimer: async (taskId: string, notes?: string) => {
    const response = await apiClient.post<TimeLog>('/time-logs/stop', { task_id: taskId, notes });
    return response.data;
  },

  createManualLog: async (data: { task_id: string; started_at: string; ended_at: string; notes?: string }) => {
    const response = await apiClient.post<TimeLog>('/time-logs/manual', data);
    return response.data;
  }
};
