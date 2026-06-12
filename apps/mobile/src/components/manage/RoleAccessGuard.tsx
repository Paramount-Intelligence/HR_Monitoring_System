import type { ReactNode } from 'react';
import { RoleAccessGuard as BaseRoleAccessGuard } from '../../auth/RoleAccessGuard';
import { canAccessManage } from '../../auth/role-utils';

interface ManageRoleAccessGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Manage-tab guard — requires admin, HR, manager, or team lead. */
export function RoleAccessGuard({ children, fallback }: ManageRoleAccessGuardProps) {
  return (
    <BaseRoleAccessGuard check={canAccessManage} fallback={fallback}>
      {children}
    </BaseRoleAccessGuard>
  );
}

export { BaseRoleAccessGuard as RoleAccessGuardWithCheck };
