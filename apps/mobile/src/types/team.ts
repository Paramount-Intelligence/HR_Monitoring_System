import type { User } from './user';

export interface TeamMember extends User {
  checked_in_today?: boolean;
  work_mode?: 'office' | 'wfh' | null;
  check_in_at?: string | null;
}

export interface TeamListParams {
  search?: string;
  status?: string;
  role?: string;
}
