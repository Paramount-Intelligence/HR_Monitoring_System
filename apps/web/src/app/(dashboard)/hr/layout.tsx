'use client';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['hr_operations']}>
      {children}
    </RoleGuard>
  );
}
