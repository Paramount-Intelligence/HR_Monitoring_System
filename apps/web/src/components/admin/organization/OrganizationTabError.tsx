'use client';

import { AdminTabError } from '@/components/admin/dashboard/AdminTabError';

interface OrganizationTabErrorProps {
  tabName: string;
  message?: string;
  onRetry?: () => void;
}

export function OrganizationTabError({ tabName, message, onRetry }: OrganizationTabErrorProps) {
  return <AdminTabError tabName={tabName} message={message} onRetry={onRetry} />;
}
