'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, Plus, Trash2, Loader2, Calendar, Users, Target, History, ShieldCheck, Zap } from 'lucide-react';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TableSkeleton } from '@/components/ui/skeletons';
import { EmptyState } from '@/components/ui/empty-state';

const announceSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  content: z.string().min(5, 'Content is required'),
  audience: z.string().min(1, 'Audience is required'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof announceSchema>>({
    resolver: zodResolver(announceSchema),
    defaultValues: { title: '', content: '', audience: 'all', start_date: '', end_date: '' }
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const data = await announcementsApi.getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      await announcementsApi.createAnnouncement({ 
        ...data, 
        is_active: true,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : undefined,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : undefined
      });
      toast.success('Announcement published');
      setIsDialogOpen(false);
      form.reset();
      fetchAnnouncements();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const AUDIENCE_OPTIONS = [
    { value: 'all', label: 'All Users' },
    { value: 'admin', label: 'Admins Only' },
    { value: 'hr_operations', label: 'HR Only' },
    { value: 'manager', label: 'Managers Only' },
    { value: 'team_lead', label: 'Team Leads Only' },
    { value: 'employee', label: 'All Employees' },
  ];

  return (
    <div className="space-y-10 pb-20 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-1.5">
            <Megaphone className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Broadcast Hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] sm:text-5xl">Announcements</h1>
          <p className="text-[var(--text-muted)] font-bold text-sm tracking-tight uppercase opacity-60">Organizational Updates & Strategic Communication</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] px-8 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95">
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-premium-lg p-10">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-black text-[var(--text-primary)] tracking-tighter">Broadcast Message</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1">Title</FormLabel><FormControl><Input placeholder="e.g. Annual Town Hall" className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="audience" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1">Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select audience" /></SelectTrigger></FormControl>
                      <SelectContent className="rounded-2xl shadow-premium-lg">
                        {AUDIENCE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1">Message Content</FormLabel><FormControl><Textarea className="resize-none rounded-xl min-h-[120px]" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1">Start Date</FormLabel><FormControl><Input type="datetime-local" className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-1">End Date</FormLabel><FormControl><Input type="datetime-local" className="h-12 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full h-14 bg-indigo-600 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl mt-4">Publish Announcement</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="p-10"><TableSkeleton rows={4} cols={1} /></div>
        ) : announcements.length === 0 ? (
          <div className="py-20 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[3rem] shadow-[var(--shadow-soft)]">
              <EmptyState title="No announcements published yet" message="Broadcast updates will appear here." icon={Megaphone} />
          </div>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id} className="border border-[var(--border-subtle)] shadow-[var(--shadow-card)] bg-[var(--bg-surface)] rounded-[2.5rem] overflow-hidden group hover:shadow-[var(--shadow-card)] transition-all duration-500">
              <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Zap className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-2xl font-black text-[var(--text-primary)] tracking-tight leading-snug group-hover:text-[var(--accent-primary)] transition-colors">
                        {ann.title}
                      </CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(parseISO(ann.created_at), 'PPP')}</div>
                    <div className="flex items-center gap-1.5 text-[var(--accent-primary)]"><Target className="h-3.5 w-3.5" /> Audience: {ann.audience}</div>
                  </div>
                </div>
                <Badge className={cn("rounded-lg text-[8px] font-black uppercase tracking-widest px-3 h-6", ann.is_active ? "bg-[var(--status-success-text)] text-white" : "bg-[var(--status-neutral-bg)] text-[var(--text-muted)]")}>
                  {ann.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </CardHeader>
              <CardContent className="px-10 pb-10">
                <p className="text-[var(--text-secondary)] font-medium text-sm leading-relaxed italic border-l-4 border-[var(--accent-soft)] pl-6 py-2">
                  "{ann.content}"
                </p>
                {(ann.start_date || ann.end_date) && (
                  <div className="mt-8 flex gap-8 p-4 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-subtle)]">
                    {ann.start_date && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Broadcast Start</span>
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">{format(parseISO(ann.start_date), 'PPp')}</span>
                      </div>
                    )}
                    {ann.end_date && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Broadcast End</span>
                        <span className="text-[11px] font-bold text-[var(--text-primary)]">{format(parseISO(ann.end_date), 'PPp')}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
