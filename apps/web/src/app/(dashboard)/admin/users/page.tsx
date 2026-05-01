'use client';

import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import { User } from '@/types';
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
  admin: 'bg-violet-100 text-violet-700 border-violet-200',
  hr_operations: 'bg-rose-100 text-rose-700 border-rose-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  team_lead: 'bg-amber-100 text-amber-700 border-amber-200',
  employee: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  intern: 'bg-slate-100 text-slate-600 border-slate-200',
  junior_employee: 'bg-slate-100 text-slate-600 border-slate-200',
};

const userSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  role: z.enum(['admin', 'hr_operations', 'manager', 'team_lead', 'employee', 'intern', 'junior_employee']),
  department: z.string().optional(),
  designation: z.string().optional(),
  manager_id: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
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
      const data = await usersApi.getUsers();
      setUsers(data);
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
      department: '',
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
        department: data.department || undefined,
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
    if (status === 'active') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>;
    if (status === 'suspended') return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Suspended</Badge>;
    if (status === 'invited') return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Invited</Badge>;
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500">Manage accounts, roles, and access for all {users.length} users.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new member to the Paramount Intelligence platform.</DialogDescription>
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
                    <FormItem><FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {/* Show only roles the current user can create */}
                          {currentUser?.role === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                          {['admin', 'hr_operations'].includes(currentUser?.role || '') && <SelectItem value="hr_operations">HR & Operations</SelectItem>}
                          {['admin', 'hr_operations'].includes(currentUser?.role || '') && <SelectItem value="manager">Manager</SelectItem>}
                          {['admin', 'hr_operations'].includes(currentUser?.role || '') && <SelectItem value="team_lead">Team Lead</SelectItem>}
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                          <SelectItem value="junior_employee">Junior Employee</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem><FormLabel>Department</FormLabel><FormControl><Input placeholder="e.g. Engineering" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="designation" render={({ field }) => (
                    <FormItem><FormLabel>Designation</FormLabel><FormControl><Input placeholder="e.g. Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="manager_id" render={({ field }) => (
                    <FormItem><FormLabel>Reporting Manager</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managers.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.full_name} ({ROLE_LABELS[m.role] || m.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700">
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
          className="max-w-sm pl-4"
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.status === 'inactive' ? 'opacity-50' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{user.full_name}</p>
                          {user.designation && <p className="text-xs text-slate-400">{user.designation}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${ROLE_BADGE_COLORS[user.role] || ''}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{user.department || '-'}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-slate-500 text-sm truncate max-w-[130px]">
                        {user.manager_id ? filteredUsers.find(u => u.id === user.manager_id)?.full_name || '...' : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {user.status !== 'active' && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8"
                              onClick={() => handleStatusAction(user.id, 'activate')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
                            </Button>
                          )}
                          {user.status === 'invited' && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                              onClick={() => handleResendInvite(user.id)}
                            >
                              <Mail className="h-4 w-4 mr-1" /> Resend
                            </Button>
                          )}
                          {user.status === 'active' && user.id !== currentUser?.id && (
                            <>
                              <Button
                                variant="ghost" size="sm"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-8"
                                onClick={() => handleStatusAction(user.id, 'suspend')}
                              >
                                <AlertOctagon className="h-4 w-4 mr-1" /> Suspend
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8"
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Invitation Sent
            </DialogTitle>
            <DialogDescription>
              An activation email has been sent to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dev Activation Link</p>
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
              <code className="text-xs text-blue-700 truncate flex-1">
                {origin}/activate?token={lastCreatedToken}
              </code>
              <Button 
                variant="ghost" size="icon" className="h-7 w-7"
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
            <p className="text-[10px] text-slate-400">
              This link is only shown in development mode for easy testing. In production, users will receive this link via email.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsTokenDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="capitalize">{pendingAction?.action} User</DialogTitle>
            <DialogDescription>
              Are you sure you want to {pendingAction?.action === 'activate' ? 'reactivate' : pendingAction?.action} this user? 
              This action will affect their platform access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsConfirmDialogOpen(false)}>Cancel</Button>
            <Button 
              variant={pendingAction?.action === 'activate' ? 'default' : 'destructive'}
              onClick={executeStatusAction}
              className={pendingAction?.action === 'activate' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              Confirm {pendingAction?.action === 'activate' ? 'Reactivation' : pendingAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
