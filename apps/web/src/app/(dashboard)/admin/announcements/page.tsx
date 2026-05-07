'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, Plus, Trash2, Loader2, Calendar, Users, Target } from 'lucide-react';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const AUDIENCE_OPTIONS = [
    { value: 'ALL', label: 'All Users' },
    { value: 'ADMIN', label: 'Admins Only' },
    { value: 'HR_OPERATIONS', label: 'HR Only' },
    { value: 'MANAGER', label: 'Managers Only' },
    { value: 'TEAM_LEAD', label: 'Team Leads Only' },
    { value: 'EMPLOYEE', label: 'All Employees' },
  ];

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await announcementsApi.getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsSubmitting(true);
    try {
      await announcementsApi.createAnnouncement({
        title,
        content,
        audience,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_active: true
      });
      toast.success('Announcement published');
      setIsDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to publish announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAudience('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this announcement?')) return;
    try {
      // Note: Backend might need delete endpoint if not exists, but for now we follow the existing API pattern
      // If delete is not implemented, we might want to just set is_active: false
      toast.info('Delete functionality not fully implemented on backend yet. Use is_active for now if needed.');
    } catch (error) {
      toast.error('Failed to remove announcement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Company Announcements</h1>
          <p className="text-sm text-slate-500">Broadcast updates to targeted audiences across the organization.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Broadcast Announcement</DialogTitle>
                <DialogDescription>Select an audience and duration for this update.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Annual Town Hall 2026" 
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger id="audience" className="bg-slate-50/50">
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date (Optional)</Label>
                    <Input 
                      id="start_date" 
                      type="datetime-local" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date (Optional)</Label>
                    <Input 
                      id="end_date" 
                      type="datetime-local" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-50/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Message Content</Label>
                  <Textarea 
                    id="content" 
                    placeholder="Write your announcement here..." 
                    required 
                    className="min-h-[120px] bg-slate-50/50"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 w-full h-11">
                  {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
          </div>
        ) : announcements.length === 0 ? (
          <Card className="border-dashed bg-slate-50/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Megaphone className="h-12 w-12 mb-4 text-slate-200" />
              <p className="font-medium">No announcements published yet.</p>
              <p className="text-xs">Active updates will appear here for management.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-slate-900">{ann.title}</CardTitle>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created: {format(new Date(ann.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-blue-500" />
                        <span className="font-medium text-blue-600">Audience: {ann.audience}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] py-0 h-5",
                    ann.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600"
                  )}>
                    {ann.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                
                {(ann.start_date || ann.end_date) && (
                  <div className="mt-4 p-2 bg-slate-50 rounded text-[11px] text-slate-500 flex gap-4">
                    {ann.start_date && (
                      <span>Start: {format(new Date(ann.start_date), 'PPp')}</span>
                    )}
                    {ann.end_date && (
                      <span>End: {format(new Date(ann.end_date), 'PPp')}</span>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-3"
                    onClick={() => handleDelete(ann.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
