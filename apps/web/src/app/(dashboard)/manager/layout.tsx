'use client';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['manager', 'admin', 'hr_operations', 'team_lead']}>
      {children}
    </RoleGuard>
  );
}
