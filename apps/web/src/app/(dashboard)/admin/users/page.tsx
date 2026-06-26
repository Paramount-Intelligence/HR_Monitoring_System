'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { usersApi } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import { User, Shift } from '@/types';
import { Department, departmentsApi } from '@/lib/api/departments';
import { shiftsApi } from '@/lib/api/shifts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, UserPlus, MoreHorizontal, UserCog, Building2, Shield, Mail, ShieldOff, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth/AuthContext';
import { Copy } from 'lucide-react';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { ProfilePictureUpload } from '@/components/user/ProfilePictureUpload';
import { getProfilePictureUrl } from '@/lib/profile-picture';
import { AdminUserControlPanel } from '@/components/admin/users/AdminUserControlPanel';
import { hydratePresenceFromUsers } from '@/lib/presence/hydrate-presence';
import { ALL_ROLES, ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/admin-users/constants';
import { getUserDepartmentDisplay, getUserManagerDisplay, makeDepartmentOptions, makeShiftOptions, makeManagerOptions, resolveOptionLabel } from '@/lib/display-labels';
import { modalFormClass, modalFormFieldClass, modalFormGridClass } from '@/lib/modal-layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const userSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  role: z.enum(['admin', 'hr_operations', 'manager', 'team_lead', 'employee', 'intern', 'junior_employee']),
  department_id: z.string().optional(),
  shift_id: z.string().optional(),
  designation: z.string().optional(),
  manager_id: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastCreatedToken, setLastCreatedToken] = useState<string | null>(null);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [controlPanelUserId, setControlPanelUserId] = useState<string | null>(null);
  const [controlPanelTab, setControlPanelTab] = useState<'profile' | 'access' | 'department' | 'permissions' | 'security' | 'activity' | 'audit'>('profile');
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string, action: 'deactivate' | 'activate' | 'suspend' } | null>(null);
  const [origin, setOrigin] = useState('');
  const [editAvatarUser, setEditAvatarUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const [data, depts, shiftsData] = await Promise.all([
        usersApi.getUsers(),
        departmentsApi.getActiveDepartments().catch(() => []),
        shiftsApi.getShifts(true).catch(() => [])
      ]);
      setUsers(data);
      hydratePresenceFromUsers(data);
      setDepartments(depts);
      setShifts(shiftsData);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const managers = users.filter(u => ['manager', 'admin', 'team_lead', 'hr_operations'].includes(u.role));
  const departmentOptions = makeDepartmentOptions(departments);
  const shiftOptions = makeShiftOptions(shifts);
  const managerOptions = makeManagerOptions(managers, undefined, users);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'employee',
      department_id: 'none',
      shift_id: 'none',
      designation: '',
      manager_id: 'none',
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      const response = await usersApi.createUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password || undefined,
        role: data.role,
        department_id: data.department_id === 'none' ? undefined : data.department_id,
        shift_id: data.shift_id === 'none' ? undefined : data.shift_id,
        designation: data.designation || undefined,
        manager_id: data.manager_id === 'none' ? undefined : data.manager_id,
      } as any);
      
      const createdUser = (response as any).user || response;
      const debugToken = (response as any).debug_token;
      const emailSent = (response as any).invitation_email_sent;

      const isInvite = !data.password;
      if (isInvite) {
        if (emailSent) {
          toast.success('User created and invitation email sent.');
        } else {
          toast.warning('User created, but invitation email could not be sent. Check SMTP configuration or resend invitation.', {
            duration: 6000
          });
        }
      } else {
        toast.success('User created successfully');
      }

      setIsDialogOpen(false);
      form.reset();
      
      if (debugToken && process.env.NODE_ENV === 'development') {
        setLastCreatedToken(debugToken);
        setIsTokenDialogOpen(true);
      }

      await fetchUsers();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to create user');
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const response = await (usersApi as any).resendInvitation(id);
      const emailSent = (response as any).email_sent;
      if (emailSent) {
        toast.success('Invitation email resent successfully');
      } else {
        toast.warning('Invitation could not be sent. Check SMTP configuration.', {
          duration: 6000
        });
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to resend invitation');
    }
  };

  const handleStatusAction = async (id: string, action: 'deactivate' | 'activate' | 'suspend') => {
    setPendingAction({ id, action });
    setIsConfirmDialogOpen(true);
  };

  const handleUploadUserProfilePicture = async (file: File) => {
    if (!editAvatarUser) return;
    try {
      const updated = await usersApi.uploadUserProfilePicture(editAvatarUser.id, file);
      toast.success('Profile picture updated');
      setEditAvatarUser({ ...editAvatarUser, ...updated });
      await fetchUsers();
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error));
    }
  };

  const handleRemoveUserProfilePicture = async () => {
    if (!editAvatarUser) return;
    try {
      const updated = await usersApi.deleteUserProfilePicture(editAvatarUser.id);
      toast.success('Profile picture removed');
      setEditAvatarUser({ ...editAvatarUser, ...updated });
      await fetchUsers();
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error));
    }
  };

  const executeStatusAction = async () => {
    if (!pendingAction) return;
    const { id, action } = pendingAction;
    try {
      if (action === 'deactivate') {
        await usersApi.deactivateUser(id);
      } else if (action === 'activate') {
        await (usersApi as any).activateUser(id);
      } else {
        await (usersApi as any).suspendUser(id);
      }
      toast.success(`User ${action === 'activate' ? 'reactivated' : action + 'ed'} successfully`);
      setIsConfirmDialogOpen(false);
      await fetchUsers();
    } catch (error: any) {
      toast.error(getErrorMessage(error) || `Failed to ${action} user`);
    }
  };

  const openControlPanel = (userId: string, tab: typeof controlPanelTab = 'profile') => {
    setControlPanelUserId(userId);
    setControlPanelTab(tab);
    setControlPanelOpen(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesDept =
      departmentFilter === 'all' ||
      u.department_id === departmentFilter ||
      u.department === departments.find(d => d.id === departmentFilter)?.name;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)] hover:bg-[var(--status-success-bg)]">Active</Badge>;
    if (status === 'suspended') return <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)] hover:bg-[var(--status-warning-bg)]">Suspended</Badge>;
    if (status === 'invited') return <Badge className="bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)] hover:bg-[var(--status-info-bg)]">Invited</Badge>;
    return <Badge className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]">Inactive</Badge>;
  };

  const formatLastActive = (value?: string | null) => {
    if (!value) return '—';
    try {
      const d = parseISO(value);
      if (!isValid(d)) return '—';
      return format(d, 'MMM d, yyyy');
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="app-page-title">User Management</h1>
          <p className="app-page-subtitle">Manage accounts, roles, and access for all {users.length} users.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-on-accent)] font-semibold rounded-xl">
              <UserPlus className="mr-2 h-4 w-4" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-premium-lg">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">Create New User</DialogTitle>
              <DialogDescription className="text-sm text-[var(--text-muted)]">Add a new member to the platform governance structure.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className={modalFormClass}>
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className={modalFormGridClass}>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Password (Optional)</FormLabel>
                      <FormControl><Input type="password" placeholder="Leave empty for email invite" {...field} /></FormControl>
                      <FormDescription className="text-[10px]">If empty, user will receive an activation email.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className={modalFormGridClass}>
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem className="space-y-1.5"><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                        {/* Show only roles the current user can create */}
                        {currentUser?.role === 'admin' && <SelectItem value="admin" className="text-xs font-bold">Admin</SelectItem>}
                        {['admin', 'hr_operations'].includes(currentUser?.role || '') && <SelectItem value="hr_operations" className="text-xs font-bold">HR & Operations</SelectItem>}
                        {['admin', 'hr_operations'].includes(currentUser?.role || '') && <SelectItem value="manager" className="text-xs font-bold">Manager</SelectItem>}
                        {['admin', 'hr_operations'].includes(currentUser?.role || '') && <SelectItem value="team_lead" className="text-xs font-bold">Team Lead</SelectItem>}
                        <SelectItem value="employee" className="text-xs font-bold">Employee</SelectItem>
                        <SelectItem value="intern" className="text-xs font-bold">Intern</SelectItem>
                        <SelectItem value="junior_employee" className="text-xs font-bold">Junior Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="department_id" render={({ field }) => (
                  <FormItem className="space-y-1.5"><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><span className="truncate">{resolveOptionLabel(departmentOptions, field.value, 'Select department')}</span></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                        <SelectItem value="none" className="text-xs font-bold">None</SelectItem>
                        {departmentOptions.map((d) => (
                          <SelectItem key={d.value} value={d.value} className="text-xs font-bold">{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                </div>

                <div className={modalFormGridClass}>
                <FormField control={form.control} name="shift_id" render={({ field }) => (
                  <FormItem className="space-y-1.5"><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Work Shift</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><span className="truncate">{resolveOptionLabel(shiftOptions, field.value, 'Select shift')}</span></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                        <SelectItem value="none" className="text-xs font-bold">Default Shift</SelectItem>
                        {shiftOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-xs font-bold">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                  <FormField control={form.control} name="designation" render={({ field }) => (
                    <FormItem><FormLabel className="text-[var(--text-primary)]">Designation</FormLabel><FormControl><Input placeholder="e.g. Software Engineer" className="bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="manager_id" render={({ field }) => (
                    <FormItem className="space-y-1.5"><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Reporting Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><span className="truncate">{resolveOptionLabel(managerOptions, field.value, 'Select manager')}</span></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                          <SelectItem value="none" className="text-xs font-bold">None</SelectItem>
                          {managerOptions.map((m) => (
                            <SelectItem key={m.value} value={m.value} className="text-xs font-bold">{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>

                </DialogBody>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-on-accent)] font-semibold rounded-xl h-11 px-6">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Input
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm pl-4 bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="app-surface">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] border-[var(--border-default)]">
                    <TableHead className="text-[var(--text-primary)] font-bold min-w-[180px]">Name</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold min-w-[160px]">Email</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Role</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Department</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Manager</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Status</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Last Active</TableHead>
                    <TableHead className="text-right text-[var(--text-primary)] font-bold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className={`${user.status === 'inactive' ? 'opacity-60' : ''} border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/50 cursor-pointer`}
                      onClick={() => openControlPanel(user.id, 'profile')}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <UserProfilePicture user={user} userId={user.id} name={user.full_name} size="sm" showPresence />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">{user.full_name}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{user.designation || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm truncate max-w-[200px]">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs font-semibold ${ROLE_BADGE_COLORS[user.role] || ''}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm">{getUserDepartmentDisplay(user)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm truncate max-w-[140px]">
                        {getUserManagerDisplay(user, users)}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm whitespace-nowrap">
                        {formatLastActive(user.last_login_at || user.updated_at)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => openControlPanel(user.id, 'profile')}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Token Dialog */}
      <Dialog open={isTokenDialogOpen} onOpenChange={setIsTokenDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Mail className="h-5 w-5 text-[var(--accent-secondary)]" />
              Invitation Sent
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              An activation email has been sent to the user.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
          <div className="bg-[var(--bg-subtle)] p-4 rounded-lg border border-[var(--border-subtle)] space-y-3">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Dev Activation Link</p>
            <div className="flex items-center gap-2 bg-[var(--bg-surface)] p-2 rounded border border-[var(--border-default)]">
              <code className="text-xs text-[var(--accent-secondary)] truncate flex-1">
                {origin}/activate?token={lastCreatedToken}
              </code>
              <Button 
                variant="ghost" size="icon" className="h-7 w-7 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${origin}/activate?token=${lastCreatedToken}`);
                    toast.success('Link copied to clipboard');
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              This link is only shown in development mode for easy testing. In production, users will receive this link via email.
            </p>
          </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setIsTokenDialogOpen(false)} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-on-accent)] font-semibold rounded-lg">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="capitalize text-[var(--text-primary)]">{pendingAction?.action} User</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Are you sure you want to {pendingAction?.action === 'activate' ? 'reactivate' : pendingAction?.action} this user? 
              This action will affect their platform access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsConfirmDialogOpen(false)} className="text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]">Cancel</Button>
            <Button 
              onClick={executeStatusAction}
              className={pendingAction?.action === 'activate' 
                ? 'bg-[var(--status-success-bg)] hover:bg-[var(--status-success-bg)]/90 text-[var(--status-success-text)] font-semibold border border-[var(--status-success-border)]' 
                : 'bg-[var(--status-danger-bg)] hover:bg-[var(--status-danger-bg)]/90 text-[var(--status-danger-text)] font-semibold border border-[var(--status-danger-border)]'
              }
            >
              Confirm {pendingAction?.action === 'activate' ? 'Reactivation' : pendingAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminUserControlPanel
        userId={controlPanelUserId}
        open={controlPanelOpen}
        onOpenChange={setControlPanelOpen}
        onUserUpdated={fetchUsers}
        initialTab={controlPanelTab}
        users={users}
        departments={departments}
        shifts={shifts}
        currentUserId={currentUser?.id}
      />

      <Dialog open={!!editAvatarUser} onOpenChange={(open) => !open && setEditAvatarUser(null)}>
        <DialogContent className="sm:max-w-md bg-[var(--bg-elevated)] border-[var(--border-default)]">
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
            <DialogDescription>
              Upload or update the profile picture for {editAvatarUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          {editAvatarUser && (
            <DialogBody>
            <ProfilePictureUpload
              name={editAvatarUser.full_name}
              profilePictureUrl={getProfilePictureUrl(editAvatarUser)}
              onUpload={handleUploadUserProfilePicture}
              onRemove={handleRemoveUserProfilePicture}
            />
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAvatarUser(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
