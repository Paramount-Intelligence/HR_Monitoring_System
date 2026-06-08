'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { meetingsApi, Meeting, MeetingCreateInput, MeetingUpdateInput } from '@/lib/api/meetings';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Link as LinkIcon,
  Plus,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  User as UserIcon,
  AlertCircle,
  Trash2,
  Edit2,
  CalendarDays,
  List,
} from 'lucide-react';

export default function CalendarPage() {
  const { user: authUser } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // View states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [showAllMeetings, setShowAllMeetings] = useState(false); // HR/Admin toggle
  
  // Selected state
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');

  // Fetch functions
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const isStaff = authUser?.role === 'admin' || authUser?.role === 'hr_operations';
      const scope = isStaff && showAllMeetings ? 'all' : undefined;
      const data = await meetingsApi.getMeetings(scope);
      setMeetings(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getActiveDirectory();
      // Filter out the organizer (ourselves)
      setActiveUsers(data.filter((u) => u.id !== authUser?.id) as User[]);
    } catch (err) {
      console.error('Failed to load active users:', err);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchMeetings();
      fetchUsers();
    }
  }, [authUser, showAllMeetings]);

  // Handle mobile resize auto-fallback to agenda view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewType('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Date changes
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate Calendar Days
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    
    // Add null elements for days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Format Helper
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateLabel = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMeetingRSVPForCurrentUser = (meeting: Meeting) => {
    if (meeting.organizer_id === authUser?.id) return 'Organizer';
    const participant = meeting.participants.find((p) => p.user_id === authUser?.id);
    return participant ? participant.response_status : 'Not Invited';
  };

  // RSVP Action
  const handleRSVP = async (meetingId: string, status: 'accepted' | 'declined') => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await meetingsApi.respondMeeting(meetingId, status);
      setSuccessMsg(`You have ${status} the meeting invite.`);
      
      // Update locally
      setMeetings(meetings.map((m) => (m.id === meetingId ? updated : m)));
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update RSVP status.');
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this meeting? Participants will be notified.')) return;
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await meetingsApi.cancelMeeting(meetingId);
      setSuccessMsg('Meeting successfully cancelled.');
      
      // Update list
      setMeetings(meetings.map((m) => (m.id === meetingId ? updated : m)));
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to cancel meeting.');
    }
  };

  // Form handlers
  const openCreateModal = (targetDate?: Date) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTitle('');
    setDescription('');
    setStartDate(targetDate ? targetDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setStartTime('10:00');
    setEndDate(targetDate ? targetDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEndTime('11:00');
    setMeetingLink('');
    setLocation('');
    setSelectedParticipants([]);
    setShowCreateModal(true);
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Meeting Title is required.');
      return;
    }

    if (selectedParticipants.length === 0) {
      setErrorMsg('Please select at least one participant.');
      return;
    }

    try {
      setActionLoading(true);
      
      const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${endDate}T${endTime}:00`).toISOString();

      if (new Date(endIso) <= new Date(startIso)) {
        setErrorMsg('End time must be strictly after the start time.');
        setActionLoading(false);
        return;
      }

      const payload: MeetingCreateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_at: startIso,
        end_at: endIso,
        meeting_link: meetingLink.trim() || undefined,
        location: location.trim() || undefined,
        participants: selectedParticipants,
      };

      const created = await meetingsApi.createMeeting(payload);
      setSuccessMsg(`Meeting "${created.title}" scheduled successfully.`);
      setMeetings([...meetings, created].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
      setShowCreateModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to schedule meeting.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (meeting: Meeting) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTitle(meeting.title);
    setDescription(meeting.description || '');
    setStartDate(meeting.start_at.split('T')[0]);
    setStartTime(new Date(meeting.start_at).toTimeString().slice(0, 5));
    setEndDate(meeting.end_at.split('T')[0]);
    setEndTime(new Date(meeting.end_at).toTimeString().slice(0, 5));
    setMeetingLink(meeting.meeting_link || '');
    setLocation(meeting.location || '');
    setSelectedParticipants(meeting.participants.map((p) => p.user_id).filter((uid) => uid !== meeting.organizer_id));
    setShowEditModal(true);
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Meeting Title is required.');
      return;
    }

    try {
      setActionLoading(true);

      const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endIso = new Date(`${endDate}T${endTime}:00`).toISOString();

      if (new Date(endIso) <= new Date(startIso)) {
        setErrorMsg('End time must be strictly after the start time.');
        setActionLoading(false);
        return;
      }

      const payload: MeetingUpdateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_at: startIso,
        end_at: endIso,
        meeting_link: meetingLink.trim() || undefined,
        location: location.trim() || undefined,
        participants: selectedParticipants,
      };

      const updated = await meetingsApi.updateMeeting(selectedMeeting.id, payload);
      setSuccessMsg('Meeting details updated successfully.');
      setMeetings(meetings.map((m) => (m.id === selectedMeeting.id ? updated : m)));
      setSelectedMeeting(updated);
      setShowEditModal(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update meeting details.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  // Filtered participants list for selector
  const filteredUsers = activeUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(participantSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(participantSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-1 sm:p-4 text-[var(--text-primary)]">
      {/* Header Block */}
      <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)]/60 text-white flex items-center justify-center shadow-lg shadow-[var(--accent-primary)]/20">
              <CalendarIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">Calendar & Meetings</h1>
              <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                Coordinate schedules, RSVP to invitations, and invite team members to synced meetings.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(authUser?.role === 'admin' || authUser?.role === 'hr_operations') && (
              <Button
                variant="outline"
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                  showAllMeetings
                    ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-md'
                    : 'text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]'
                }`}
                onClick={() => setShowAllMeetings(!showAllMeetings)}
              >
                {showAllMeetings ? 'Showing All Org Meetings' : 'Show All Org Meetings'}
              </Button>
            )}

            <div className="hidden md:flex rounded-2xl bg-[var(--bg-surface)] p-1 border border-[var(--border-default)]">
              <button
                onClick={() => setViewType('grid')}
                className={`p-2 rounded-xl transition-all ${
                  viewType === 'grid'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Month Grid"
              >
                <CalendarDays className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-2 rounded-xl transition-all ${
                  viewType === 'list'
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Agenda List"
              >
                <List className="h-4.5 w-4.5" />
              </button>
            </div>

            <Button
              className="px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white shadow-lg shadow-[var(--accent-primary)]/15"
              onClick={() => openCreateModal()}
            >
              <Plus className="h-4.5 w-4.5" />
              New Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Banner Notifications */}
      {(successMsg || errorMsg) && (
        <div
          className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            successMsg
              ? 'border-[var(--status-success-text)]/20 bg-[var(--status-success-text)]/10 text-[var(--status-success-text)]'
              : 'border-[var(--status-danger-text)]/20 bg-[var(--status-danger-text)]/10 text-[var(--status-danger-text)]'
          }`}
        >
          <p className="text-sm font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {successMsg || errorMsg}
          </p>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main View Area */}
        <div className="lg:col-span-2 space-y-6">
          {viewType === 'grid' ? (
            <Card className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3.5 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    Today
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-2 min-h-[350px]">
                {getDaysInMonth().map((day, idx) => {
                  if (!day) {
                    return <div key={`empty-${idx}`} className="bg-[var(--bg-surface)]/20 rounded-2xl border border-transparent" />;
                  }

                  const getPKTDateString = (d: Date) => {
                    return new Intl.DateTimeFormat('en-CA', {
                      timeZone: 'Asia/Karachi',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }).format(d);
                  };

                  const isToday = getPKTDateString(day) === getPKTDateString(new Date());
                  
                  // Find meetings on this day
                  const dayMeetings = meetings.filter((m) => {
                    if (m.status === 'cancelled') return false;
                    const mDate = new Date(m.start_at);
                    return getPKTDateString(mDate) === getPKTDateString(day);
                  });

                  return (
                    <div
                      key={`day-${day.getDate()}`}
                      onClick={() => openCreateModal(day)}
                      className={`min-h-[85px] p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                        isToday
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/10 shadow-sm'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-sidebar-hover)]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-black h-6 w-6 rounded-full flex items-center justify-center leading-none ${
                            isToday ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        
                        {dayMeetings.length > 0 && (
                          <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse shrink-0" />
                        )}
                      </div>

                      {/* Day Meetings items preview */}
                      <div className="space-y-1 mt-2 overflow-hidden max-h-[50px]">
                        {dayMeetings.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeeting(m);
                            }}
                            className="text-[9px] font-black truncate px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] transition-all"
                            title={m.title}
                          >
                            {m.title}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-[8px] font-bold text-[var(--text-muted)] text-center">
                            +{dayMeetings.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            /* Agenda List view */
            <Card className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-6">
              <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Upcoming Meeting Agenda</h2>
              
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-[var(--bg-surface)] animate-pulse rounded-2xl border border-[var(--border-default)]" />
                  ))}
                </div>
              ) : meetings.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface)]/50">
                  <CalendarIcon className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">No scheduled meetings found</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Book your first team meeting using the button above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map((meeting) => {
                    const isCancelled = meeting.status === 'cancelled';
                    return (
                      <div
                        key={meeting.id}
                        onClick={() => setSelectedMeeting(meeting)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row justify-between gap-4 hover:border-[var(--accent-primary)] hover:shadow-md ${
                          selectedMeeting?.id === meeting.id
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                            : isCancelled
                            ? 'opacity-50 border-[var(--border-default)] bg-[var(--bg-surface)]'
                            : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                        }`}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                              isCancelled
                                ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]'
                                : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
                            }`}>
                              {meeting.status}
                            </span>
                            
                            <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(meeting.start_at)} - {formatTime(meeting.end_at)}
                            </span>

                            <span className="text-[10px] font-bold text-[var(--text-muted)]">
                              • {formatDateLabel(meeting.start_at)}
                            </span>
                          </div>

                          <h3 className={`text-base font-extrabold text-[var(--text-primary)] ${isCancelled ? 'line-through' : ''}`}>
                            {meeting.title}
                          </h3>
                          
                          {meeting.description && (
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{meeting.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="flex -space-x-2">
                            {meeting.participants.slice(0, 4).map((p) => (
                              <div
                                key={p.id}
                                className="h-7 w-7 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-[10px] font-black text-[var(--text-primary)] shadow-sm"
                                title={`${p.user.full_name} (${p.response_status})`}
                              >
                                {p.user.full_name.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {meeting.participants.length > 4 && (
                              <div className="h-7 w-7 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)] shadow-sm">
                                +{meeting.participants.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Meeting Details sidebar panel */}
        <div className="lg:col-span-1">
          <Card className="p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl h-fit space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-[var(--text-primary)]">Meeting Brief</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Select any meeting in your agenda to inspect invitation status.</p>
            </div>

            {selectedMeeting ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                      {selectedMeeting.title}
                    </h3>
                    
                    {/* Organizer edit/cancel actions */}
                    {(selectedMeeting.organizer_id === authUser?.id || authUser?.role === 'admin') && 
                      selectedMeeting.status !== 'cancelled' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditModal(selectedMeeting)}
                            className="p-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/30 transition-all shrink-0"
                            title="Edit Meeting"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelMeeting(selectedMeeting.id)}
                            className="p-1.5 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)]/80 transition-all shrink-0"
                            title="Cancel Meeting"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                    )}
                  </div>

                  {selectedMeeting.description && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-surface)] p-3 rounded-2xl border border-[var(--border-default)]">
                      {selectedMeeting.description}
                    </p>
                  )}
                </div>

                {/* Calendar fields */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                    <Clock className="h-4.5 w-4.5 text-[var(--accent-primary)]" />
                    <div>
                      <p className="text-[var(--text-primary)]">{formatDateLabel(selectedMeeting.start_at)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {formatTime(selectedMeeting.start_at)} - {formatTime(selectedMeeting.end_at)}
                      </p>
                    </div>
                  </div>

                  {selectedMeeting.location && (
                    <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                      <MapPin className="h-4.5 w-4.5 text-[var(--accent-primary)]" />
                      <div>
                        <p className="text-[var(--text-primary)]">{selectedMeeting.location}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Physical Location</p>
                      </div>
                    </div>
                  )}

                  {selectedMeeting.meeting_link && (
                    <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                      <Video className="h-4.5 w-4.5 text-[var(--accent-primary)]" />
                      <div>
                        <a
                          href={selectedMeeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent-primary)] hover:underline flex items-center gap-1 leading-none"
                        >
                          Join Remote Session <LinkIcon className="h-3 w-3" />
                        </a>
                        <p className="text-[10px] text-[var(--text-muted)]">Meeting URL Link</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)]">
                    <UserIcon className="h-4.5 w-4.5 text-[var(--accent-primary)]" />
                    <div>
                      <p className="text-[var(--text-primary)]">{selectedMeeting.organizer.full_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Organizer ({selectedMeeting.organizer.role})</p>
                    </div>
                  </div>
                </div>

                {/* RSVP Decision Bar for user */}
                {(() => {
                  const currentUserParticipant = selectedMeeting.participants.find(
                    (p) => p.user_id === authUser?.id
                  );
                  const isInvited = Boolean(currentUserParticipant);
                  const isOrganizer = selectedMeeting.organizer_id === authUser?.id;
                  const isCancelled = selectedMeeting.status === 'cancelled';

                  if (isOrganizer) {
                    return (
                      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Your Role</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20">
                            Organizer
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-semibold">
                          You created this meeting.
                        </p>
                      </div>
                    );
                  }

                  if (!isInvited) {
                    return (
                      <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Your RSVP status</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border bg-[var(--status-danger-bg)]/20 text-[var(--status-danger-text)] border-[var(--status-danger-border)]/20">
                            Not Invited
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-semibold">
                          You are not invited to this meeting.
                        </p>
                      </div>
                    );
                  }

                  // Invited Participant
                  const status = currentUserParticipant.response_status;

                  return (
                    <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Your RSVP status</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          status === 'accepted'
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]'
                            : status === 'declined'
                            ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]'
                            : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]'
                        }`}>
                          {status}
                        </span>
                      </div>

                      {!isCancelled ? (
                        <div className="flex gap-2">
                          {(status === 'pending' || status === 'declined') && (
                            <Button
                              variant="outline"
                              onClick={() => handleRSVP(selectedMeeting.id, 'accepted')}
                              className="flex-1 text-xs py-2 rounded-xl text-[var(--status-success-text)] border-[var(--status-success-border)] hover:bg-[var(--status-success-text)]/10 font-extrabold flex items-center justify-center gap-1"
                            >
                              <Check className="h-3.5 w-3.5" /> Accept
                            </Button>
                          )}
                          {(status === 'pending' || status === 'accepted') && (
                            <Button
                              variant="outline"
                              onClick={() => handleRSVP(selectedMeeting.id, 'declined')}
                              className="flex-1 text-xs py-2 rounded-xl text-[var(--status-danger-text)] border-[var(--status-danger-border)] hover:bg-[var(--status-danger-text)]/10 font-extrabold flex items-center justify-center gap-1"
                            >
                              <X className="h-3.5 w-3.5" /> Decline
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--status-danger-text)] font-semibold">
                          This meeting has been cancelled.
                        </p>
                      )}
                    </div>
                  );
                })()}


                {/* Participant roster (No UUIDs!) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
                    <Users className="h-4 w-4" /> Invited Participants ({selectedMeeting.participants.length})
                  </h4>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {selectedMeeting.participants.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{part.user.full_name}</p>
                          <p className="text-[9px] text-[var(--text-muted)] truncate">{part.user.email}</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border leading-none ${
                          part.response_status === 'accepted'
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]'
                            : part.response_status === 'declined'
                            ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]'
                            : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]'
                        }`}>
                          {part.response_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface)]/50">
                <CalendarIcon className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
                <p className="text-xs font-bold text-[var(--text-secondary)]">No meeting selected</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Click any meeting event to see participant statuses, URLs, and RSVP actions.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* CREATE MEETING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-6 top-6 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Schedule Boardroom / Sync Meeting</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Fill in standard metadata, dates, URLs, and select invitees. Invites will fire system alerts.
              </p>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Strategy Sync"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Description / Agenda
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize objectives, requirements or attach docs links."
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Start Date & Time *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full sm:min-w-[150px] min-w-0 px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    End Date & Time *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full sm:min-w-[150px] min-w-0 px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Physical Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Conference Room A"
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Meeting URL Link
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="e.g. https://meet.google.com/abc-defg-hij"
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Participant Multi Selector */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Invite Roster * ({selectedParticipants.length} selected)
                </label>
                
                <input
                  type="text"
                  placeholder="Search participants by name or email..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold focus:outline-none focus:border-[var(--accent-primary)] mb-3"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1 border border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface)]/30">
                  {filteredUsers.length === 0 ? (
                    <div className="col-span-2 text-center py-4 text-xs text-[var(--text-muted)] italic">
                      No active users found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedParticipants.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleParticipant(u.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                              : 'border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)]'
                          }`}
                        >
                          <div className="min-w-0 truncate">
                            <p className="text-xs font-black truncate">
                              {u.full_name} — {u.role} — {u.email}
                            </p>
                          </div>
                          
                          <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                              : 'border-[var(--border-default)]'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
                <Button
                  type="button"
                  variant="outline"
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-[var(--border-default)] text-[var(--text-secondary)]"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl text-xs font-extrabold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white shadow-lg"
                >
                  {actionLoading ? 'Scheduling...' : 'Confirm Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEETING MODAL */}
      {showEditModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-6 top-6 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Edit Sync Meeting Details</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Updates will trigger system alerts for all invited participants.
              </p>
            </div>

            <form onSubmit={handleUpdateMeeting} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Description / Agenda
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Start Date & Time *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none"
                    />
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full sm:min-w-[150px] min-w-0 px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    End Date & Time *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none"
                    />
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full sm:min-w-[150px] min-w-0 px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Physical Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Meeting URL Link
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm"
                  />
                </div>
              </div>

              {/* Participant Multi Selector */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Invite Roster ({selectedParticipants.length} selected)
                </label>
                
                <input
                  type="text"
                  placeholder="Search participants by name or email..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold focus:outline-none mb-3"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar p-1 border border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface)]/30">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedParticipants.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleParticipant(u.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isSelected
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--text-primary)]'
                            : 'border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)]'
                        }`}
                      >
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-black truncate">
                            {u.full_name} — {u.role} — {u.email}
                          </p>
                        </div>
                        
                        <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                            : 'border-[var(--border-default)]'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
                <Button
                  type="button"
                  variant="outline"
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold border border-[var(--border-default)] text-[var(--text-secondary)]"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl text-xs font-extrabold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white shadow-lg"
                >
                  {actionLoading ? 'Saving...' : 'Save Updates'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
