'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Clock, Plus, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { OrganizationTabError } from './OrganizationTabError';
import { OrganizationMembersTable } from './OrganizationMembersTable';
import { shiftsApi } from '@/lib/api/shifts';
import { organizationMembersApi, OrganizationMember } from '@/lib/api/organizationMembers';
import { getErrorMessage } from '@/lib/api/client';
import { Shift } from '@/types';
import {
  safeArray,
  formatShiftTime,
  formatWorkingDays,
  isOvernightShift,
  countEmployeesInShift,
} from '@/lib/admin-organization/utils';
import { cn } from '@/lib/utils';

const shiftSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  grace_period_minutes: z.string().min(0),
  working_days: z.string().min(1),
  timezone: z.string().min(1),
});

const editShiftSchema = shiftSchema.extend({
  is_active: z.boolean(),
});

interface OrganizationShiftsTabProps {
  shifts: Shift[];
  users: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function OrganizationShiftsTab({ shifts, users, loading, error, onRefresh }: OrganizationShiftsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [detailMembers, setDetailMembers] = useState<OrganizationMember[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const createForm = useForm<z.infer<typeof shiftSchema>>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      start_time: '',
      end_time: '',
      grace_period_minutes: '15',
      working_days: '1,2,3,4,5',
      timezone: 'Asia/Karachi',
    },
  });

  const editForm = useForm<z.infer<typeof editShiftSchema>>({
    resolver: zodResolver(editShiftSchema),
    defaultValues: {
      name: '',
      start_time: '',
      end_time: '',
      grace_period_minutes: '15',
      working_days: '1,2,3,4,5',
      timezone: 'Asia/Karachi',
      is_active: true,
    },
  });

  const openDetail = async (shift: Shift) => {
    setSelectedShift(shift);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const members = await organizationMembersApi.getShiftEmployees(shift.id);
      setDetailMembers(members);
    } catch (e) {
      toast.error(getErrorMessage(e));
      setDetailMembers([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (shift: Shift) => {
    setSelectedShift(shift);
    editForm.reset({
      name: shift.name,
      start_time: shift.start_time?.slice(0, 5) || '',
      end_time: shift.end_time?.slice(0, 5) || '',
      grace_period_minutes: String(shift.grace_period_minutes ?? 15),
      working_days: shift.working_days || '1,2,3,4,5',
      timezone: shift.timezone || 'Asia/Karachi',
      is_active: shift.is_active ?? true,
    });
    setIsEditOpen(true);
  };

  const buildPayload = (data: z.infer<typeof shiftSchema>, isActive = true) => ({
    name: data.name,
    start_time: data.start_time,
    end_time: data.end_time,
    grace_period_minutes: Number(data.grace_period_minutes),
    working_days: data.working_days,
    timezone: data.timezone,
    is_active: isActive,
  });

  const onCreate = async (data: z.infer<typeof shiftSchema>) => {
    try {
      await shiftsApi.createShift(buildPayload(data, true) as Omit<Shift, 'id'>);
      toast.success('Work shift configured.');
      setIsCreateOpen(false);
      createForm.reset();
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onEdit = async (data: z.infer<typeof editShiftSchema>) => {
    if (!selectedShift) return;
    try {
      await shiftsApi.updateShift(selectedShift.id, buildPayload(data, data.is_active));
      toast.success('Shift updated successfully.');
      setIsEditOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await shiftsApi.deactivateShift(deleteTarget.id);
      toast.success('Shift deactivated.');
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
    return <OrganizationTabError tabName="Work Shifts" message={error} onRetry={onRefresh} />;
  }

  const list = safeArray(shifts);
  const activeCount = list.filter((s) => s.is_active).length;
  const overnightCount = list.filter((s) => isOvernightShift(s.start_time, s.end_time)).length;
  const defaultShift = list.find(
    (s) => s.name.toLowerCase().includes('standard') || s.name.toLowerCase().includes('default')
  );

  const StatusSelect = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <Select onValueChange={(v) => onChange(v === 'active')} value={value ? 'active' : 'inactive'}>
      <SelectTrigger className="h-11 rounded-xl">
        <SelectValue>{value ? 'Active' : 'Inactive'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  );

  const ShiftFormFields = ({
    form,
    showStatus = false,
  }: {
    form: typeof createForm | typeof editForm;
    showStatus?: boolean;
  }) => (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Shift Name</FormLabel>
            <FormControl>
              <Input className="h-11 rounded-xl" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="time" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Time</FormLabel>
              <FormControl>
                <Input type="time" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="grace_period_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grace Period (mins)</FormLabel>
              <FormControl>
                <Input type="number" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="working_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Working Days</FormLabel>
              <FormControl>
                <Input placeholder="1,2,3,4,5" className="h-11 rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="timezone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timezone</FormLabel>
            <FormControl>
              <Input className="h-11 rounded-xl" {...field} />
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
        <AdminMetricCard title="Total Shifts" value={list.length} icon={Clock} />
        <AdminMetricCard title="Active Shifts" value={activeCount} />
        <AdminMetricCard title="Default Shift" value={defaultShift?.name || '—'} />
        <AdminMetricCard title="Overnight Shifts" value={overnightCount} />
      </div>

      <Card className="border border-[var(--border-default)] bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <CardTitle className="text-lg font-black">Work Shifts</CardTitle>
            <CardDescription className="text-xs">Timing & attendance governance</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs h-10">
                <Plus className="mr-2 h-4 w-4" /> Create Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-black">Configure Shift</DialogTitle>
                <DialogDescription>Set working hours and attendance rules.</DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreate)}>
                  <DialogBody>
                    <ShiftFormFields form={createForm} />
                  </DialogBody>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Configuration</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={7} />
            </div>
          ) : list.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No work shifts found"
                description="Create your first shift."
                icon={Clock}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]">
                    <TableHead className="font-bold text-xs">Shift Name</TableHead>
                    <TableHead className="font-bold text-xs">Start Time</TableHead>
                    <TableHead className="font-bold text-xs">End Time</TableHead>
                    <TableHead className="font-bold text-xs">Grace Period</TableHead>
                    <TableHead className="font-bold text-xs">Working Days</TableHead>
                    <TableHead className="font-bold text-xs">Employees</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((shift) => (
                    <TableRow key={shift.id} className="hover:bg-[var(--bg-subtle)]/40">
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openDetail(shift)}
                          className="font-semibold text-left text-[var(--accent-primary)] hover:underline"
                        >
                          {shift.name}
                        </button>
                        {isOvernightShift(shift.start_time, shift.end_time) && (
                          <Badge className="ml-2 text-[9px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                            Overnight
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatShiftTime(shift.start_time)}</TableCell>
                      <TableCell>{formatShiftTime(shift.end_time)}</TableCell>
                      <TableCell>{shift.grace_period_minutes ?? 0} min</TableCell>
                      <TableCell className="text-xs">{formatWorkingDays(shift.working_days)}</TableCell>
                      <TableCell>{countEmployeesInShift(shift.id, users)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-[10px] font-bold',
                            shift.is_active
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : 'bg-slate-500/15 text-slate-600'
                          )}
                        >
                          {shift.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openDetail(shift)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(shift)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-rose-600"
                            onClick={() => setDeleteTarget(shift)}
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
            <DialogTitle className="font-black">{selectedShift?.name}</DialogTitle>
            <DialogDescription>
              {selectedShift?.description || 'Shift configuration details.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Start Time</p>
                <p className="font-semibold">{formatShiftTime(selectedShift?.start_time)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">End Time</p>
                <p className="font-semibold">{formatShiftTime(selectedShift?.end_time)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Grace Period</p>
                <p className="font-semibold">{selectedShift?.grace_period_minutes ?? 0} min</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Status</p>
                <p className="font-semibold">{selectedShift?.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Working Days</p>
                <p className="font-semibold">{formatWorkingDays(selectedShift?.working_days)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-1">Timezone</p>
                <p className="font-semibold">{selectedShift?.timezone || '—'}</p>
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
                  emptyMessage="No employees assigned to this shift."
                />
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            {selectedShift && (
              <>
                <Button type="button" variant="outline" onClick={() => openEdit(selectedShift)}>
                  Edit Shift
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteTarget(selectedShift)}>
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
            <DialogTitle className="font-black">Edit Shift</DialogTitle>
            <DialogDescription>Update shift timing and status.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)}>
              <DialogBody>
                <ShiftFormFields form={editForm} showStatus />
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
            <AlertDialogTitle>Delete shift?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate &quot;{deleteTarget?.name}&quot;. Employees must be reassigned first if any are
              still linked to this shift.
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
