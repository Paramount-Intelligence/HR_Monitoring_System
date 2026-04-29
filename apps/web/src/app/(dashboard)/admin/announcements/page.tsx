'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
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
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        priority
      });
      toast.success('Announcement published');
      setIsDialogOpen(false);
      setTitle('');
      setContent('');
      setPriority('medium');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to publish announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this announcement?')) return;
    try {
      await announcementsApi.deleteAnnouncement(id);
      toast.success('Announcement removed');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to remove announcement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Company Announcements</h1>
          <p className="text-sm text-slate-500">Broadcast important updates to all employees.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Broadcast Announcement</DialogTitle>
                <DialogDescription>Create a new announcement for all employees.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Annual Town Hall 2024" 
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea 
                    id="content" 
                    placeholder="Write your announcement here..." 
                    required 
                    className="min-h-[120px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 w-full">
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Megaphone className="h-12 w-12 mb-4 text-slate-200" />
              <p>No announcements published yet.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id} className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-slate-900">{ann.title}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(ann.created_at), 'PPP')}</span>
                    </div>
                  </div>
                  <Badge className={
                    ann.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                    ann.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {(ann.priority || 'medium').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{ann.content}</p>
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => handleDelete(ann.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
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
