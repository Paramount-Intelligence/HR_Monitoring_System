'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import { User, Shift } from '@/types';
import { Department, departmentsApi } from '@/lib/api/departments';
import { shiftsApi } from '@/lib/api/shifts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, UserPlus, ShieldOff, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth/AuthContext';
import { FormDescription } from '@/components/ui/form';
import { Mail, Link as LinkIcon, Copy } from 'lucide-react';

const ALL_ROLES = ['admin', 'hr_operations', 'manager', 'team_lead', 'employee', 'intern', 'junior_employee'] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  hr_operations: 'HR & Operations',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
  intern: 'Intern',
  junior_employee: 'Junior Employee',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  hr_operations: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  manager: 'bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border-[var(--accent-secondary)]/30',
  team_lead: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  employee: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  intern: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  junior_employee: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
};

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
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string, action: 'deactivate' | 'activate' | 'suspend' } | null>(null);
  const [origin, setOrigin] = useState('');
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

      toast.success(debugToken ? 'Invitation email triggered' : 'User created successfully');
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
      await (usersApi as any).resendInvitation(id);
      toast.success('Invitation email resent');
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to resend invitation');
    }
  };

  const handleStatusAction = async (id: string, action: 'deactivate' | 'activate' | 'suspend') => {
    setPendingAction({ id, action });
    setIsConfirmDialogOpen(true);
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

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)] hover:bg-[var(--status-success-bg)]">Active</Badge>;
    if (status === 'suspended') return <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)] hover:bg-[var(--status-warning-bg)]">Suspended</Badge>;
    if (status === 'invited') return <Badge className="bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)] hover:bg-[var(--status-info-bg)]">Invited</Badge>;
    return <Badge className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">User Management</h1>
          <p className="text-sm text-[var(--text-secondary)]">Manage accounts, roles, and access for all {users.length} users.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-on-accent)] font-semibold rounded-xl">
              <UserPlus className="mr-2 h-4 w-4" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-premium-lg p-8">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-3xl font-black text-[var(--text-primary)] tracking-tighter">Create New User</DialogTitle>
              <DialogDescription className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-tight">Add a new member to the platform governance structure.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                        <SelectItem value="none" className="text-xs font-bold">None</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id} className="text-xs font-bold">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                  </FormItem>
                )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="shift_id" render={({ field }) => (
                  <FormItem className="space-y-1.5"><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">Work Shift</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                        <SelectItem value="none" className="text-xs font-bold">Default Shift</SelectItem>
                        {shifts.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name} ({s.start_time}-{s.end_time})</SelectItem>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] font-bold"><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl>
                        <SelectContent className="rounded-2xl bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] shadow-premium-lg">
                          <SelectItem value="none" className="text-xs font-bold">None</SelectItem>
                          {managers.map(m => (
                            <SelectItem key={m.id} value={m.id} className="text-xs font-bold">{m.full_name} ({ROLE_LABELS[m.role] || m.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold text-rose-500 uppercase" />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-on-accent)] font-semibold rounded-xl h-11 px-6">
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm pl-4 bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]"
        />
      </div>

      <Card className="app-surface">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] border-[var(--border-default)]">
                    <TableHead className="text-[var(--text-primary)] font-bold">Name</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Email</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Role</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Department</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Work Shift</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Status</TableHead>
                    <TableHead className="text-[var(--text-primary)] font-bold">Manager</TableHead>
                    <TableHead className="text-right text-[var(--text-primary)] font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={`${user.status === 'inactive' ? 'opacity-50' : ''} border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]/50`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{user.full_name}</p>
                          {user.designation && <p className="text-xs text-[var(--text-muted)]">{user.designation}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)]">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs font-semibold ${ROLE_BADGE_COLORS[user.role] || ''}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm">{user.department_name || user.department || '-'}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm">
                        {user.shift_name ? `${user.shift_name} ${user.shift_timing ? `(${user.shift_timing})` : ''}` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-[var(--text-secondary)] text-sm truncate max-w-[130px]">
                        {user.manager_name || (user.manager_id ? filteredUsers.find(u => u.id === user.manager_id)?.full_name : '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)]">
                              View Profile
                            </Button>
                          </Link>
                          {user.status !== 'active' && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-[var(--status-success-text)] hover:text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)]/20 h-8"
                              onClick={() => handleStatusAction(user.id, 'activate')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
                            </Button>
                          )}
                          {user.status === 'invited' && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-[var(--accent-secondary)] hover:text-[var(--accent-secondary)] hover:bg-[var(--bg-subtle)] h-8"
                              onClick={() => handleResendInvite(user.id)}
                            >
                              <Mail className="h-4 w-4 mr-1" /> Resend
                            </Button>
                          )}
                          {user.status === 'active' && user.id !== currentUser?.id && (
                            <>
                              <Button
                                variant="ghost" size="sm"
                                className="text-[var(--status-warning-text)] hover:text-[var(--status-warning-text)] hover:bg-[var(--status-warning-bg)]/20 h-8"
                                onClick={() => handleStatusAction(user.id, 'suspend')}
                              >
                                <AlertOctagon className="h-4 w-4 mr-1" /> Suspend
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="text-[var(--status-danger-text)] hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)]/20 h-8"
                                onClick={() => handleStatusAction(user.id, 'deactivate')}
                              >
                                <ShieldOff className="h-4 w-4 mr-1" /> Deactivate
                              </Button>
                            </>
                          )}
                        </div>
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
          <div className="flex justify-end">
            <Button onClick={() => setIsTokenDialogOpen(false)} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-[var(--text-on-accent)] font-semibold rounded-lg">Done</Button>
          </div>
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
          <DialogFooter className="gap-2 sm:gap-0">
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
    </div>
  );
}
