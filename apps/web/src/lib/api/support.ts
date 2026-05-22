import apiClient from './client';
import { UserMinimal } from './meetings';

export interface SupportTicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  author: UserMinimal;
  message: string;
  is_internal: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: number;
  created_by_id: string;
  created_by: UserMinimal;
  assigned_to_id: string | null;
  assigned_to: UserMinimal | null;
  subject: string;
  category: 'account_access' | 'attendance' | 'tasks' | 'leave_wfh' | 'payroll_hr' | 'technical_issue' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  comments: SupportTicketComment[];
}

export interface SupportTicketCreateInput {
  subject: string;
  category: 'account_access' | 'attendance' | 'tasks' | 'leave_wfh' | 'payroll_hr' | 'technical_issue' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
}

export interface SupportTicketUpdateInput {
  status?: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_id?: string | null; // UUID string
}

export interface SupportTicketCommentCreateInput {
  message: string;
  is_internal?: boolean;
}

export const supportApi = {
  getTickets: async (): Promise<SupportTicket[]> => {
    const response = await apiClient.get<SupportTicket[]>('/support/tickets');
    return response.data;
  },

  createTicket: async (payload: SupportTicketCreateInput): Promise<SupportTicket> => {
    const response = await apiClient.post<SupportTicket>('/support/tickets', payload);
    return response.data;
  },

  getTicket: async (ticketId: string): Promise<SupportTicket> => {
    const response = await apiClient.get<SupportTicket>(`/support/tickets/${ticketId}`);
    return response.data;
  },

  updateTicket: async (ticketId: string, payload: SupportTicketUpdateInput): Promise<SupportTicket> => {
    const response = await apiClient.patch<SupportTicket>(`/support/tickets/${ticketId}`, payload);
    return response.data;
  },

  addComment: async (ticketId: string, payload: SupportTicketCommentCreateInput): Promise<SupportTicket> => {
    const response = await apiClient.post<SupportTicket>(`/support/tickets/${ticketId}/comments`, payload);
    return response.data;
  },
};
