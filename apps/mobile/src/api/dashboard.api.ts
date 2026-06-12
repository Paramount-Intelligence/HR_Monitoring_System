import { apiClient } from './client';
import type { EmployeeDashboard } from '../types/dashboard';
import type { AdminDashboardSummary, ManagerDashboardSummary, ManagerOverviewDashboard } from '../types/manage';

export async function getDashboardSummary(): Promise<EmployeeDashboard> {
  const { data } = await apiClient.get<EmployeeDashboard>('/dashboard/employee');
  return data;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } = await apiClient.get<AdminDashboardSummary>('/dashboard/admin');
  return data;
}

export async function getManagerDashboardSummary(): Promise<ManagerDashboardSummary> {
  const { data } = await apiClient.get<ManagerDashboardSummary>('/dashboard/manager');
  return data;
}

export async function getManagerOverview(): Promise<ManagerOverviewDashboard> {
  const { data } = await apiClient.get<ManagerOverviewDashboard>('/dashboard/manager/overview');
  return data;
}

export async function getAdminAnalytics(): Promise<AdminDashboardSummary> {
  const { data } = await apiClient.get<AdminDashboardSummary>('/dashboard/admin/analytics');
  return data;
}