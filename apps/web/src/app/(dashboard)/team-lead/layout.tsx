'use client';
import { RoleGuard } from '@/components/auth/RoleGuard';

export default function TeamLeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['team_lead']}>
      {children}
    </RoleGuard>
  );
}
