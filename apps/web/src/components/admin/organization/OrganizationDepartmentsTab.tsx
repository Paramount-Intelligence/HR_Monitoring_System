'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Building, Plus, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { OrganizationTabError } from './OrganizationTabError';
import { departmentsApi, Department } from '@/lib/api/departments';
import { getErrorMessage } from '@/lib/api/client';
import {
  safeArray,
  formatOrgDate,
  formatDepartmentHead,
  countEmployeesInDepartment,
} from '@/lib/admin-organization/utils';
import { cn } from '@/lib/utils';

const deptSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  head_id: z.string().nullable().optional(),
});

const editDeptSchema = deptSchema.extend({ is_active: z.boolean() });

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
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const deptForm = useForm<z.infer<typeof deptSchema>>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: '', description: '', head_id: '' },
  });

  const editForm = useForm<z.infer<typeof editDeptSchema>>({
    resolver: zodResolver(editDeptSchema),
    defaultValues: { name: '', description: '', head_id: '', is_active: true },
  });

  const eligibleHeads = users.filter((u) =>
    ['admin', 'hr_operations', 'manager', 'team_lead'].includes(String(u.role || ''))
  );

  const openEdit = (dept: Department) => {
    setSelectedDept(dept);
    editForm.reset({
      name: dept.name,
      description: dept.description || '',
      head_id: dept.head_id || dept.admin_id || '',
      is_active: dept.is_active,
    });
    setIsEditOpen(true);
  };

  const handleDeptError = (e: unknown) => {
    const msg = getErrorMessage(e);
    if (msg.includes('not eligible') || msg.includes('must be Admin')) {
      toast.error(msg);
    } else {
      toast.error('Unable to save department. Please try again.');
    }
  };

  const onCreate = async (data: z.infer<typeof deptSchema>) => {
    try {
      await departmentsApi.createDepartment({
        name: data.name,
        description: data.description || '',
        head_id: !data.head_id || data.head_id === 'none' ? null : data.head_id,
      });
      toast.success('Department established');
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
      toast.success('Department updated');
      setIsEditOpen(false);
      onRefresh();
    } catch (e) {
      handleDeptError(e);
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

  const HeadSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select onValueChange={onChange} value={value || 'none'}>
      <SelectTrigger className="h-12 rounded-xl bg-[var(--bg-subtle)] border-[var(--border-default)] text-left text-xs">
        <SelectValue placeholder="Select Department Head" />
      </SelectTrigger>
      <SelectContent className="rounded-2xl max-h-[250px]">
        <SelectItem value="none">Not Assigned</SelectItem>
        {eligibleHeads.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--text-muted)]">No eligible heads found.</div>
        ) : (
          eligibleHeads.map((u) => (
            <SelectItem key={String(u.id)} value={String(u.id)}>
              {String(u.full_name)} — {String(u.role || '').replace(/_/g, ' ')}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminMetricCard title="Total Departments" value={depts.length} icon={Building} />
        <AdminMetricCard title="Active Departments" value={activeCount} />
        <AdminMetricCard title="Departments With Head" value={withHead} icon={Users} />
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
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-black">Establish Department</DialogTitle>
              </DialogHeader>
              <Form {...deptForm}>
                <form onSubmit={deptForm.handleSubmit(onCreate)} className="space-y-4 pt-2">
                  <FormField control={deptForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Department Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={deptForm.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={deptForm.control} name="head_id" render={({ field }) => (
                    <FormItem><FormLabel>Department Head</FormLabel><FormControl><HeadSelect value={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full rounded-xl">Create Department</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={6} /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]">
                    <TableHead className="font-bold text-xs">Department Name</TableHead>
                    <TableHead className="font-bold text-xs">Department Head</TableHead>
                    <TableHead className="font-bold text-xs">Employees</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs">Created At</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depts.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-semibold">{dept.name}</TableCell>
                      <TableCell>{formatDepartmentHead(dept as unknown as Record<string, unknown>)}</TableCell>
                      <TableCell>{countEmployeesInDepartment(dept.id, dept.name, users)}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-bold', dept.is_active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-slate-500/15 text-slate-600')}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[var(--text-muted)]">{formatOrgDate(dept.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(dept)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-[var(--accent-primary)]" onClick={() => openEdit(dept)}>
                            <Users className="h-3.5 w-3.5 mr-1" /> Head
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {depts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-12">
                        <EmptyState title="No Departments" description="Create your first department to get started." icon={Building} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Department</DialogTitle>
            <DialogDescription>Modify department configuration and assignments</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4 pt-2">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="head_id" render={({ field }) => (
                <FormItem><FormLabel>Department Head</FormLabel><FormControl><HeadSelect value={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={editForm.control} name="is_active" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl">Save Changes</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
