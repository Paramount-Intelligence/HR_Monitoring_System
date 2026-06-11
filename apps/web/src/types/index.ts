export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: 'admin' | 'hr_operations' | 'manager' | 'team_lead' | 'employee' | 'intern' | 'junior_employee';
  status: 'active' | 'inactive' | 'suspended';
  department?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  designation?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  shift_id?: string | null;
  shift_name?: string | null;
  shift_timing?: string | null;
  avatar_url?: string | null;
  avatar_updated_at?: string | null;
  profile_picture_url?: string | null;
  profile_picture_updated_at?: string | null;
  profile_picture_content_type?: string | null;
  profile_picture_size?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TokenUser {
  id: string;
  full_name: string;
  role: 'admin' | 'hr_operations' | 'manager' | 'team_lead' | 'employee' | 'intern' | 'junior_employee';
  department?: string | null;
  designation?: string | null;
  avatar_url?: string | null;
  profile_picture_url?: string | null;
  profile_picture_updated_at?: string | null;
  avatar_updated_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: TokenUser;
}

export interface ApiError {
  detail: string;
}

export interface AttendanceSession {
  id: string;
  user_id: string;
  check_in_at: string;
  check_out_at?: string;
  work_mode: 'office' | 'wfh' | 'hybrid';
  session_status: 'active' | 'completed' | 'absent';
  correction_requested: boolean;
  correction_reason?: string;
  duration_minutes?: number;
  is_late_login?: boolean;
  is_early_logout?: boolean;
}

export interface Shift {
  id: string;
  name: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  grace_period_minutes: number;
  working_days: string;
  is_active: boolean;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: 'sick' | 'casual' | 'annual' | 'wfh' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  manager_comment?: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  owner_id: string;
  manager_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  approval_status: 'pending' | 'approved' | 'rejected';
  project_status: 'proposed' | 'approved' | 'active' | 'completed' | 'rejected' | 'on_hold';
  progress_percentage: number;
}

export interface Task {
  id: string;
  project_id: string;
  assigned_to: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'created' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  due_date?: string;
  parent_id?: string;
}

