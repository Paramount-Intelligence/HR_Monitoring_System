export type UserRole =
  | 'admin'
  | 'hr_operations'
  | 'manager'
  | 'team_lead'
  | 'employee'
  | 'intern'
  | 'junior_employee';

export interface TokenUser {
  id: string;
  full_name: string;
  role: UserRole | string;
  department?: string | null;
  designation?: string | null;
  avatar_url?: string | null;
  profile_picture_url?: string | null;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole | string;
  status: string;
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
  created_at?: string;
  updated_at?: string;
}
