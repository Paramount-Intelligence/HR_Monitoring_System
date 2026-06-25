'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Megaphone, Plus, Eye, Edit, Trash2 } from 'lucide-react';
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

const editAnnouncementSchema = announcementSchema.extend({
  is_active: z.boolean(),
});

interface OrganizationAnnouncementsTabProps {
  announcements: Announcement[];
  users: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Employees' },
  { value: 'admin', label: 'Admins Only' },
  { value: 'hr_operations', label: 'HR Only' },
  { value: 'manager', label: 'Managers Only' },
  { value: 'employee', label: 'General Employees' },
];

export function OrganizationAnnouncementsTab({
  announcements,
  users,
  loading,
  error,
  onRefresh,
}: OrganizationAnnouncementsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewAnn, setViewAnn] = useState<Announcement | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Announcement | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const createForm = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', content: '', audience: 'all', start_date: '', end_date: '' },
  });

  const editForm = useForm<z.infer<typeof editAnnouncementSchema>>({
    resolver: zodResolver(editAnnouncementSchema),
    defaultValues: { title: '', content: '', audience: 'all', start_date: '', end_date: '', is_active: true },
  });

  const onCreate = async (data: z.infer<typeof announcementSchema>) => {
    try {
      await announcementsApi.createAnnouncement({
        ...data,
        is_active: true,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : undefined,
      });
      toast.success('Announcement published.');
      setIsCreateOpen(false);
      createForm.reset();
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const openEdit = (ann: Announcement) => {
    setSelected(ann);
    editForm.reset({
      title: ann.title,
      content: ann.content,
      audience: ann.audience,
      start_date: ann.start_date ? ann.start_date.slice(0, 16) : '',
      end_date: ann.end_date ? ann.end_date.slice(0, 16) : '',
      is_active: ann.is_active,
    });
    setIsEditOpen(true);
  };

  const onEdit = async (data: z.infer<typeof editAnnouncementSchema>) => {
    if (!selected) return;
    try {
      await announcementsApi.updateAnnouncement(selected.id, {
        title: data.title,
        content: data.content,
        audience: data.audience,
        is_active: data.is_active,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
      });
      toast.success('Announcement updated successfully.');
      setIsEditOpen(false);
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      await announcementsApi.archiveAnnouncement(archiveTarget.id);
      toast.success('Announcement archived.');
      setArchiveTarget(null);
      onRefresh();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setArchiveLoading(false);
    }
  };

  if (error) {
    return <OrganizationTabError tabName="Announcements" message={error} onRetry={onRefresh} />;
  }

  const list = safeArray(announcements);
  const published = list.filter((a) => a.is_active).length;
  const drafts = list.filter((a) => !a.is_active).length;
  const thisWeek = list.filter((a) => isThisWeekAnnouncement(a.created_at)).length;

  const AudienceSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => {
    const label = AUDIENCE_OPTIONS.find((o) => o.value === value)?.label || formatAudience(value);
    return (
      <Select onValueChange={onChange} value={value}>
        <SelectTrigger className="h-11 rounded-xl">
          <SelectValue>{label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AUDIENCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
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
    <Select onValueChange={(v) => onChange(v === 'active')} value={value ? 'active' : 'inactive'}>
      <SelectTrigger className="h-11 rounded-xl">
        <SelectValue>{value ? 'Published' : 'Draft / Inactive'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Published</SelectItem>
        <SelectItem value="inactive">Draft / Inactive</SelectItem>
      </SelectContent>
    </Select>
  );

  const AnnouncementFields = ({
    form,
    showStatus = false,
  }: {
    form: typeof createForm | typeof editForm;
    showStatus?: boolean;
  }) => (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input className="h-11 rounded-xl" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="audience"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Audience</FormLabel>
            <FormControl>
              <AudienceSelect value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Message</FormLabel>
            <FormControl>
              <Textarea className="min-h-[120px] resize-none rounded-xl" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="datetime-local" className="h-11 rounded-xl" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input type="datetime-local" className="h-11 rounded-xl" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
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
              <DialogHeader>
                <DialogTitle className="font-black">Broadcast Message</DialogTitle>
                <DialogDescription>Create an organization-wide announcement.</DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreate)}>
                  <DialogBody>
                    <AnnouncementFields form={createForm} />
                  </DialogBody>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Publish Announcement</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={6} />
            </div>
          ) : list.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No announcements"
                description="Create your first organization-wide announcement."
                icon={Megaphone}
              />
            </div>
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
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {formatAudience(ann.audience)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{formatUserNameById(ann.created_by, users)}</TableCell>
                      <TableCell className="text-xs">{formatOrgDate(ann.created_at)}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-[10px] font-bold',
                            ann.is_active
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : 'bg-slate-500/15 text-slate-600'
                          )}
                        >
                          {ann.is_active ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setViewAnn(ann)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(ann)}>
                            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-rose-600"
                            onClick={() => setArchiveTarget(ann)}
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

      <Dialog open={!!viewAnn} onOpenChange={(open) => !open && setViewAnn(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">{viewAnn?.title}</DialogTitle>
            <DialogDescription>
              {viewAnn && formatAudience(viewAnn.audience)} · {viewAnn && formatOrgDate(viewAnn.created_at)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {viewAnn?.content}
            </p>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Announcement</DialogTitle>
            <DialogDescription>Update announcement content and status.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)}>
              <DialogBody>
                <AnnouncementFields form={editForm} showStatus />
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

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate &quot;{archiveTarget?.title}&quot; and stop it from broadcasting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archiveLoading}>
              {archiveLoading ? 'Archiving…' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
