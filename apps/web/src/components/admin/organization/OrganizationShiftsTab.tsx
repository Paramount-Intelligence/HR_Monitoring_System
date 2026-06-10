'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { OrganizationTabError } from './OrganizationTabError';
import { shiftsApi } from '@/lib/api/shifts';
import { getErrorMessage } from '@/lib/api/client';
import { Shift } from '@/types';
import { safeArray, formatShiftTime, isOvernightShift } from '@/lib/admin-organization/utils';
import { cn } from '@/lib/utils';

const shiftSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  grace_period_minutes: z.string().min(0),
  working_days: z.string().min(1),
  timezone: z.string().min(1),
});

interface OrganizationShiftsTabProps {
  shifts: Shift[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function OrganizationShiftsTab({ shifts, loading, error, onRefresh }: OrganizationShiftsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

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

  const editForm = useForm<z.infer<typeof shiftSchema>>({
    resolver: zodResolver(shiftSchema),
    defaultValues: createForm.getValues(),
  });

  const openEdit = (shift: Shift) => {
    setSelectedShift(shift);
    editForm.reset({
      name: shift.name,
      start_time: shift.start_time?.slice(0, 5) || '',
      end_time: shift.end_time?.slice(0, 5) || '',
      grace_period_minutes: String(shift.grace_period_minutes ?? 15),
      working_days: shift.working_days || '1,2,3,4,5',
      timezone: shift.timezone || 'Asia/Karachi',
    });
    setIsEditOpen(true);
  };

  const submitShift = async (data: z.infer<typeof shiftSchema>, isEdit: boolean) => {
    const payload = {
      ...data,
      grace_period_minutes: Number(data.grace_period_minutes),
      is_active: true,
    };
    try {
      if (isEdit && selectedShift) {
        await shiftsApi.updateShift(selectedShift.id, payload);
        toast.success('Shift updated');
        setIsEditOpen(false);
      } else {
        await shiftsApi.createShift(payload as Omit<Shift, 'id'>);
        toast.success('Work shift configured');
        setIsCreateOpen(false);
        createForm.reset();
      }
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await shiftsApi.deactivateShift(id);
      toast.success('Shift deactivated');
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (error) {
    return <OrganizationTabError tabName="Work Shifts" message={error} onRetry={onRefresh} />;
  }

  const list = safeArray(shifts);
  const activeCount = list.filter((s) => s.is_active).length;
  const overnightCount = list.filter((s) => isOvernightShift(s.start_time, s.end_time)).length;
  const defaultShift = list.find((s) => s.name.toLowerCase().includes('standard') || s.name.toLowerCase().includes('default'));

  const ShiftFormFields = ({ form }: { form: typeof createForm }) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Shift Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="start_time" render={({ field }) => (
          <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="end_time" render={({ field }) => (
          <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="grace_period_minutes" render={({ field }) => (
          <FormItem><FormLabel>Grace (mins)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="working_days" render={({ field }) => (
          <FormItem><FormLabel>Working Days</FormLabel><FormControl><Input placeholder="1,2,3,4,5" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
      </div>
      <FormField control={form.control} name="timezone" render={({ field }) => (
        <FormItem><FormLabel>Timezone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
    </>
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
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader><DialogTitle className="font-black">Configure Shift</DialogTitle></DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((d) => submitShift(d, false))} className="space-y-4 pt-2">
                  <ShiftFormFields form={createForm} />
                  <Button type="submit" className="w-full rounded-xl">Save Configuration</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={4} cols={6} /></div>
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
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-semibold">
                        {shift.name}
                        {isOvernightShift(shift.start_time, shift.end_time) && (
                          <Badge className="ml-2 text-[9px] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">Overnight</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatShiftTime(shift.start_time)}</TableCell>
                      <TableCell>{formatShiftTime(shift.end_time)}</TableCell>
                      <TableCell>{shift.grace_period_minutes ?? 0} min</TableCell>
                      <TableCell className="text-xs">{shift.working_days || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-bold', shift.is_active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-slate-500/15 text-slate-600')}>
                          {shift.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(shift)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          {shift.is_active && (
                            <Button variant="ghost" size="sm" className="text-xs text-rose-600" onClick={() => handleDeactivate(shift.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-12">
                        <EmptyState title="No Shifts Configured" description="Add a work shift to assign to employees." icon={Clock} />
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
          <DialogHeader><DialogTitle className="font-black">Edit Shift</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((d) => submitShift(d, true))} className="space-y-4 pt-2">
              <ShiftFormFields form={editForm} />
              <div className="flex gap-3">
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
