'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { OrganizationTabs, OrganizationTabId } from '@/components/admin/organization/OrganizationTabs';
import { OrganizationDepartmentsTab } from '@/components/admin/organization/OrganizationDepartmentsTab';
import { OrganizationShiftsTab } from '@/components/admin/organization/OrganizationShiftsTab';
import { OrganizationHolidaysTab } from '@/components/admin/organization/OrganizationHolidaysTab';
import { OrganizationAnnouncementsTab } from '@/components/admin/organization/OrganizationAnnouncementsTab';
import { departmentsApi, Department } from '@/lib/api/departments';
import { shiftsApi } from '@/lib/api/shifts';
import { holidaysApi, Holiday } from '@/lib/api/holidays';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import { usersApi } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import { Shift } from '@/types';

type TabState<T> = { data: T; loading: boolean; error: string | null };

const initialTabState = <T,>(): TabState<T> => ({ data: [] as unknown as T, loading: true, error: null });

export default function AdminOrgPage() {
  const [activeTab, setActiveTab] = useState<OrganizationTabId>('departments');
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);

  const [deptState, setDeptState] = useState<TabState<Department[]>>(initialTabState());
  const [shiftState, setShiftState] = useState<TabState<Shift[]>>(initialTabState());
  const [holidayState, setHolidayState] = useState<TabState<Holiday[]>>(initialTabState());
  const [announceState, setAnnounceState] = useState<TabState<Announcement[]>>(initialTabState());

  const loadUsers = useCallback(async () => {
    try {
      const data = await usersApi.getUsers();
      setUsers(data as unknown as Record<string, unknown>[]);
    } catch {
      setUsers([]);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    setDeptState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await departmentsApi.getDepartments();
      setDeptState({ data, loading: false, error: null });
    } catch (e) {
      setDeptState({ data: [], loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadShifts = useCallback(async () => {
    setShiftState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await shiftsApi.getShifts();
      setShiftState({ data, loading: false, error: null });
    } catch (e) {
      setShiftState({ data: [], loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadHolidays = useCallback(async () => {
    setHolidayState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await holidaysApi.getHolidays();
      setHolidayState({ data, loading: false, error: null });
    } catch (e) {
      setHolidayState({ data: [], loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setAnnounceState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await announcementsApi.getAllAnnouncements();
      setAnnounceState({ data, loading: false, error: null });
    } catch (e) {
      setAnnounceState({ data: [], loading: false, error: getErrorMessage(e) });
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadDepartments();
  }, [loadUsers, loadDepartments]);

  useEffect(() => {
    if (activeTab === 'shifts') loadShifts();
    if (activeTab === 'holidays') loadHolidays();
    if (activeTab === 'announcements') loadAnnouncements();
  }, [activeTab, loadShifts, loadHolidays, loadAnnouncements]);

  return (
    <div className="space-y-5 pb-16 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--accent-primary)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Master Configuration</span>
        </div>
        <h1 className="app-page-title">Organization</h1>
        <p className="app-page-subtitle uppercase tracking-wide opacity-70">
          Global Governance & Infrastructure Settings
        </p>
      </div>

      <OrganizationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pt-2">
        {activeTab === 'departments' && (
          <OrganizationDepartmentsTab
            departments={deptState.data}
            users={users}
            loading={deptState.loading}
            error={deptState.error}
            onRefresh={loadDepartments}
          />
        )}
        {activeTab === 'shifts' && (
          <OrganizationShiftsTab
            shifts={shiftState.data}
            users={users}
            loading={shiftState.loading}
            error={shiftState.error}
            onRefresh={loadShifts}
          />
        )}
        {activeTab === 'holidays' && (
          <OrganizationHolidaysTab
            holidays={holidayState.data}
            loading={holidayState.loading}
            error={holidayState.error}
            onRefresh={loadHolidays}
          />
        )}
        {activeTab === 'announcements' && (
          <OrganizationAnnouncementsTab
            announcements={announceState.data}
            users={users}
            loading={announceState.loading}
            error={announceState.error}
            onRefresh={loadAnnouncements}
          />
        )}
      </div>
    </div>
  );
}
