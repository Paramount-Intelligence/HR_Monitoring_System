'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const userRole = user?.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
  const isAuthorized = userRole && normalizedAllowedRoles.includes(userRole);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        console.warn('[RoleGuard] Not authenticated, redirecting to login');
        router.push('/login');
      } else if (!isAuthorized) {
        console.error(`[RoleGuard] Unauthorized access attempt by ${user?.email} (${user?.role}). Allowed: ${allowedRoles.join(', ')}`);
        router.push('/unauthorized');
      }
    }
  }, [isLoading, isAuthenticated, isAuthorized, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center -mt-20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-medium">Verifying Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
