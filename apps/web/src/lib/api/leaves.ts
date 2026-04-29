import api from '@/lib/api/client';

export type LeaveType = 'sick' | 'casual' | 'annual' | 'half_day' | 'wfh';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'cancelled' | 'needs_clarification';
export type HalfDayPeriod = 'first_half' | 'second_half';
export type ApprovalAction = 'created' | 'clarified' | 'approved' | 'rejected' | 'escalated' | 'cancelled';

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  status: LeaveStatus;
  is_half_day: boolean;
  half_day_period: HalfDayPeriod | null;
  reason: string;
  manager_comment: string | null;
  current_approver_id: string | null;
  escalated_from_id: string | null;
  escalated_at: string | null;
  escalation_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalTimelineEntry {
  id: string;
  actor_id: string;
  action: ApprovalAction;
  comment: string | null;
  created_at: string;
}

export interface LeaveRequestCreate {
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
  is_half_day?: boolean;
  half_day_period?: HalfDayPeriod | null;
}

export interface LeaveRequestResolve {
  action: ApprovalAction;
  manager_comment?: string;
}

export const leavesApi = {
  submitRequest: async (payload: LeaveRequestCreate) => {
    const { data } = await api.post<LeaveRequest>('/leaves', payload);
    return data;
  },

  getMyRequests: async () => {
    const { data } = await api.get<LeaveRequest[]>('/leaves/me');
    return data;
  },

  getPendingQueue: async () => {
    const { data } = await api.get<LeaveRequest[]>('/leaves/pending');
    return data;
  },

  resolveRequest: async (id: string, payload: LeaveRequestResolve) => {
    const { data } = await api.patch<LeaveRequest>(`/leaves/${id}/resolve`, payload);
    return data;
  },

  cancelRequest: async (id: string) => {
    const { data } = await api.post<LeaveRequest>(`/leaves/${id}/cancel`);
    return data;
  },

  getTimeline: async (id: string) => {
    const { data } = await api.get<ApprovalTimelineEntry[]>(`/leaves/${id}/timeline`);
    return data;
  }
};
