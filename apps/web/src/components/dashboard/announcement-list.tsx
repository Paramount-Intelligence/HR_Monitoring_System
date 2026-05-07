'use client';

import { useEffect, useState } from 'react';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Megaphone, Clock, Loader2, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function AnnouncementList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const data = await announcementsApi.getAnnouncements();
        setAnnouncements(data);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center border rounded-xl bg-slate-50/50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="shadow-sm border-dashed bg-slate-50/30">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-slate-100 p-3 rounded-full mb-3">
            <Info className="h-5 w-5 text-slate-400" />
          </div>
          <CardTitle className="text-sm font-medium text-slate-900">No Announcements</CardTitle>
          <CardDescription className="text-xs">There are no active announcements for you right now.</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card key={announcement.id} className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-blue-600" />
                {announcement.title}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-blue-600 border-blue-200 bg-blue-50">
                Update
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
