'use client';

import { useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Meeting } from '@/lib/api/meetings';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function getPkNow(): Date {
  const now = new Date();
  const pkString = now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(pkString);
}

export function getPkDateFromIso(iso: string): Date {
  const d = parseISO(iso);
  return d;
}

export function isPkToday(date: Date): boolean {
  const pkNow = getPkNow();
  return (
    date.getFullYear() === pkNow.getFullYear() &&
    date.getMonth() === pkNow.getMonth() &&
    date.getDate() === pkNow.getDate()
  );
}

interface MiniCalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  meetingDates?: string[];
  className?: string;
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  meetingDates = [],
  className,
}: MiniCalendarProps) {
  const pkNow = getPkNow();
  const viewDate = selectedDate || pkNow;

  const { days, monthLabel } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startPad = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }
    return {
      days: cells,
      monthLabel: format(viewDate, 'MMMM yyyy'),
    };
  }, [viewDate]);

  const meetingDaySet = useMemo(() => {
    const set = new Set<string>();
    meetingDates.forEach((iso) => {
      try {
        const d = parseISO(iso);
        set.add(format(d, 'yyyy-MM-dd'));
      } catch {
        /* ignore */
      }
    });
    return set;
  }, [meetingDates]);

  return (
    <div className={cn('rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">{monthLabel}</span>
        <span className="text-[10px] font-bold text-[var(--text-muted)]">Asia/Karachi</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[var(--text-muted)] mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key = format(day, 'yyyy-MM-dd');
          const today = isPkToday(day);
          const hasMeeting = meetingDaySet.has(key);
          const selected = selectedDate && isSameDay(day, selectedDate);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate?.(day)}
              className={cn(
                'relative h-8 w-full rounded-lg text-xs font-bold transition-all',
                today && 'ring-2 ring-[var(--accent-primary)] ring-offset-1',
                selected && 'bg-[var(--accent-primary)] text-white',
                !selected && 'hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]',
                hasMeeting && !selected && 'bg-[var(--accent-soft)]'
              )}
            >
              {day.getDate()}
              {hasMeeting && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--accent-primary)]" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)]">
        <Clock className="h-3 w-3" />
        Now: {format(pkNow, 'h:mm a')} PKT
      </div>
    </div>
  );
}

interface MeetingCardProps {
  meeting: Meeting;
  compact?: boolean;
  onClick?: () => void;
}

export function MeetingCard({ meeting, compact, onClick }: MeetingCardProps) {
  const start = parseISO(meeting.start_at);
  const end = parseISO(meeting.end_at);
  const now = new Date();
  const isLive = now >= start && now <= end && meeting.status === 'scheduled';
  const isPast = now > end;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-3 transition-all hover:shadow-md',
        isLive
          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]/40'
          : 'border-[var(--border-default)] bg-[var(--bg-elevated)]',
        compact && 'p-2'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('font-black text-[var(--text-primary)] truncate', compact ? 'text-xs' : 'text-sm')}>
            {meeting.title}
          </p>
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] mt-0.5">
            {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
          </p>
          {meeting.organizer && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {meeting.organizer.full_name}
            </p>
          )}
        </div>
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
            isLive && 'bg-[var(--accent-primary)] text-white',
            !isLive && meeting.status === 'cancelled' && 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
            !isLive && !isPast && meeting.status === 'scheduled' && 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
            isPast && meeting.status === 'scheduled' && 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
          )}
        >
          {isLive ? 'Live' : meeting.status === 'cancelled' ? 'Cancelled' : isPast ? 'Ended' : 'Scheduled'}
        </span>
      </div>
    </button>
  );
}

interface UpcomingMeetingsListProps {
  meetings: Meeting[];
  loading?: boolean;
  emptyMessage?: string;
  onMeetingClick?: (meeting: Meeting) => void;
}

export function UpcomingMeetingsList({
  meetings,
  loading,
  emptyMessage = 'No upcoming meetings',
  onMeetingClick,
}: UpcomingMeetingsListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-[var(--text-muted)] font-semibold">
        Loading meetings...
      </div>
    );
  }
  if (meetings.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[var(--text-muted)] italic font-semibold">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
      {meetings.map((m) => (
        <MeetingCard key={m.id} meeting={m} compact onClick={() => onMeetingClick?.(m)} />
      ))}
    </div>
  );
}

interface LiveCalendarProps {
  meetings: Meeting[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function LiveCalendar({ meetings, loading, onRefresh }: LiveCalendarProps) {
  const pkNow = getPkNow();
  const todayMeetings = meetings.filter((m) => {
    try {
      return isPkToday(parseISO(m.start_at));
    } catch {
      return false;
    }
  });
  const upcoming = meetings
    .filter((m) => {
      try {
        return parseISO(m.start_at) >= new Date() && m.status === 'scheduled';
      } catch {
        return false;
      }
    })
    .slice(0, 8);

  const meetingDates = meetings.map((m) => m.start_at);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <MiniCalendar meetingDates={meetingDates} selectedDate={pkNow} />
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
              Today&apos;s Meetings ({todayMeetings.length})
            </h4>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 text-[10px] font-bold">
                Refresh
              </Button>
            )}
          </div>
          <UpcomingMeetingsList
            meetings={todayMeetings}
            loading={loading}
            emptyMessage="No meetings scheduled for today"
          />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] mb-2">
            Upcoming
          </h4>
          <UpcomingMeetingsList
            meetings={upcoming}
            loading={loading}
            emptyMessage="No upcoming meetings"
          />
        </div>
      </div>
    </div>
  );
}
