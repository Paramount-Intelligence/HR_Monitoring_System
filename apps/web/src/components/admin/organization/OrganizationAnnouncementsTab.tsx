'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Megaphone, Plus, Eye } from 'lucide-react';
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
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import { getErrorMessage } from '@/lib/api/client';
import { safeArray, formatOrgDate, formatAudience, formatUserNameById, isThisWeekAnnouncement } from '@/lib/admin-organization/utils';
import { cn } from '@/lib/utils';

const announcementSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(5, 'Content is required'),
  audience: z.string().min(1, 'Audience is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

interface OrganizationAnnouncementsTabProps {
  announcements: Announcement[];
  users: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function OrganizationAnnouncementsTab({
  announcements,
  users,
  loading,
  error,
  onRefresh,
}: OrganizationAnnouncementsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewAnn, setViewAnn] = useState<Announcement | null>(null);

  const form = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', audience: 'all', start_date: '', end_date: '' },
  });

  const onSubmit = async (data: z.infer<typeof announcementSchema>) => {
    try {
      await announcementsApi.createAnnouncement({
        ...data,
        is_active: true,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : undefined,
      });
      toast.success('Announcement published');
      setIsCreateOpen(false);
      form.reset();
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (error) {
    return <OrganizationTabError tabName="Announcements" message={error} onRetry={onRefresh} />;
  }

  const list = safeArray(announcements);
  const published = list.filter((a) => a.is_active).length;
  const drafts = list.filter((a) => !a.is_active).length;
  const thisWeek = list.filter((a) => isThisWeekAnnouncement(a.created_at)).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminMetricCard title="Total Announcements" value={list.length} icon={Megaphone} />
        <AdminMetricCard title="Published" value={published} />
        <AdminMetricCard title="Draft / Inactive" value={drafts} />
        <AdminMetricCard title="This Week" value={thisWeek} />
      </div>

      <Card className="border border-[var(--border-default)] bg-[var(--bg-elevated)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <CardTitle className="text-lg font-black">Announcements</CardTitle>
            <CardDescription className="text-xs">Organization-wide broadcasting</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[var(--accent-primary)] text-white font-bold text-xs h-10">
                <Plus className="mr-2 h-4 w-4" /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader><DialogTitle className="font-black">Broadcast Message</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="audience" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          <SelectItem value="admin">Admins Only</SelectItem>
                          <SelectItem value="hr_operations">HR Only</SelectItem>
                          <SelectItem value="manager">Managers Only</SelectItem>
                          <SelectItem value="employee">General Employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="content" render={({ field }) => (
                    <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea className="min-h-[100px] resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="start_date" render={({ field }) => (
                      <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="end_date" render={({ field }) => (
                      <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full rounded-xl">Publish Announcement</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton rows={4} cols={5} /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--bg-subtle)]">
                    <TableHead className="font-bold text-xs">Title</TableHead>
                    <TableHead className="font-bold text-xs">Audience</TableHead>
                    <TableHead className="font-bold text-xs">Created By</TableHead>
                    <TableHead className="font-bold text-xs">Published Date</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="text-right font-bold text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((ann) => (
                    <TableRow key={ann.id}>
                      <TableCell className="font-semibold max-w-[200px] truncate">{ann.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{formatAudience(ann.audience)}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {formatUserNameById(ann.created_by, users)}
                      </TableCell>
                      <TableCell className="text-xs">{formatOrgDate(ann.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] font-bold', ann.is_active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-slate-500/15 text-slate-600')}>
                          {ann.is_active ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setViewAnn(ann)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {list.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-12">
                        <EmptyState title="No Announcements" description="Create your first organization-wide announcement." icon={Megaphone} />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewAnn} onOpenChange={(open) => !open && setViewAnn(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">{viewAnn?.title}</DialogTitle>
            <DialogDescription>
              {viewAnn && formatAudience(viewAnn.audience)} · {viewAnn && formatOrgDate(viewAnn.created_at)}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{viewAnn?.content}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
