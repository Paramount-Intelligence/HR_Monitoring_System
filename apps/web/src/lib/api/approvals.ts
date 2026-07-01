import apiClient from './client';

export interface ApprovalCenterItem {
  id: string;
  type: string;
  title: string;
  user_name: string;
  user_email: string;
  department: string | null;
  status: string;
  submitted_at: string | null;
  business_date: string | null;
  description: string;
  action_url: string;
  available_actions?: string[];
}

export interface ApprovalCenterResponse {
  summary: Record<string, number>;
  items: ApprovalCenterItem[];
}

export const approvalsApi = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get<ApprovalCenterResponse>('/approvals', { params });
    return response.data;
  },
};
