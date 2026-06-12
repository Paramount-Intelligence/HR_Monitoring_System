import { apiClient } from './client';
import type {
  AdminAnalyticsDashboard,
  AnalyticsPerformer,
  AnalyticsWorkload,
  ManagerApprovalsAnalytics,
  ManagerTeamAnalytics,
  ReportQueryParams,
  ReportSummary,
} from '../types/reports';

export async function getEmployeeReport(params: ReportQueryParams): Promise<ReportSummary> {
  const { data } = await apiClient.get<ReportSummary>('/reports/employee', { params });
  return data;
}

export async function getTeamReport(params: ReportQueryParams): Promise<ReportSummary[]> {
  const { data } = await apiClient.get<ReportSummary[]>('/reports/manager', { params });
  return data;
}

export async function getWorkforceReport(params: ReportQueryParams): Promise<ReportSummary[]> {
  const { data } = await apiClient.get<ReportSummary[]>('/reports/hr', { params });
  return data;
}

export async function getAdminWorkforceReport(params: ReportQueryParams): Promise<ReportSummary[]> {
  const { data } = await apiClient.get<ReportSummary[]>('/reports/admin', { params });
  return data;
}

export async function getAdminAnalytics(): Promise<AdminAnalyticsDashboard> {
  const { data } = await apiClient.get<AdminAnalyticsDashboard>('/dashboard/admin/analytics');
  return data;
}

export async function getManagerTeamAnalytics(): Promise<ManagerTeamAnalytics> {
  const { data } = await apiClient.get<ManagerTeamAnalytics>('/dashboard/manager/team-analytics');
  return data;
}

export async function getManagerApprovalsAnalytics(): Promise<ManagerApprovalsAnalytics> {
  const { data } = await apiClient.get<ManagerApprovalsAnalytics>(
    '/dashboard/manager/approvals-analytics'
  );
  return data;
}

export async function getBestPerformers(): Promise<AnalyticsPerformer[]> {
  const { data } = await apiClient.get<AnalyticsPerformer[]>('/analytics/best-performers');
  return data;
}

export async function getWorkloadBalance(): Promise<AnalyticsWorkload[]> {
  const { data } = await apiClient.get<AnalyticsWorkload[]>('/analytics/workload-balance');
  return data;
}
