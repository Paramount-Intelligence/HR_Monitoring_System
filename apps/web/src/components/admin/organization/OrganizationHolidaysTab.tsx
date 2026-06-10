'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { OrganizationTabError } from './OrganizationTabError';
import { holidaysApi, Holiday } from '@/lib/api/holidays';
import { getErrorMessage } from '@/lib/api/client';
import {
  safeArray,
  formatOrgDate,
  isUpcomingHoliday,
  isPastHoliday,
  isThisMonthHoliday,
} from '@/lib/admin-organization/utils';
import { cn } from '@/lib/utils';

const holidaySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  holiday_date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

interface OrganizationHolidaysTabProps {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function OrganizationHolidaysTab({ holidays, loading, error, onRefresh }: OrganizationHolidaysTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Holiday | null>(null);

  const createForm = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { name: '', holiday_date: '', description: '' },
  });

  const editForm = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { name: '', holiday_date: '', description: '' },
  });

  const openEdit = (hol: Holiday) => {
    setSelected(hol);
    editForm.reset({
      name: hol.name,
      holiday_date: hol.holiday_date?.slice(0, 10) || '',
      description: hol.description || '',
    });
    setIsEditOpen(true);
  };

  const onCreate = async (data: z.infer<typeof holidaySchema>) => {
    try {
      await holidaysApi.createHoliday(data);
      toast.success('Holiday recorded');
      setIsCreateOpen(false);
      createForm.reset();
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const onEdit = async (data: z.infer<typeof holidaySchema>) => {
    if (!selected) return;
    try {
      await holidaysApi.updateHoliday(selected.id, data);
      toast.success('Holiday updated');
      setIsEditOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await holidaysApi.deactivateHoliday(id);
      toast.success('Holiday removed');
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (error) {
    return <OrganizationTabError tabName="Holidays" message={error} onRetry={onRefresh} />;
  }

  const list = safeArray(holidays);
  const upcoming = list.filter((h) => isUpcomingHoliday(h.holiday_date)).length;
  const past = list.filter((h) => isPastHoliday(h.holiday_date)).length;
  const thisMonth = list.filter((h) => isThisMonthHoliday(h.holiday_date)).length;

  const HolidayFields = ({ form }: { form: typeof createForm }) => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem><FormLabel>Holiday Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="holiday_date" render={({ field }) => (
        <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }) => (
        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
    </>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminMetricCard title="Total Holidays" value={list.length} icon={Calendar} />
        <AdminMetricCard title="Upcoming Holidays" value={upcoming} />
        <AdminMetricCard title="Past Holidays" value={past} />
        <AdminMetricCard title="This Month" value={thisMonth} />
      </div>

      <Card className="border border-[var(--border-default)] bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <CardTitle className="text-lg font-black">Holiday Calendar</CardTitle>
            <CardDescription className="text-xs">Public and company non-working days</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs h-10">
                <Plus className="mr-2 h-4 w-4" /> Create Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader><DialogTitle className="font-black">Record Holiday</DialogTitle></DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4 pt-2">
                  <HolidayFields form={createForm} />
                  <Button type="submit" className="w-full rounded-xl">Save Holiday</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]">
                    <TableHead className="font-bold text-xs">Holiday Name</TableHead>
                    <TableHead className="font-bold text-xs">Date</TableHead>
                    <TableHead className="font-bold text-xs">Type</TableHead>
                    <TableHead className="font-bold text-xs">Description</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((hol) => (
                    <TableRow key={hol.id}>
                      <TableCell className="font-semibold">{hol.name}</TableCell>
                      <TableCell>{formatOrgDate(hol.holiday_date)}</TableCell>
                      <TableCell className="text-xs capitalize">Public</TableCell>
                      <TableCell className="text-xs text-[var(--text-secondary)] max-w-[200px] truncate">
                        {hol.description || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-bold', hol.is_active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-slate-500/15 text-slate-600')}>
                          {hol.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(hol)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-rose-600" onClick={() => handleDelete(hol.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-12">
                        <EmptyState title="No Holidays Recorded" description="Add public and company holidays here." icon={Calendar} />
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
          <DialogHeader><DialogTitle className="font-black">Edit Holiday</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4 pt-2">
              <HolidayFields form={editForm} />
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
