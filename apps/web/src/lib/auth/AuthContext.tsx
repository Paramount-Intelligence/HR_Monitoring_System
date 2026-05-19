'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TokenUser } from '@/types';
import apiClient from '@/lib/api/client';

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
    try {
      const response = await apiClient.get<{ permissions: string[] }>('/auth/me/permissions');
      setPermissions(response.data.permissions);
    } catch {
      setPermissions([]);
    }
  };

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
      } catch (e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
      }
    }
    setIsLoading(false);
  }, []);

  // Auth:unauthorized event handler
  useEffect(() => {
    const handleUnauthorized = () => {
      logout(false).then(() => router.push('/login'));
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

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
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Fetch permissions after login
    fetchPermissions().then(() => {
      const stored = localStorage.getItem('permissions');
      // After fetch, navigate
      const dashPath = ROLE_DASHBOARD_MAP[userData.role] || '/employee/dashboard';
      router.push(dashPath);
    });
  };

  const logout = async (redirect = true) => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      setUser(null);
      setPermissions([]);
      if (redirect) {
        router.push('/login');
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
