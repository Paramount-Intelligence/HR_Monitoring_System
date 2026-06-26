'use client';

import Link from 'next/link';
import { MessageSquare, Calendar, Megaphone, HelpCircle, Bell } from 'lucide-react';
import { AdminMetricCard } from './AdminMetricCard';
import { AdminChartCard } from './AdminChartCard';
import { AdminDataTable } from './AdminDataTable';
import { AdminTabError } from './AdminTabError';
import { LiveCalendar } from '@/components/calendar/LiveCalendar';
import { Meeting } from '@/lib/api/meetings';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { CommunicationAnalyticsData } from '@/lib/admin-dashboard/types';
import { organizationTabHref } from '@/lib/navigation/organization-nav';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO, isToday, isFuture } from 'date-fns';

const CHART_COLORS = ['#1E66C1', '#38BDF8', '#047857', '#B45309', '#B91C1C'];

interface AdminCommunicationTabProps {
  data: CommunicationAnalyticsData | null;
  meetings: Meeting[];
  meetingsLoading?: boolean;
  onRefreshMeetings?: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function countMeetingsFromList(meetings: Meeting[]) {
  let today = 0;
  let upcoming = 0;
  for (const m of meetings) {
    if (!m.start_at) continue;
    try {
      const start = parseISO(m.start_at);
      if (isToday(start)) today += 1;
      if (isFuture(start) || isToday(start)) upcoming += 1;
    } catch {
      /* skip invalid dates */
    }
  }
  return { today, upcoming };
}

export function AdminCommunicationTab({
  data,
  meetings,
  meetingsLoading,
  onRefreshMeetings,
  loading,
  error,
  onRetry,
}: AdminCommunicationTabProps) {
  if (loading) {
    return <div className="py-20 text-center text-sm text-[var(--text-muted)] font-semibold">Loading communication analytics...</div>;
  }
  if (error) {
    return <AdminTabError tabName="Communication" message={error} onRetry={onRetry} />;
  }

  const s = data?.summary || {};
  const meetingCounts = countMeetingsFromList(meetings);
  const messagesByDay = safeArray(data?.messages_by_day);
  const meetingsByWeek = safeArray(data?.meetings_by_week);
  const ticketStatus = safeArray(data?.support_tickets_by_status);
  const recentConversations = safeArray<Record<string, unknown>>(data?.recent_conversations);
  const upcomingFromApi = safeArray<Record<string, unknown>>(data?.upcoming_meetings);
  const announcements = safeArray(data?.recent_announcements);
  const tickets = safeArray<Record<string, unknown>>(data?.support_tickets);

  const meetingsToday = safeNumber(s.meetings_today) || meetingCounts.today;
  const upcomingMeetings = safeNumber(s.upcoming_meetings) || meetingCounts.upcoming;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/calendar"
          className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-black text-[var(--accent-primary)] hover:shadow-md transition-all min-h-[44px]"
        >
          Create Meeting
        </Link>
        <Link
          href={organizationTabHref('announcements')}
          className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-black text-[var(--accent-primary)] hover:shadow-md transition-all min-h-[44px]"
        >
          Send Announcement
        </Link>
        <Link
          href="/messages"
          className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-black text-[var(--accent-primary)] hover:shadow-md transition-all min-h-[44px]"
        >
          Open Messages
        </Link>
        <Link
          href="/help-support"
          className="flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-black text-[var(--accent-primary)] hover:shadow-md transition-all min-h-[44px]"
        >
          Support Tickets
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <AdminMetricCard title="Unread Messages" value={safeNumber(s.unread_messages)} icon={MessageSquare} />
        <AdminMetricCard title="Active Conversations" value={safeNumber(s.active_conversations)} icon={Bell} />
        <AdminMetricCard title="Meetings Today" value={meetingsToday} icon={Calendar} />
        <AdminMetricCard title="Upcoming" value={upcomingMeetings} icon={Calendar} />
        <AdminMetricCard title="Announcements" value={safeNumber(s.announcements_this_week)} icon={Megaphone} subtitle="This week" />
        <AdminMetricCard title="Open Tickets" value={safeNumber(s.open_support_tickets)} icon={HelpCircle} />
      </div>

      <AdminChartCard title="Live Calendar" description="Asia/Karachi timezone">
        <LiveCalendar meetings={meetings} loading={meetingsLoading} onRefresh={onRefreshMeetings} />
      </AdminChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminChartCard title="Messages by Day">
          {messagesByDay.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No messages in the last 7 days</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={messagesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => {
                  try { return format(parseISO(v), 'MMM d'); } catch { return v; }
                }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E66C1" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <AdminChartCard title="Meetings by Week">
          {meetingsByWeek.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No meeting data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={meetingsByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#38BDF8" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <AdminChartCard title="Tickets by Status">
          {ticketStatus.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No tickets</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ticketStatus} dataKey="count" nameKey="label" cx="50%" cy="45%" innerRadius={35} outerRadius={55}>
                  {ticketStatus.map((_: unknown, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-black mb-3 uppercase tracking-wider">Recent Conversations</h3>
          <AdminDataTable
            data={recentConversations}
            emptyMessage="No conversations"
            columns={[
              { key: 'title', header: 'Title', render: (r) => String(r.title || '—') },
              { key: 'type', header: 'Type', render: (r) => String(r.conversation_type || '').replace(/_/g, ' ') || '—' },
              { key: 'participants', header: 'Members', render: (r) => safeNumber(r.participant_count) },
            ]}
          />
        </div>

        <div>
          <h3 className="text-sm font-black mb-3 uppercase tracking-wider">Upcoming Meetings</h3>
          <AdminDataTable
            data={upcomingFromApi}
            emptyMessage="No upcoming meetings"
            columns={[
              { key: 'title', header: 'Meeting', render: (r) => String(r.title || '—') },
              {
                key: 'start',
                header: 'Start',
                render: (r) => {
                  try {
                    return format(parseISO(String(r.start_at)), 'MMM d, h:mm a');
                  } catch {
                    return '—';
                  }
                },
              },
              { key: 'organizer', header: 'Organizer', render: (r) => String(r.organizer_name || '—') },
              { key: 'status', header: 'Status', render: (r) => String(r.status || '—') },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-black mb-3 uppercase tracking-wider">Recent Announcements</h3>
          <div className="space-y-2">
            {announcements.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic py-4">No announcements this week</p>
            ) : (
              announcements.map((a: Record<string, unknown>, i: number) => (
                <div key={i} className="rounded-xl border border-[var(--border-subtle)] p-3">
                  <p className="text-xs font-black">{String(a.title || '—')}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-1">{String(a.description || '')}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-black mb-3 uppercase tracking-wider">Support Tickets</h3>
          <AdminDataTable
            data={tickets}
            emptyMessage="No support tickets"
            columns={[
              { key: 'num', header: '#', render: (r) => String(r.ticket_number || '—') },
              { key: 'subject', header: 'Subject', render: (r) => String(r.subject || '—') },
              { key: 'priority', header: 'Priority', render: (r) => String(r.priority || '—') },
              { key: 'status', header: 'Status', render: (r) => String(r.status || '—') },
              { key: 'by', header: 'Created By', render: (r) => String(r.created_by_name || '—') },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
