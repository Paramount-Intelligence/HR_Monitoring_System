'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supportApi, SupportTicket, SupportTicketComment, SupportTicketCreateInput, SupportTicketUpdateInput } from '@/lib/api/support';
import { getErrorMessage } from '@/lib/api/client';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Clock,
  User as UserIcon,
  Tag,
  AlertTriangle,
  CheckCircle,
  X,
  Search,
  SlidersHorizontal,
  Send,
  UserCheck,
  RotateCcw,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { EmployeePageShell } from '@/components/employee/EmployeePageShell';
import { EmployeePageHeader } from '@/components/employee/EmployeePageHeader';

export default function HelpSupportPage() {
  const { user: authUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeStaff, setActiveStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Filtering and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  
  // Selected state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  
  // Ticket Form states
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'account_access' | 'attendance' | 'tasks' | 'leave_wfh' | 'payroll_hr' | 'technical_issue' | 'other'>('technical_issue');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('low');
  const [description, setDescription] = useState('');
  
  // Comment Form state
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await supportApi.getTickets();
      setTickets(data);
      
      // Keep selected ticket in sync if open
      if (selectedTicket) {
        const updatedSelected = data.find((t) => t.id === selectedTicket.id);
        if (updatedSelected) {
          setSelectedTicket(updatedSelected);
        }
      }
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff for assignment dropdown (Admin/HR only)
  const fetchStaff = async () => {
    if (authUser?.role === 'admin' || authUser?.role === 'hr_operations') {
      try {
        const data = await usersApi.getUsers();
        // Filters active admins and HR staff
        setActiveStaff(data.filter((u) => u.status === 'active' && (u.role === 'admin' || u.role === 'hr_operations')));
      } catch (err) {
        console.error('Failed to load support staff:', err);
      }
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchTickets();
      fetchStaff();
    }
  }, [authUser]);

  // Handle ticket creation
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!subject.trim()) {
      setErrorMsg('Subject is required.');
      return;
    }
    if (!category) {
      setErrorMsg('Please select a category.');
      return;
    }
    if (!priority) {
      setErrorMsg('Please select a priority.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Description is required.');
      return;
    }

    try {
      setActionLoading(true);
      const payload: SupportTicketCreateInput = {
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      };

      const created = await supportApi.createTicket(payload);
      setSuccessMsg('Support ticket created successfully.');
      setTickets([created, ...tickets]);
      setSelectedTicket(created);
      setShowCreateModal(false);
      
      // Reset form
      setSubject('');
      setDescription('');
      setCategory('technical_issue');
      setPriority('low');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setErrorMsg('You do not have permission to create support tickets.');
      } else {
        setErrorMsg(getErrorMessage(err) || 'Unable to create support ticket. Please try again.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle adding comments
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setCommentLoading(true);
      const updated = await supportApi.addComment(selectedTicket.id, {
        message: newComment.trim(),
        is_internal: isInternalComment,
      });

      // Update locally
      setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
      setSelectedTicket(updated);
      setNewComment('');
      setIsInternalComment(false);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setCommentLoading(false);
    }
  };

  // Administrative / User updates
  const handleUpdateStatus = async (status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed') => {
    if (!selectedTicket) return;
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await supportApi.updateTicket(selectedTicket.id, { status });
      setSuccessMsg(`Ticket status updated to ${status.replace('_', ' ').toUpperCase()}.`);
      setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
      setSelectedTicket(updated);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleUpdatePriority = async (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    if (!selectedTicket) return;
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await supportApi.updateTicket(selectedTicket.id, { priority });
      setSuccessMsg(`Ticket priority updated to ${priority.toUpperCase()}.`);
      setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
      setSelectedTicket(updated);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleAssignTicket = async (assignedToId: string | null) => {
    if (!selectedTicket) return;
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await supportApi.updateTicket(selectedTicket.id, { assigned_to_id: assignedToId });
      setSuccessMsg(assignedToId ? 'Support agent successfully assigned.' : 'Ticket unassigned.');
      setTickets(tickets.map((t) => (t.id === selectedTicket.id ? updated : t)));
      setSelectedTicket(updated);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  // Helper Labels & Styles
  const getCategoryLabel = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'technical_issue':
        return 'Technical Issue';
      case 'payroll_hr':
        return 'Payroll & HR';
      case 'attendance':
        return 'Attendance';
      case 'leave_wfh':
        return 'Leave & WFH';
      case 'tasks':
        return 'Tasks & Projects';
      case 'account_access':
        return 'Account Access';
      case 'other':
        return 'Other Support';
      default:
        return cat.replace('_', ' ');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]';
      case 'in_progress':
        return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20';
      case 'resolved':
        return 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]';
      case 'closed':
        return 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-default)]';
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'bg-[var(--bg-subtle)] text-[var(--text-muted)]';
      case 'medium':
        return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]';
      case 'high':
        return 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]';
      case 'urgent':
        return 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] animate-pulse';
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]';
    }
  };

  const formatTicketDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filters logic
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticket_number.toString().includes(searchTerm) ||
      t.created_by.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const isStaff = authUser?.role === 'admin' || authUser?.role === 'hr_operations';

  return (
    <EmployeePageShell>
      <EmployeePageHeader
        title="Help & Support"
        subtitle="Submit tickets and track support requests"
        icon={HelpCircle}
        actions={
          <Button size="sm" className="rounded-lg text-xs" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Submit Ticket
          </Button>
        }
      />

      {/* Alert Banners */}
      {(successMsg || errorMsg) && (
        <div
          className={`p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            successMsg
              ? 'border-[var(--status-success-text)]/20 bg-[var(--status-success-text)]/10 text-[var(--status-success-text)]'
              : 'border-[var(--status-danger-text)]/20 bg-[var(--status-danger-text)]/10 text-[var(--status-danger-text)]'
          }`}
        >
          <p className="text-sm font-bold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 animate-pulse" />
            {successMsg || errorMsg}
          </p>
        </div>
      )}

      {/* Main Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Support Tickets list (Left Column) */}
        <div className={`lg:col-span-1 space-y-4 ${selectedTicket ? 'hidden lg:block' : 'block'}`}>
          <Card className="p-4 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search subject or number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl border transition-all ${
                  showFilters
                    ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Collapsible filters pane */}
            {showFilters && (
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)]/50 border border-[var(--border-default)] space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-1.5 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-1.5 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="technical_issue">Technical Issue</option>
                    <option value="payroll_hr">Payroll & HR Inquiry</option>
                    <option value="attendance">Attendance Query</option>
                    <option value="leave_wfh">Leave & WFH Request</option>
                    <option value="tasks">Tasks & Projects Support</option>
                    <option value="account_access">Account Access Issue</option>
                    <option value="other">Other Support</option>
                  </select>
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-2 max-h-[550px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-[var(--bg-surface)] animate-pulse rounded-xl border border-[var(--border-default)]" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-surface)]/50">
                  <MessageSquare className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-bold text-[var(--text-secondary)]">No tickets found</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Submit an issue using the top submit button.</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-2xl border cursor-pointer select-none transition-all duration-200 space-y-2 hover:border-[var(--accent-primary)] ${
                        isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-sm'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">
                          #{ticket.ticket_number} • {getCategoryLabel(ticket.category)}
                        </span>
                        
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border leading-none ${getStatusBadge(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-xs font-black text-[var(--text-primary)] line-clamp-1 leading-snug">
                        {ticket.subject}
                      </h3>

                      <div className="flex justify-between items-center text-[9px] font-bold text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-2.5 w-2.5" />
                          {ticket.created_by.full_name}
                        </span>
                        <span>{formatTicketDate(ticket.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Support ticket discussion thread (Right Columns) */}
        <div className={`lg:col-span-2 space-y-6 ${selectedTicket ? 'block' : 'hidden lg:block'}`}>
          {selectedTicket ? (
            <Card className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] backdrop-blur-xl h-full flex flex-col justify-between space-y-6">
              
              {/* Back button on mobile */}
              <div className="lg:hidden mb-2">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="h-8 rounded-xl border border-[var(--border-default)] text-xs font-bold gap-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]" 
                  onClick={() => setSelectedTicket(null)}
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Tickets
                </Button>
              </div>

              {/* Thread Header */}
              <div className="space-y-4 pb-4 border-b border-[var(--border-default)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                      Ticket #{selectedTicket.ticket_number} • {getCategoryLabel(selectedTicket.category)}
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mt-1">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-xl border leading-none ${getStatusBadge(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-lg ${getPriorityBadge(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 bg-[var(--bg-surface)] p-3 rounded-2xl border border-[var(--border-default)] text-xs font-bold text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-[10px] font-black uppercase shadow-sm shrink-0">
                      {selectedTicket.created_by.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] truncate">{selectedTicket.created_by.full_name}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">Submitted ({selectedTicket.created_by.role})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-[var(--accent-primary)]" />
                    <div>
                      {selectedTicket.assigned_to ? (
                        <>
                          <p className="text-[var(--text-primary)] truncate">{selectedTicket.assigned_to.full_name}</p>
                          <p className="text-[9px] text-[var(--text-muted)]">Assigned Agent</p>
                        </>
                      ) : (
                        <p className="text-[var(--text-muted)] italic">Unassigned Ticket</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Administrative Controls Panel for Admin/HR */}
                {isStaff && (
                  <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">HR Operations & Admin Control Panel</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">Assignee</label>
                        <select
                          value={selectedTicket.assigned_to_id || ''}
                          onChange={(e) => handleAssignTicket(e.target.value || null)}
                          className="w-full p-1.5 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                          <option value="">Unassign Ticket</option>
                          {activeStaff.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.full_name} ({st.role === 'admin' ? 'Admin' : 'HR'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">Update Status</label>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateStatus(e.target.value as any)}
                          className="w-full p-1.5 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">Update Priority</label>
                        <select
                          value={selectedTicket.priority}
                          onChange={(e) => handleUpdatePriority(e.target.value as any)}
                          className="w-full p-1.5 text-xs font-bold rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Creator close action */}
                {!isStaff && selectedTicket.created_by_id === authUser?.id && selectedTicket.status.toLowerCase() !== 'closed' && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('closed')}
                    className="text-xs py-1.5 px-3 border border-[var(--status-danger-border)] hover:bg-[var(--status-danger-bg)]/20 text-[var(--status-danger-text)] rounded-xl font-bold flex items-center gap-1.5 w-fit"
                  >
                    <Check className="h-3.5 w-3.5" /> Close Support Ticket
                  </Button>
                )}
              </div>

              {/* Discussion Timeline feed */}
              <div className="flex-1 space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-2 py-4">
                
                {/* Initial Description Card */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-[var(--text-muted)]">
                    <span>Problem Description</span>
                    <span>{formatTicketDate(selectedTicket.created_at)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Dynamic comment items (No UUIDs!) */}
                {selectedTicket.comments.map((comment) => {
                  const commentAuthorIsStaff = comment.author.role === 'admin' || comment.author.role === 'hr_operations';
                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-2xl border space-y-2 animate-in fade-in slide-in-from-bottom-2 ${
                        comment.is_internal
                          ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]/5 shadow-sm'
                          : commentAuthorIsStaff
                          ? 'border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 shadow-sm'
                          : 'border-[var(--border-default)] bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-[8px] font-black uppercase">
                            {comment.author.full_name.charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-black text-[var(--text-primary)]">
                              {comment.author.full_name}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ml-2 border-[var(--border-default)] bg-[var(--bg-surface)]">
                              {comment.author.role.replace('_', ' ')}
                            </span>
                            
                            {comment.is_internal && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-[var(--status-warning-text)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]/10 px-1.5 py-0.5 rounded ml-2">
                                Internal Staff Only
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <span className="text-[9px] text-[var(--text-muted)] font-bold">
                          {formatTicketDate(comment.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed pl-7">
                        {comment.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form (only on open tickets) */}
              {selectedTicket.status.toLowerCase() === 'closed' ? (
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-center text-xs font-bold text-[var(--text-muted)]">
                  This ticket has been marked closed and resolved. Replies are deactivated.
                </div>
              ) : (
                <form onSubmit={handleAddComment} className="pt-4 border-t border-[var(--border-default)] space-y-3">
                  <div className="flex items-start gap-3">
                    <textarea
                      required
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Compose a supportive reply or request updates..."
                      className="flex-1 px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors min-h-[50px] max-h-[120px]"
                    />
                    
                    <Button
                      type="submit"
                      disabled={commentLoading}
                      className="p-3.5 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white flex items-center justify-center shrink-0 shadow-lg shadow-[var(--accent-primary)]/15"
                    >
                      <Send className="h-4.5 w-4.5" />
                    </Button>
                  </div>

                  {isStaff && (
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-black uppercase text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                        className="rounded border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--accent-primary)]"
                      />
                      Add as Admin/HR Internal Comment (Hidden from Creator)
                    </label>
                  )}
                </form>
              )}

            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 border border-dashed border-[var(--border-default)] rounded-3xl bg-[var(--bg-surface)]/10 h-full min-h-[400px]">
              <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mb-3 animate-pulse" />
              <h3 className="text-sm font-black text-[var(--text-secondary)]">No Ticket Opened</h3>
              <p className="text-xs text-[var(--text-muted)] text-center mt-1 max-w-sm">
                Select any support ticket on the dashboard to converse, inspect ticket assignments, or update ticket priorities.
              </p>
            </div>
          )}
        </div>
        
      </div>

      {/* TICKET SUBMIT CREATE MODAL */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleCreateTicket} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Submit Support Request</DialogTitle>
              <DialogDescription>
                Your ticket will be routed to support staff. You will be notified upon reply.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Broken office chair / VPN connection timeouts"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Ticket Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    <option value="technical_issue">Technical Issue</option>
                    <option value="payroll_hr">Payroll & HR Inquiry</option>
                    <option value="attendance">Attendance Query</option>
                    <option value="leave_wfh">Leave & WFH Request</option>
                    <option value="tasks">Tasks & Projects Support</option>
                    <option value="account_access">Account Access Issue</option>
                    <option value="other">Other Support</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                    Issue Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                  Description of Issue *
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your query or problem in full so support staff can resolve it efficiently."
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm focus:outline-none focus:border-[var(--accent-primary)] min-h-[120px]"
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </EmployeePageShell>
  );
}
