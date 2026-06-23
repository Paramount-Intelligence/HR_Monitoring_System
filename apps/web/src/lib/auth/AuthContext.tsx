'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TokenUser } from '@/types';
import apiClient from '@/lib/api/client';
import {
  AUTH_EXPIRED_EVENT,
  canFetchProtectedData,
  clearStoredAuth,
  isSessionExpired,
  resetSessionState,
} from '@/lib/auth/session';

// Roles that map to a dashboard path
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  admin: '/admin/dashboard',
  hr_operations: '/hr/dashboard',
  manager: '/manager/dashboard',
  team_lead: '/team-lead/dashboard',
  employee: '/employee/dashboard',
  intern: '/employee/dashboard',          // Intern shares employee dashboard
  junior_employee: '/employee/dashboard', // Junior Employee shares employee dashboard
};

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/activate'];

interface AuthContextType {
  user: TokenUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (access_token: string, refresh_token: string, user: TokenUser) => void;
  logout: (redirect?: boolean) => Promise<void>;
  hasPermission: (key: string) => boolean;
  getDashboardPath: () => string;
  updateUser: (userData: Partial<TokenUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TokenUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const getDashboardPath = useCallback(() => {
    if (!user) return '/login';
    return ROLE_DASHBOARD_MAP[user.role] || '/employee/dashboard';
  }, [user]);

  const hasPermission = useCallback((key: string): boolean => {
    return permissions.includes(key);
  }, [permissions]);

  const fetchPermissions = async () => {
    if (!canFetchProtectedData()) return;
    try {
      const response = await apiClient.get<{ permissions: string[] }>('/auth/me/permissions');
      setPermissions(response.data.permissions);
      localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
    } catch {
      setPermissions([]);
    }
  };

  const authExpiryHandledRef = useRef(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    const storedUserStr = localStorage.getItem('user');
    const storedPerms = localStorage.getItem('permissions');

    if (storedToken && storedUserStr) {
      try {
        const parsedUser = JSON.parse(storedUserStr) as TokenUser;
        setUser(parsedUser);
        if (storedPerms) {
          setPermissions(JSON.parse(storedPerms));
        } else {
          fetchPermissions();
        }
      } catch {
        clearStoredAuth();
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      if (authExpiryHandledRef.current) return;
      authExpiryHandledRef.current = true;
      setUser(null);
      setPermissions([]);
      router.replace('/login');
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [router]);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
      if (!user && !isPublicRoute) {
        router.push('/login');
      } else if (user && pathname === '/') {
        router.push(getDashboardPath());
      } else if (user && isPublicRoute) {
        router.push(getDashboardPath());
      }
    }
  }, [user, isLoading, pathname, router, getDashboardPath]);

  const login = (access_token: string, refresh_token: string, userData: TokenUser) => {
    resetSessionState();
    authExpiryHandledRef.current = false;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    fetchPermissions().then(() => {
      const dashPath = ROLE_DASHBOARD_MAP[userData.role] || '/employee/dashboard';
      router.push(dashPath);
    });
  };

  const logout = async (redirect = true) => {
    try {
      if (!isSessionExpired()) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          await apiClient.post('/auth/logout', { refresh_token: refreshToken });
        }
      }
    } catch {
      // ignore
    } finally {
      clearStoredAuth();
      setUser(null);
      setPermissions([]);
      authExpiryHandledRef.current = redirect;
      if (redirect) {
        router.replace('/login');
      }
    }
  };

  const updateUser = useCallback((userData: Partial<TokenUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      permissions,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasPermission,
      getDashboardPath,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
