import type { ReactNode } from 'react';
import { useAuthStore } from './auth-store';
import { normalizeRole } from './role-utils';
import { EmptyAccessState } from '../components/manage/EmptyAccessState';

interface RoleAccessGuardProps {
  children: ReactNode;
  /** Return true when the current user's role may view this screen. */
  check?: (role: ReturnType<typeof normalizeRole>) => boolean;
  fallback?: ReactNode;
  message?: string;
}

export function RoleAccessGuard({
  children,
  check,
  fallback,
  message,
}: RoleAccessGuardProps) {
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);
  const allowed = check ? check(role) : false;

  if (!allowed) {
    return (
      <>
        {fallback ?? (
          <EmptyAccessState
            title="Access denied"
            message={message ?? 'You do not have access to this section.'}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}
