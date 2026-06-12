'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { usersApi } from '@/lib/api/users';
import { permissionsApi, PermissionItem, UserPermissionsDetail } from '@/lib/api/permissions';
import { getErrorMessage } from '@/lib/api/client';
import { User, Shift } from '@/types';
import { Department } from '@/lib/api/departments';
import {
  ALL_ROLES,
  HIGH_RISK_PERMISSIONS,
  ROLE_BADGE_COLORS,
  ROLE_LABELS,
  STATUS_OPTIONS,
} from '@/lib/admin-users/constants';
import {
  buildDepartmentOptions,
  buildManagerOptions,
  buildShiftOptions,
  getDepartmentTabState,
  isDepartmentTabDirty,
} from '@/lib/admin-users/department-form';
import { getProfilePictureUrl } from '@/lib/profile-picture';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { ProfilePictureUpload } from '@/components/user/ProfilePictureUpload';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type TabKey =
  | 'profile'
  | 'access'
  | 'department'
  | 'permissions'
  | 'security'
  | 'activity'
  | 'audit';

/** Right drawer width — overrides Sheet default `sm:max-w-sm` (384px) */
const MANAGE_USER_DRAWER_CLASS =
  'p-0 flex flex-col h-full overflow-hidden bg-[var(--bg-elevated)] border-[var(--border-subtle)] ' +
  'max-sm:w-full max-sm:max-w-none ' +
  'data-[side=right]:!w-[min(880px,100vw)] data-[side=right]:!max-w-[min(880px,100vw)]';

const DRAWER_PAD_X = 'px-6 sm:px-8';
const DRAWER_SECTION_Y = 'py-5 sm:py-6';

interface AdminUserControlPanelProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  initialTab?: TabKey;
  users: User[];
  departments: Department[];
  shifts: Shift[];
  currentUserId?: string | null;
}

const PERMISSION_MODULE_ORDER = [
  'users',
  'attendance',
  'tasks',
  'projects',
  'eod',
  'reports',
  'messages',
  'settings',
  'organization',
  'system',
];

const PERMISSION_MODULE_LABELS: Record<string, string> = {
  users: 'Users',
  attendance: 'Attendance',
  tasks: 'Tasks',
  projects: 'Projects',
  eod: 'EOD',
  reports: 'Reports',
  messages: 'Messages',
  settings: 'Settings',
  organization: 'Organization',
  system: 'System',
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'MMM d, yyyy h:mm a');
  } catch {
    return value;
  }
}

function formatJson(value: unknown) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function AdminUserControlPanel({
  userId,
  open,
  onOpenChange,
  onUserUpdated,
  initialTab = 'profile',
  users,
  departments,
  shifts,
  currentUserId,
}: AdminUserControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');

  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '', designation: '' });
  const [roleValue, setRoleValue] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [departmentId, setDepartmentId] = useState('none');
  const [managerId, setManagerId] = useState('none');
  const [shiftId, setShiftId] = useState('none');
  const [reportingDesignation, setReportingDesignation] = useState('');

  const [permissions, setPermissions] = useState<UserPermissionsDetail | null>(null);
  const [extraGrants, setExtraGrants] = useState<Set<string>>(new Set());
  const [extraDenies, setExtraDenies] = useState<Set<string>>(new Set());
  const [allPermissionItems, setAllPermissionItems] = useState<PermissionItem[]>([]);

  const [summary, setSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [permConfirmOpen, setPermConfirmOpen] = useState(false);
  const [securityLoading, setSecurityLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const managers = useMemo(
    () => users.filter((u) => ['manager', 'admin', 'team_lead', 'hr_operations'].includes(u.role) && u.status === 'active'),
    [users]
  );

  const departmentOptions = useMemo(
    () => buildDepartmentOptions(user, departments),
    [user, departments]
  );

  const shiftOptions = useMemo(
    () => buildShiftOptions(user, shifts),
    [user, shifts]
  );

  const managerOptions = useMemo(
    () => buildManagerOptions(user, managers.filter((m) => m.id !== user?.id)),
    [user, managers]
  );

  const departmentTabDirty = useMemo(() => {
    if (!user) return false;
    return isDepartmentTabDirty(user, departments, {
      departmentId,
      shiftId,
      managerId,
      designation: reportingDesignation,
    });
  }, [user, departments, departmentId, shiftId, managerId, reportingDesignation]);

  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'admin' && u.status === 'active').length,
    [users]
  );

  const roleChangeDisabledReason = useMemo(() => {
    if (!user) return 'User not loaded';
    if (roleValue === user.role) return 'No change selected';
    if (user.id === currentUserId) return 'Cannot change your own role';
    if (user.role === 'admin' && roleValue !== 'admin' && adminCount <= 1) {
      return 'Cannot remove the last admin';
    }
    return null;
  }, [user, roleValue, currentUserId, adminCount]);

  const statusChangeDisabledReason = useMemo(() => {
    if (!user) return 'User not loaded';
    if (statusValue === user.status) return 'No change selected';
    if (user.id === currentUserId && statusValue !== 'active') {
      return 'Cannot deactivate your own account';
    }
    if (user.role === 'admin' && statusValue !== 'active' && adminCount <= 1) {
      return 'Cannot deactivate the last admin';
    }
    return null;
  }, [user, statusValue, currentUserId, adminCount]);

  const rolePermissionKeys = useMemo(
    () => new Set(permissions?.role_permissions.map((p) => p.key) ?? []),
    [permissions]
  );

  const applyDepartmentTabState = useCallback(
    (data: User) => {
      const next = getDepartmentTabState(data, departments);
      setDepartmentId(next.departmentId);
      setManagerId(next.managerId);
      setShiftId(next.shiftId);
      setReportingDesignation(next.designation);
    },
    [departments]
  );

  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await usersApi.getUser(userId);
      setUser(data);
      setProfileForm({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        designation: data.designation || '',
      });
      setRoleValue(data.role);
      setStatusValue(data.status);
      applyDepartmentTabState(data);
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId, applyDepartmentTabState]);

  const loadPermissions = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await permissionsApi.getUserPermissions(userId);
      setPermissions(data);
      setExtraGrants(new Set(data.extra_permissions.map((p) => p.key)));
      setExtraDenies(new Set(data.denied_permissions.map((p) => p.key)));
      const catalog = await permissionsApi.listPermissions().catch(() => []);
      setAllPermissionItems(
        catalog.map((p) => ({
          key: p.key,
          label: p.description || p.key,
          category: p.key.split('.')[0],
          description: p.description || '',
        }))
      );
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to load permissions');
    }
  }, [userId]);

  const loadSummary = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await usersApi.getUserAdminSummary(userId);
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, [userId]);

  const loadAudit = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await usersApi.getUserAuditLogs(userId);
      setAuditLogs(data);
    } catch {
      setAuditLogs([]);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      setActiveTab(initialTab);
      setPermissionSearch('');
      loadUser();
      void loadSummary();
    }
  }, [open, userId, initialTab, loadUser, loadSummary]);

  useEffect(() => {
    if (!open || !userId) return;
    if (activeTab === 'permissions') loadPermissions();
    if (activeTab === 'activity' || activeTab === 'security') loadSummary();
    if (activeTab === 'audit') loadAudit();
  }, [open, userId, activeTab, loadPermissions, loadSummary, loadAudit]);

  const refreshAll = async () => {
    await loadUser();
    onUserUpdated();
    if (activeTab === 'permissions') await loadPermissions();
    if (activeTab === 'activity') await loadSummary();
    if (activeTab === 'audit') await loadAudit();
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSaving('profile');
    try {
      const updated = await usersApi.updateUserAdminProfile(userId, {
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone || null,
        designation: profileForm.designation || undefined,
      });
      setUser(updated);
      toast.success('Profile updated successfully');
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to update profile');
    } finally {
      setSaving(null);
    }
  };

  const confirmRoleChange = async () => {
    if (!userId || !user) return;
    setSaving('role');
    try {
      const updated = await usersApi.updateUserRole(userId, roleValue);
      setUser(updated);
      toast.success('User role updated successfully');
      setRoleConfirmOpen(false);
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to change role');
    } finally {
      setSaving(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!userId) return;
    setSaving('status');
    try {
      const updated = await usersApi.updateUserStatus(userId, statusValue);
      setUser(updated);
      toast.success('User status updated successfully');
      setStatusConfirmOpen(false);
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to change status');
    } finally {
      setSaving(null);
    }
  };

  const saveDepartmentAndReporting = async () => {
    if (!userId) return;
    setSaving('department');
    try {
      const updated = await usersApi.updateUserDepartmentDetails(userId, {
        department_id: departmentId === 'none' ? null : departmentId,
        shift_id: shiftId === 'none' ? null : shiftId,
        manager_id: managerId === 'none' ? null : managerId,
        designation: reportingDesignation.trim() || null,
      });
      setUser(updated);
      applyDepartmentTabState(updated);
      toast.success('Department and reporting details updated.');
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Unable to update department details. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const savePermissions = async () => {
    if (!userId) return;
    setSaving('permissions');
    try {
      await permissionsApi.updateUserPermissions(userId, {
        extra_grants: Array.from(extraGrants),
        extra_denies: Array.from(extraDenies),
      });
      toast.success('Permission changes saved');
      setPermConfirmOpen(false);
      await loadPermissions();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to save permissions');
    } finally {
      setSaving(null);
    }
  };

  const handlePermissionToggle = (key: string, type: 'grant' | 'deny', checked: boolean) => {
    if (rolePermissionKeys.has(key)) return;
    setExtraGrants((prev) => {
      const next = new Set(prev);
      if (type === 'grant') {
        if (checked) {
          next.add(key);
          setExtraDenies((d) => {
            const nd = new Set(d);
            nd.delete(key);
            return nd;
          });
        } else {
          next.delete(key);
        }
      }
      return next;
    });
    if (type === 'deny') {
      setExtraDenies((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(key);
          setExtraGrants((g) => {
            const ng = new Set(g);
            ng.delete(key);
            return ng;
          });
        } else {
          next.delete(key);
        }
        return next;
      });
    }
  };

  const runSecurityAction = async (action: 'reset' | 'invite' | 'force') => {
    if (!userId) return;
    setSecurityLoading(action);
    try {
      let result;
      if (action === 'reset') result = await usersApi.sendPasswordReset(userId);
      else if (action === 'invite') result = await usersApi.resendInvitation(userId);
      else result = await usersApi.forcePasswordReset(userId);

      if (result.email_sent) toast.success(result.message);
      else toast.warning(result.message);
      await loadAudit();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Security action failed');
    } finally {
      setSecurityLoading(null);
    }
  };

  const permissionGroups = useMemo(() => {
    const items = allPermissionItems.length
      ? allPermissionItems
      : permissions?.role_permissions ?? [];
    const query = permissionSearch.trim().toLowerCase();
    const groups: Record<string, PermissionItem[]> = {};
    for (const item of items) {
      if (query && !item.key.toLowerCase().includes(query) && !(item.label || '').toLowerCase().includes(query)) {
        continue;
      }
      const cat = (item.category || 'system').toLowerCase();
      groups[cat] = groups[cat] || [];
      if (!groups[cat].some((p) => p.key === item.key)) groups[cat].push(item);
    }
    return groups;
  }, [allPermissionItems, permissions, permissionSearch]);

  const sortedPermissionGroupEntries = useMemo(() => {
    return Object.entries(permissionGroups).sort(([a], [b]) => {
      const ai = PERMISSION_MODULE_ORDER.indexOf(a);
      const bi = PERMISSION_MODULE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [permissionGroups]);

  const pendingHighRisk = Array.from(extraGrants).some((k) => HIGH_RISK_PERMISSIONS.has(k));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className={MANAGE_USER_DRAWER_CLASS}
        >
          <div className={`shrink-0 border-b border-[var(--border-subtle)] ${DRAWER_PAD_X} ${DRAWER_SECTION_Y}`}>
            <SheetHeader className="space-y-1.5 text-left p-0 pr-10">
              <SheetTitle className="text-xl font-bold">Manage User</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                Update profile, access, role, permissions, and security settings
              </SheetDescription>
            </SheetHeader>
          </div>

          {loading || !user ? (
            <div className="flex flex-1 items-center justify-center gap-3 py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">Loading user...</span>
            </div>
          ) : (
            <>
              <div className={`shrink-0 ${DRAWER_PAD_X} ${DRAWER_SECTION_Y} border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40`}>
                <div className="flex items-start gap-5 min-w-0">
                  <UserProfilePicture user={user} name={user.full_name} size="lg" className="shrink-0" />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-[var(--text-primary)] truncate">{user.full_name}</p>
                      <p className="text-sm text-[var(--text-secondary)] truncate">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <Badge variant="outline" className={ROLE_BADGE_COLORS[user.role]}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      <Badge variant="outline">{user.department_name || user.department || 'No department'}</Badge>
                      <Badge variant="outline" className="capitalize">{user.status}</Badge>
                    </div>
                    {user.designation && (
                      <p className="text-xs text-[var(--text-muted)]">{user.designation}</p>
                    )}
                    {summary?.last_login && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Last active: {formatDateTime(summary.last_login)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as TabKey)}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className={`shrink-0 border-b border-[var(--border-subtle)] ${DRAWER_PAD_X} overflow-x-auto`}>
                  <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap justify-start gap-1.5 rounded-none bg-transparent p-0 py-3">
                    <TabsTrigger value="profile" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Profile</TabsTrigger>
                    <TabsTrigger value="access" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Access</TabsTrigger>
                    <TabsTrigger value="department" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Department</TabsTrigger>
                    <TabsTrigger value="permissions" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Permissions</TabsTrigger>
                    <TabsTrigger value="security" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Security</TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Activity</TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs sm:text-sm whitespace-nowrap px-3.5 py-2">Audit</TabsTrigger>
                  </TabsList>
                </div>

                <div className={`flex-1 overflow-y-auto overflow-x-hidden ${DRAWER_PAD_X} py-6 sm:py-7`}>
              <TabsContent value="profile" className="space-y-7 mt-0">
                <ProfilePictureUpload
                  name={user.full_name}
                  profilePictureUrl={getProfilePictureUrl(user)}
                  onUpload={async (file) => {
                    const updated = await usersApi.uploadUserProfilePicture(user.id, file);
                    setUser(updated);
                    toast.success('Profile picture updated');
                    onUserUpdated();
                  }}
                  onRemove={async () => {
                    const updated = await usersApi.deleteUserProfilePicture(user.id);
                    setUser(updated);
                    toast.success('Profile picture removed');
                    onUserUpdated();
                  }}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input value={profileForm.designation} onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))} />
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-4 pt-1">
                  <Button onClick={saveProfile} disabled={saving === 'profile'} className="min-w-[140px]">
                  {saving === 'profile' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="access" className="space-y-6 mt-0">
                <p className="text-sm text-[var(--text-secondary)]">
                  Manage role, account status, and invitation state for this user.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={roleValue} onValueChange={setRoleValue}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusValue} onValueChange={setStatusValue}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] p-5 space-y-2.5 text-sm bg-[var(--bg-subtle)]/30 sm:grid sm:grid-cols-2 sm:gap-x-6">
                  <p><span className="text-[var(--text-muted)]">Invitation:</span> <span className="capitalize">{user.status === 'invited' ? 'Pending setup' : 'Completed'}</span></p>
                  <p><span className="text-[var(--text-muted)]">Last login:</span> {formatDateTime(summary?.last_login)}</p>
                  <p><span className="text-[var(--text-muted)]">Created:</span> {formatDateTime(user.created_at)}</p>
                </div>
                <div className="flex flex-col lg:flex-row flex-wrap items-start gap-4 lg:gap-6">
                  <div className="space-y-1">
                    <Button
                      variant="outline"
                      disabled={!!roleChangeDisabledReason}
                      onClick={() => setRoleConfirmOpen(true)}
                    >
                      <UserCog className="mr-2 h-4 w-4" /> Confirm Role Change
                    </Button>
                    {roleChangeDisabledReason && (
                      <p className="text-xs text-[var(--text-muted)]">{roleChangeDisabledReason}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Button
                      variant="outline"
                      disabled={!!statusChangeDisabledReason}
                      onClick={() => setStatusConfirmOpen(true)}
                    >
                      Confirm Status Change
                    </Button>
                    {statusChangeDisabledReason && (
                      <p className="text-xs text-[var(--text-muted)]">{statusChangeDisabledReason}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  {user.status === 'invited' ? (
                    <Button onClick={() => runSecurityAction('invite')} disabled={!!securityLoading}>
                      {securityLoading === 'invite' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Resend Invitation
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => runSecurityAction('reset')} disabled={!!securityLoading}>
                    {securityLoading === 'reset' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Password Reset
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="department" className="space-y-6 mt-0">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departmentOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Shift</Label>
                    <Select value={shiftId} onValueChange={setShiftId}>
                      <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {shiftOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{s.start_time && s.end_time ? ` — ${s.start_time} to ${s.end_time}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2 pt-2 border-t border-[var(--border-subtle)]">
                    <Label>Reporting Manager</Label>
                    <Select value={managerId} onValueChange={setManagerId}>
                      <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managerOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name}{m.designation ? ` — ${m.designation}` : ''}{m.email ? ` — ${m.email}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Designation</Label>
                    <Input value={reportingDesignation} onChange={(e) => setReportingDesignation(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-3 sm:col-span-2 pt-1">
                    <Button
                      onClick={saveDepartmentAndReporting}
                      disabled={saving === 'department' || !departmentTabDirty}
                    >
                      {saving === 'department' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Department & Reporting
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-0">
                {!permissions ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <>
                    <Input
                      placeholder="Search permissions..."
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                    />
                    <div className="rounded-lg border p-4 bg-[var(--bg-subtle)]/40">
                      <p className="text-sm font-medium mb-2">Effective permissions from role</p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {permissions.role_permissions.map((p) => (
                          <Badge key={p.key} variant="secondary" className="text-xs">{p.label || p.key}</Badge>
                        ))}
                      </div>
                    </div>
                    {sortedPermissionGroupEntries.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] py-6 text-center">No permissions match your search.</p>
                    ) : (
                      sortedPermissionGroupEntries.map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <p className="text-sm font-semibold">
                          {PERMISSION_MODULE_LABELS[category] || category.replace(/_/g, ' ')}
                        </p>
                        <div className="space-y-2">
                          {items.map((p) => {
                            const inherited = rolePermissionKeys.has(p.key);
                            const granted = extraGrants.has(p.key);
                            const denied = extraDenies.has(p.key);
                            return (
                              <div key={p.key} className="flex items-start gap-3 rounded-lg border p-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{p.label || p.key}</p>
                                  <p className="text-xs text-[var(--text-muted)]">{p.description || p.key}</p>
                                </div>
                                {inherited ? (
                                  <Badge variant="outline" className="text-xs">From role</Badge>
                                ) : (
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        className="rounded"
                                        checked={granted}
                                        onChange={(e) => handlePermissionToggle(p.key, 'grant', e.target.checked)}
                                      />
                                      Grant
                                    </label>
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        className="rounded"
                                        checked={denied}
                                        onChange={(e) => handlePermissionToggle(p.key, 'deny', e.target.checked)}
                                      />
                                      Deny
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                    )}
                    <div className="sticky bottom-0 pt-4 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] -mx-6 px-6 sm:-mx-8 sm:px-8 pb-1 flex flex-wrap gap-3">
                    <Button
                      onClick={() => (pendingHighRisk ? setPermConfirmOpen(true) : savePermissions())}
                      disabled={saving === 'permissions'}
                    >
                      {saving === 'permissions' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Shield className="mr-2 h-4 w-4" /> Save Permission Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!permissions) return;
                        setExtraGrants(new Set());
                        setExtraDenies(new Set());
                      }}
                    >
                      Reset to Role Defaults
                    </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-5 mt-0">
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <p>Account created: {formatDateTime(user.created_at)}</p>
                  {summary?.last_login && <p>Last login: {formatDateTime(summary.last_login)}</p>}
                </div>
                {user.status === 'invited' ? (
                  <Button
                    onClick={() => runSecurityAction('invite')}
                    disabled={!!securityLoading}
                  >
                    {securityLoading === 'invite' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend Setup Link
                  </Button>
                ) : (
                  <Button
                    onClick={() => runSecurityAction('reset')}
                    disabled={!!securityLoading}
                  >
                    {securityLoading === 'reset' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Password Reset Link
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => runSecurityAction('force')}
                  disabled={!!securityLoading}
                >
                  {securityLoading === 'force' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Force Password Reset on Next Login
                </Button>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                {!summary ? (
                  <p className="text-sm text-[var(--text-muted)] py-8 text-center">No data available.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { label: 'Check-ins (30d)', value: summary.attendance?.check_ins_30d },
                      { label: 'Worked Hours (30d)', value: summary.attendance?.total_worked_hours },
                      { label: 'Tasks Assigned', value: summary.tasks?.assigned },
                      { label: 'Tasks Completed', value: summary.tasks?.completed },
                      { label: 'Active Tasks', value: summary.tasks?.active },
                      { label: 'Overdue Tasks', value: summary.tasks?.overdue },
                      { label: 'Logged Hours (30d)', value: summary.time_logs?.logged_hours_30d },
                      { label: 'EOD Rate', value: summary.eod?.completion_rate_pct != null ? `${summary.eod.completion_rate_pct}%` : '—' },
                      { label: 'Leave Requests (30d)', value: summary.leave?.requests_30d },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border p-4">
                        <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                        <p className="text-2xl font-semibold mt-1">{item.value ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
                {summary?.projects?.recent?.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-2">Recent Projects</p>
                    <ul className="text-sm space-y-1">
                      {summary.projects.recent.map((p: { id: string; name: string }) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit" className="mt-0">
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-8 text-center">No audit history found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date/Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Changed By</TableHead>
                          <TableHead>Old</TableHead>
                          <TableHead>New</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                            <TableCell className="text-xs">{log.action_type}</TableCell>
                            <TableCell className="text-xs">{log.actor_name || log.actor_user_id}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{formatJson(log.old_value)}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{formatJson(log.new_value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={roleConfirmOpen} onOpenChange={setRoleConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              You are changing {user?.full_name} from {ROLE_LABELS[user?.role || '']} to {ROLE_LABELS[roleValue]}.
              This will update their access permissions immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmRoleChange} disabled={saving === 'role'}>
              {saving === 'role' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Role Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Change {user?.full_name}&apos;s account status to {statusValue}?
              {statusValue === 'inactive' && ' You cannot remove the last administrator.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmStatusChange} disabled={saving === 'status'}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permConfirmOpen} onOpenChange={setPermConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm High-Risk Permissions</DialogTitle>
            <DialogDescription>
              You are granting elevated permissions (role/permission management). Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermConfirmOpen(false)}>Cancel</Button>
            <Button onClick={savePermissions} disabled={saving === 'permissions'}>Confirm & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
