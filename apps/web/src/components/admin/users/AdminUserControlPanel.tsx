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

interface AdminUserControlPanelProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  initialTab?: TabKey;
  users: User[];
  departments: Department[];
  shifts: Shift[];
}

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
}: AdminUserControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

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

  const rolePermissionKeys = useMemo(
    () => new Set(permissions?.role_permissions.map((p) => p.key) ?? []),
    [permissions]
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
      setDepartmentId(data.department_id || 'none');
      setManagerId(data.manager_id || 'none');
      setShiftId(data.shift_id || 'none');
      setReportingDesignation(data.designation || '');
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      loadUser();
    }
  }, [open, userId, initialTab, loadUser]);

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

  const saveDepartment = async () => {
    if (!userId) return;
    setSaving('department');
    try {
      const updated = await usersApi.updateUserDepartment(userId, {
        department_id: departmentId === 'none' ? null : departmentId,
        clear_department: departmentId === 'none',
        designation: reportingDesignation || undefined,
      });
      setUser(updated);
      toast.success('Department updated successfully');
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to update department');
    } finally {
      setSaving(null);
    }
  };

  const saveReporting = async () => {
    if (!userId) return;
    setSaving('reporting');
    try {
      const updated = await usersApi.updateUserReporting(userId, {
        manager_id: managerId === 'none' ? null : managerId,
        shift_id: shiftId === 'none' ? null : shiftId,
        designation: reportingDesignation || undefined,
        update_manager: true,
        update_shift: true,
      });
      setUser(updated);
      toast.success('Reporting line updated successfully');
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to update reporting');
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
    const groups: Record<string, PermissionItem[]> = {};
    for (const item of items) {
      const cat = item.category || 'System';
      groups[cat] = groups[cat] || [];
      if (!groups[cat].some((p) => p.key === item.key)) groups[cat].push(item);
    }
    return groups;
  }, [allPermissionItems, permissions]);

  const pendingHighRisk = Array.from(extraGrants).some((k) => HIGH_RISK_PERMISSIONS.has(k));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto p-0">
          <SheetHeader className="p-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-elevated)] z-10">
            {loading || !user ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading user...</span>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <UserProfilePicture user={user} name={user.full_name} size="lg" />
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">{user.full_name}</SheetTitle>
                  <SheetDescription className="mt-1">{user.email}</SheetDescription>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className={ROLE_BADGE_COLORS[user.role]}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                    <Badge variant="outline">{user.department_name || user.department || 'No department'}</Badge>
                    <Badge variant="outline" className="capitalize">{user.status}</Badge>
                  </div>
                </div>
              </div>
            )}
          </SheetHeader>

          {user && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="p-6 pt-4">
              <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="access">Access & Role</TabsTrigger>
                <TabsTrigger value="department">Department & Reporting</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="audit">Audit History</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
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
                <div className="grid gap-4 sm:grid-cols-2">
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
                <Button onClick={saveProfile} disabled={saving === 'profile'}>
                  {saving === 'profile' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </TabsContent>

              <TabsContent value="access" className="space-y-6">
                <p className="text-sm text-[var(--text-secondary)]">
                  You are changing this user&apos;s access level. This may affect what they can see and do.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={roleValue === user.role}
                    onClick={() => setRoleConfirmOpen(true)}
                  >
                    <UserCog className="mr-2 h-4 w-4" /> Confirm Role Change
                  </Button>
                  <Button
                    variant="outline"
                    disabled={statusValue === user.status}
                    onClick={() => setStatusConfirmOpen(true)}
                  >
                    Update Status
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="department" className="space-y-6">
                <div className="grid gap-4 max-w-lg">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={saveDepartment} disabled={saving === 'department'}>
                    {saving === 'department' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Department
                  </Button>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Reporting Manager</Label>
                    <Select value={managerId} onValueChange={setManagerId}>
                      <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers.filter((m) => m.id !== user.id).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name} — {ROLE_LABELS[m.role]} — {m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Shift</Label>
                    <Select value={shiftId} onValueChange={setShiftId}>
                      <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Default</SelectItem>
                        {shifts.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} — {s.start_time} to {s.end_time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input value={reportingDesignation} onChange={(e) => setReportingDesignation(e.target.value)} />
                  </div>
                  <Button onClick={saveReporting} disabled={saving === 'reporting'}>
                    {saving === 'reporting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Reporting Line
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                {!permissions ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <>
                    <div className="rounded-lg border p-4 bg-[var(--bg-subtle)]">
                      <p className="text-sm font-medium mb-2">Role Permissions (read-only)</p>
                      <div className="flex flex-wrap gap-1">
                        {permissions.role_permissions.map((p) => (
                          <Badge key={p.key} variant="secondary" className="text-xs">{p.label || p.key}</Badge>
                        ))}
                      </div>
                    </div>
                    {Object.entries(permissionGroups).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <p className="text-sm font-semibold capitalize">{category.replace(/_/g, ' ')}</p>
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
                    ))}
                    <Button
                      onClick={() => (pendingHighRisk ? setPermConfirmOpen(true) : savePermissions())}
                      disabled={saving === 'permissions'}
                    >
                      {saving === 'permissions' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Shield className="mr-2 h-4 w-4" /> Save Permission Changes
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="security" className="space-y-4 max-w-md">
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

              <TabsContent value="activity">
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

              <TabsContent value="audit">
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
            </Tabs>
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
