'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Building, Eye, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { OrganizationTabError } from './OrganizationTabError';
import { OrganizationMembersTable } from './OrganizationMembersTable';
import { departmentsApi, Department } from '@/lib/api/departments';
import { organizationMembersApi, OrganizationMember } from '@/lib/api/organizationMembers';
import { getErrorMessage } from '@/lib/api/client';
import { getManagerLabel } from '@/lib/display-labels';
import {
  safeArray,
  formatOrgDate,
  formatDepartmentHead,
  countEmployeesInDepartment,
  resolveHeadLabel,
} from '@/lib/admin-organization/utils';
import { cn } from '@/lib/utils';

const deptSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  head_id: z.string().nullable().optional(),
});

const editDeptSchema = deptSchema.extend({
  is_active: z.boolean(),
});

interface OrganizationDepartmentsTabProps {
  departments: Department[];
  users: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function OrganizationDepartmentsTab({
  departments,
  users,
  loading,
  error,
  onRefresh,
}: OrganizationDepartmentsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [detailMembers, setDetailMembers] = useState<OrganizationMember[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const deptForm = useForm<z.infer<typeof deptSchema>>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: '', description: '', head_id: '' },
  });

  const editForm = useForm<z.infer<typeof editDeptSchema>>({
    resolver: zodResolver(editDeptSchema),
    defaultValues: { name: '', description: '', head_id: '', is_active: true },
  });

  const eligibleHeads = useMemo(
    () =>
      users.filter((u) =>
        ['admin', 'hr_operations', 'manager', 'team_lead'].includes(String(u.role || ''))
      ),
    [users]
  );

  const headOptions = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    eligibleHeads.forEach((u) => map.set(String(u.id), u));
    const currentId = selectedDept?.head_id || selectedDept?.admin_id;
    if (currentId && !map.has(String(currentId))) {
      const current = users.find((u) => String(u.id) === String(currentId));
      if (current) map.set(String(currentId), current);
    }
    return Array.from(map.values());
  }, [eligibleHeads, users, selectedDept]);

  const openDetail = async (dept: Department) => {
    setSelectedDept(dept);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const members = await organizationMembersApi.getDepartmentEmployees(dept.id);
      setDetailMembers(members);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setDetailMembers([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (dept: Department) => {
    setSelectedDept(dept);
    editForm.reset({
      name: dept.name,
      description: dept.description || '',
      head_id: dept.head_id || dept.admin_id || '',
      is_active: dept.is_active ?? true,
    });
    setIsEditOpen(true);
  };

  const handleDeptError = (e: unknown) => {
    toast.error(getErrorMessage(e) || 'Unable to save department. Please try again.');
  };

  const onCreate = async (data: z.infer<typeof deptSchema>) => {
    try {
      await departmentsApi.createDepartment({
        name: data.name,
        description: data.description || '',
        head_id: !data.head_id || data.head_id === 'none' ? null : data.head_id,
      });
      toast.success('Department created successfully.');
      setIsCreateOpen(false);
      deptForm.reset({ name: '', description: '', head_id: '' });
      onRefresh();
    } catch (e) {
      handleDeptError(e);
    }
  };

  const onEdit = async (data: z.infer<typeof editDeptSchema>) => {
    if (!selectedDept) return;
    try {
      await departmentsApi.updateDepartment(selectedDept.id, {
        name: data.name,
        description: data.description || '',
        head_id: !data.head_id || data.head_id === 'none' ? null : data.head_id,
        is_active: data.is_active,
      });
      toast.success('Department updated successfully.');
      setIsEditOpen(false);
      onRefresh();
    } catch (e) {
      handleDeptError(e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await departmentsApi.deactivateDepartment(deleteTarget.id);
      toast.success('Department deactivated.');
      setDeleteTarget(null);
      setIsDetailOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (error) {
    return <OrganizationTabError tabName="Departments" message={error} onRetry={onRefresh} />;
  }

  const depts = safeArray(departments);
  const activeCount = depts.filter((d) => d.is_active).length;
  const withHead = depts.filter((d) => d.head_name || d.admin_name).length;
  const totalEmployees = depts.reduce(
    (sum, d) => sum + countEmployeesInDepartment(d.id, d.name, users),
    0
  );

  const HeadSelect = ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: Record<string, unknown>[];
  }) => {
    const selectedLabel = resolveHeadLabel(
      value && value !== 'none' ? value : null,
      users,
      options.find((u) => String(u.id) === value)?.full_name as string | undefined
    );

    return (
      <Select onValueChange={onChange} value={value || 'none'}>
        <SelectTrigger className="h-11 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] text-left text-sm">
          <SelectValue placeholder="Select Department Head">
            {value && value !== 'none' ? selectedLabel : 'Not Assigned'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl max-h-[250px]">
          <SelectItem value="none">Not Assigned</SelectItem>
          {options.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">No eligible heads found.</div>
          ) : (
            options.map((u) => (
              <SelectItem key={String(u.id)} value={String(u.id)}>
                {getManagerLabel(u as Parameters<typeof getManagerLabel>[0])}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    );
  };

  const StatusSelect = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <Select
      onValueChange={(v) => onChange(v === 'active')}
      value={value ? 'active' : 'inactive'}
    >
      <SelectTrigger className="h-11 rounded-xl">
        <SelectValue>{value ? 'Active' : 'Inactive'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  );

  const DepartmentFormFields = ({
    form,
    headOpts,
    showStatus = false,
  }: {
    form: typeof deptForm | typeof editForm;
    headOpts: Record<string, unknown>[];
    showStatus?: boolean;
  }) => (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department Name</FormLabel>
            <FormControl>
              <Input className="h-11 rounded-xl" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea className="min-h-[96px] resize-none rounded-xl" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="head_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department Head</FormLabel>
            <FormControl>
              <HeadSelect
                value={field.value || ''}
                onChange={field.onChange}
                options={headOpts}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {showStatus && (
        <FormField
          control={editForm.control}
          name="is_active"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <StatusSelect value={Boolean(field.value)} onChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminMetricCard title="Total Departments" value={depts.length} icon={Building} />
        <AdminMetricCard title="Active Departments" value={activeCount} />
        <AdminMetricCard title="Departments With Head" value={withHead} />
        <AdminMetricCard title="Employees Assigned" value={totalEmployees} />
      </div>

      <Card className="border border-[var(--border-default)] bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <CardTitle className="text-lg font-black">Departments</CardTitle>
            <CardDescription className="text-xs">Departments & resource distribution</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs h-10">
                <Plus className="mr-2 h-4 w-4" /> Create Department
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-black">Create Department</DialogTitle>
                <DialogDescription>Add a new department to the organization.</DialogDescription>
              </DialogHeader>
              <Form {...deptForm}>
                <form onSubmit={deptForm.handleSubmit(onCreate)}>
                  <DialogBody>
                    <DepartmentFormFields form={deptForm} headOpts={eligibleHeads} />
                  </DialogBody>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Department</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : depts.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No departments found"
                description="Create your first department."
                icon={Building}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]">
                    <TableHead className="font-bold text-xs">Department Name</TableHead>
                    <TableHead className="font-bold text-xs">Description</TableHead>
                    <TableHead className="font-bold text-xs">Department Head</TableHead>
                    <TableHead className="font-bold text-xs">Employees</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs">Updated</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depts.map((dept) => (
                    <TableRow key={dept.id} className="hover:bg-[var(--bg-subtle)]/40">
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openDetail(dept)}
                          className="font-semibold text-left text-[var(--accent-primary)] hover:underline"
                        >
                          {dept.name}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] max-w-[180px] truncate">
                        {dept.description || '—'}
                      </TableCell>
                      <TableCell>{formatDepartmentHead(dept as unknown as Record<string, unknown>)}</TableCell>
                      <TableCell>{countEmployeesInDepartment(dept.id, dept.name, users)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-[10px] font-bold',
                            dept.is_active
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : 'bg-slate-500/15 text-slate-600'
                          )}
                        >
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-muted)]">
                        {formatOrgDate(dept.updated_at || dept.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openDetail(dept)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(dept)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-rose-600"
                            onClick={() => setDeleteTarget(dept)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">{selectedDept?.name}</DialogTitle>
            <DialogDescription>
              {selectedDept?.description || 'No description provided.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Department Head</p>
                <p className="font-semibold">
                  {selectedDept
                    ? formatDepartmentHead(selectedDept as unknown as Record<string, unknown>)
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
                <p className="font-semibold">{selectedDept?.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Created</p>
                <p className="font-semibold">{formatOrgDate(selectedDept?.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Updated</p>
                <p className="font-semibold">{formatOrgDate(selectedDept?.updated_at)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3">Assigned Employees</p>
              {detailLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-[var(--text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading employees…
                </div>
              ) : (
                <OrganizationMembersTable
                  members={detailMembers}
                  emptyMessage="No employees assigned to this department."
                />
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            {selectedDept && (
              <>
                <Button type="button" variant="outline" onClick={() => openEdit(selectedDept)}>
                  Edit Department
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteTarget(selectedDept)}>
                  Delete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Department</DialogTitle>
            <DialogDescription>Modify department configuration and assignments.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)}>
              <DialogBody>
                <DepartmentFormFields form={editForm} headOpts={headOptions} showStatus />
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate &quot;{deleteTarget?.name}&quot;. Employees must be reassigned first if any are
              still linked to this department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
