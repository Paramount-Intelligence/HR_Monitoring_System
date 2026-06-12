import { getTeamMembers, getUser, getUsers } from './users.api';
import { getTeamAttendanceSessions } from './manage.api';
import { getTeamReport } from './reports.api';
import type { UsersListParams } from '../types/manage';
import type { ReportQueryParams } from '../types/reports';

export { getTeamMembers, getUsers, getUser };

export async function getTeamRoster(params?: UsersListParams) {
  return getTeamMembers(params);
}

export async function getTeamMemberDetail(userId: string) {
  return getUser(userId);
}

export async function getTeamMemberAttendance(userId: string, params?: { date_from?: string; date_to?: string }) {
  const sessions = await getTeamAttendanceSessions(params);
  return sessions.filter((session) => session.user_id === userId);
}

export async function getTeamMemberReport(userId: string, params: ReportQueryParams) {
  const reports = await getTeamReport(params);
  return reports.find((report) => report.user_id === userId) ?? null;
}