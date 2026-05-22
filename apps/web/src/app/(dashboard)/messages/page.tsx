'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { usersApi } from '@/lib/api/users';
import {
  messagesApi,
  Conversation,
  Message,
  ConversationType,
  ConversationParticipant,
  ConversationParticipantRole,
  UserMinimal,
} from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  Send, Search, Plus, Hash, User, Users, Briefcase, CheckSquare,
  Calendar, AlertCircle, Edit2, Trash2, Loader2, Sparkles, Smile, Info,
  MessageSquare, ChevronRight, X, UserCheck, Bell, BellOff,
  UserPlus, Settings, Shield, ShieldCheck, ShieldOff, Crown, Eye, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Permission helpers ───────────────────────────────────────────────────────

function getMyParticipant(conv: Conversation | null, userId: string | undefined): ConversationParticipant | null {
  if (!conv || !userId) return null;
  return conv.participants.find(p => p.user_id === userId) ?? null;
}

function isAdminOrOwner(role: ConversationParticipantRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

function canSend(conv: Conversation | null, myRole: ConversationParticipantRole | undefined): boolean {
  if (!conv || !myRole) return false;
  if (conv.type === 'channel') return isAdminOrOwner(myRole);
  if (conv.type === 'group') {
    if (conv.who_can_send_messages === 'admins_only') return isAdminOrOwner(myRole);
    return myRole !== 'viewer';
  }
  return true;
}

function sendBlockedReason(conv: Conversation | null, myRole: ConversationParticipantRole | undefined): string | null {
  if (canSend(conv, myRole)) return null;
  if (!conv) return null;
  if (conv.type === 'channel') return 'Only channel admins can post in this channel.';
  if (conv.type === 'group') return 'Only group admins can send messages in this group.';
  return 'You do not have permission to send messages here.';
}

function roleBadge(role: ConversationParticipantRole) {
  switch (role) {
    case 'owner': return { label: 'Owner', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'admin': return { label: 'Admin', cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'member': return { label: 'Member', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'viewer': return { label: 'Viewer', cls: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-default)]' };
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

function MessagesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Core state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [mentionableUsers, setMentionableUsers] = useState<any[]>([]);

  // Browser notifications states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');

  const notifiedMessageIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Input fields
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create conversation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newConvType, setNewConvType] = useState<ConversationType>('direct');
  const [newConvTitle, setNewConvTitle] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [submittingConv, setSubmittingConv] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group' | 'channel' | 'context'>('all');

  // Mention system
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  // ─── Manage Members Modal state ──────────────────────────────────────────
  const [showManageModal, setShowManageModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addMemberSelection, setAddMemberSelection] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null); // userId
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageSuccess, setManageSuccess] = useState<string | null>(null);

  // ─── Settings Modal state ────────────────────────────────────────────────
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsWhoCanSend, setSettingsWhoCanSend] = useState<'all_members' | 'admins_only'>('all_members');
  const [settingsWhoCanEdit, setSettingsWhoCanEdit] = useState<'all_members' | 'admins_only'>('admins_only');
  const [settingsWhoCanAdd, setSettingsWhoCanAdd] = useState<'all_members' | 'admins_only'>('admins_only');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // ─── Computed active conversation ────────────────────────────────────────
  const activeConv = conversations.find(c => c.id === selectedConversationId) ?? null;
  const myParticipant = getMyParticipant(activeConv, user?.id);
  const myRole = myParticipant?.role;
  const isMeAdminOrOwner = isAdminOrOwner(myRole);
  const canISend = canSend(activeConv, myRole);
  const sendRestrictionMsg = sendBlockedReason(activeConv, myRole);
  const canIAddMembers = isMeAdminOrOwner || activeConv?.who_can_add_members === 'all_members';
  const canIManageSettings = isMeAdminOrOwner;
  const isGroupOrChannel = activeConv?.type === 'group' || activeConv?.type === 'channel';

  // Ref to always hold the latest selected conversation ID for intervals
  const latestSelectedConvId = useRef<string | null>(null);
  useEffect(() => {
    latestSelectedConvId.current = selectedConversationId;
  }, [selectedConversationId]);

  // Initialize browser notifications state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
      const savedSetting = localStorage.getItem('pims_browser_notifications_enabled');
      setNotificationsEnabled(savedSetting === 'true' && Notification.permission === 'granted');
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Browser notifications are not supported in this browser.');
      return;
    }
    if (Notification.permission === 'denied') {
      alert('Browser notifications have been blocked. Please enable them in your browser preferences.');
      return;
    }
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      const enabled = permission === 'granted';
      localStorage.setItem('pims_browser_notifications_enabled', enabled ? 'true' : 'false');
      setNotificationsEnabled(enabled);
    } else {
      const nextState = !notificationsEnabled;
      localStorage.setItem('pims_browser_notifications_enabled', nextState ? 'true' : 'false');
      setNotificationsEnabled(nextState);
    }
  };

  const handleNotificationsForConversations = (convList: Conversation[]) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const isEnabled =
      localStorage.getItem('pims_browser_notifications_enabled') === 'true' &&
      Notification.permission === 'granted';

    convList.forEach(conv => {
      const lm = conv.last_message;
      if (!lm) return;
      if (isFirstLoad.current) { notifiedMessageIds.current.add(lm.id); return; }
      if (lm.sender_id === user?.id) { notifiedMessageIds.current.add(lm.id); return; }
      if (isEnabled && !notifiedMessageIds.current.has(lm.id)) {
        notifiedMessageIds.current.add(lm.id);
        const truncatedBody = lm.body.length > 80 ? `${lm.body.slice(0, 80)}...` : lm.body;
        const title = conv.type === 'direct'
          ? `New message from ${lm.sender_name}`
          : `[${conv.title || 'Group'}] ${lm.sender_name}`;
        try {
          const notif = new Notification(title, { body: truncatedBody, icon: '/logo.png' });
          notif.onclick = () => { window.focus(); setSelectedConversationId(conv.id); router.replace(`/messages?conversation_id=${conv.id}`); };
        } catch (e) { console.warn('[Notification] Failed:', e); }
      }
    });
    if (isFirstLoad.current && convList.length > 0) isFirstLoad.current = false;
  };

  // Poll & directory loading
  useEffect(() => {
    loadConversations();
    loadActiveDirectory();
    const interval = setInterval(pollUpdates, 15000);
    return () => clearInterval(interval);
  }, []);

  const queryConvId = searchParams.get('conversation_id');
  useEffect(() => {
    if (queryConvId && queryConvId !== selectedConversationId) {
      setSelectedConversationId(queryConvId);
    }
  }, [queryConvId]);

  useEffect(() => {
    if (loadingConvs) return;
    if (isMobile) return;
    if (!selectedConversationId && !queryConvId && conversations.length > 0) {
      const firstId = conversations[0].id;
      setSelectedConversationId(firstId);
      router.replace(`/messages?conversation_id=${firstId}`);
    }
  }, [conversations, selectedConversationId, queryConvId, loadingConvs, isMobile]);

  // Load messages + mark read + mentionable users on conversation change
  useEffect(() => {
    if (!selectedConversationId) { setMessages([]); setMentionableUsers([]); return; }
    let active = true;

    const fetchThread = async () => {
      try {
        setLoadingMsgs(true); setError(null); setMessages([]);
        const data = await messagesApi.getMessages(selectedConversationId, { limit: 50 });
        if (active) setMessages(data);
      } catch (err) { if (active) setError(getErrorMessage(err)); }
      finally { if (active) setLoadingMsgs(false); }
    };

    const markRead = async () => {
      try {
        await messagesApi.markConversationRead(selectedConversationId);
        if (active) {
          setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, unread_count: 0 } : c));
          window.dispatchEvent(new Event('pims-messages-unread-update'));
        }
      } catch (err) { console.error('[Messages] Mark read error:', err); }
    };

    const fetchMentionable = async () => {
      try {
        const data = await messagesApi.getMentionableUsers(selectedConversationId);
        if (active) setMentionableUsers(data);
      } catch (err) { console.error('[Messages] Mentionable users error:', err); }
    };

    fetchThread(); markRead(); fetchMentionable();
    return () => { active = false; };
  }, [selectedConversationId]);

  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const data = await messagesApi.getConversations();
      setConversations(data);
      handleNotificationsForConversations(data);
      setError(null);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoadingConvs(false); }
  };

  const loadActiveDirectory = async () => {
    try {
      const data = await usersApi.getActiveDirectory();
      setUsersList(data.filter((u: any) => u.id !== user?.id));
    } catch (err) { console.error('[Messages] Directory error:', err); }
  };

  const pollUpdates = async () => {
    try {
      const data = await messagesApi.getConversations();
      setConversations(data);
      handleNotificationsForConversations(data);
      const activeId = latestSelectedConvId.current;
      if (activeId) {
        const freshMsgs = await messagesApi.getMessages(activeId, { limit: 50 });
        setMessages(freshMsgs);
      }
    } catch (err) { console.warn('[Messages Polling] Failed:', err); }
  };

  const loadMessages = async (convId: string) => {
    try {
      setLoadingMsgs(true); setError(null); setMessages([]);
      const data = await messagesApi.getMessages(convId, { limit: 50 });
      setMessages(data);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoadingMsgs(false); }
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConversationId(convId);
    router.replace(`/messages?conversation_id=${convId}`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || !newMessage.trim() || isSending || !canISend) return;
    try {
      setIsSending(true); setError(null);
      const mentioned_user_ids: string[] = [];
      mentionableUsers.forEach(u => {
        if (newMessage.includes(`@${u.full_name}`) && u.id) mentioned_user_ids.push(u.id);
      });
      const sentMsg = await messagesApi.sendMessage(selectedConversationId, { body: newMessage, mentioned_user_ids });
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, updated_at: new Date().toISOString() } : c));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setIsSending(false); }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newConvType !== 'direct' && !newConvTitle.trim()) return;
    if (selectedParticipants.length === 0) return;
    try {
      setSubmittingConv(true); setError(null);
      const newConv = await messagesApi.createConversation({
        type: newConvType,
        title: newConvType === 'direct' ? undefined : newConvTitle,
        participant_ids: selectedParticipants,
      });
      setConversations(prev => [newConv, ...prev]);
      setShowCreateModal(false); setNewConvTitle(''); setSelectedParticipants([]);
      handleSelectConversation(newConv.id);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSubmittingConv(false); }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => {
      if (newConvType === 'direct') return [userId];
      return prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
    });
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await messagesApi.deleteMessage(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) { alert(getErrorMessage(err)); }
  };

  // ─── Manage Members actions ─────────────────────────────────────────────

  const refreshActiveConv = async () => {
    if (!selectedConversationId) return;
    try {
      const fresh = await messagesApi.getConversation(selectedConversationId);
      setConversations(prev => prev.map(c => c.id === selectedConversationId ? fresh : c));
    } catch {}
  };

  const openManageModal = () => {
    setManageError(null); setManageSuccess(null);
    setMemberSearch(''); setAddMemberSelection([]);
    setShowManageModal(true);
  };

  const handleAddMembers = async () => {
    if (!activeConv || addMemberSelection.length === 0) return;
    try {
      setIsAddingMembers(true); setManageError(null);
      await messagesApi.addConversationParticipants(activeConv.id, addMemberSelection);
      setManageSuccess('Members added successfully.');
      setAddMemberSelection([]);
      await refreshActiveConv();
    } catch (err) { setManageError(getErrorMessage(err)); }
    finally { setIsAddingMembers(false); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeConv) return;
    if (!confirm('Remove this member from the conversation?')) return;
    try {
      setMemberActionLoading(userId); setManageError(null);
      await messagesApi.removeConversationParticipant(activeConv.id, userId);
      setManageSuccess('Member removed.');
      await refreshActiveConv();
    } catch (err) { setManageError(getErrorMessage(err)); }
    finally { setMemberActionLoading(null); }
  };

  const handlePromoteMember = async (userId: string, newRole: ConversationParticipantRole) => {
    if (!activeConv) return;
    try {
      setMemberActionLoading(userId); setManageError(null);
      await messagesApi.updateConversationParticipantRole(activeConv.id, userId, newRole);
      setManageSuccess(`Role updated to ${newRole}.`);
      await refreshActiveConv();
    } catch (err) { setManageError(getErrorMessage(err)); }
    finally { setMemberActionLoading(null); }
  };

  // ─── Settings modal actions ─────────────────────────────────────────────

  const openSettingsModal = () => {
    if (!activeConv) return;
    setSettingsTitle(activeConv.title || '');
    setSettingsWhoCanSend((activeConv.who_can_send_messages as any) || 'all_members');
    setSettingsWhoCanEdit((activeConv.who_can_edit_group_info as any) || 'admins_only');
    setSettingsWhoCanAdd((activeConv.who_can_add_members as any) || 'admins_only');
    setSettingsError(null);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv) return;
    try {
      setIsSavingSettings(true); setSettingsError(null);
      const updated = await messagesApi.updateConversationSettings(activeConv.id, {
        title: settingsTitle || undefined,
        who_can_send_messages: settingsWhoCanSend,
        who_can_edit_group_info: settingsWhoCanEdit,
        who_can_add_members: settingsWhoCanAdd,
      });
      setConversations(prev => prev.map(c => c.id === activeConv.id ? updated : c));
      setShowSettingsModal(false);
    } catch (err) { setSettingsError(getErrorMessage(err)); }
    finally { setIsSavingSettings(false); }
  };

  // ─── Mention picker ─────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    const cursorIdx = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorIdx);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@') && activeConv?.type !== 'direct') {
      setMentionFilter(lastWord.slice(1));
      setShowMentionPicker(true);
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleSelectMention = (fullName: string) => {
    const words = newMessage.split(' ');
    words[words.length - 1] = `@${fullName} `;
    setNewMessage(words.join(' '));
    setShowMentionPicker(false);
  };

  const filteredMentionUsers = mentionableUsers.filter(u =>
    u.full_name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // ─── Utility helpers ────────────────────────────────────────────────────

  const getConvIcon = (type: ConversationType) => {
    switch (type) {
      case 'direct': return <User className="h-4 w-4" />;
      case 'group': return <Users className="h-4 w-4" />;
      case 'channel': return <Hash className="h-4 w-4" />;
      case 'task_thread': return <CheckSquare className="h-4 w-4" />;
      case 'project_thread': return <Briefcase className="h-4 w-4" />;
      case 'meeting_thread': return <Calendar className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getConvTypeLabel = (type: ConversationType) => {
    if (type === 'direct') return 'DM';
    if (type === 'group') return 'Group';
    if (type === 'channel') return 'Channel';
    if (type.endsWith('_thread')) return type.split('_')[0].toUpperCase();
    return 'Chat';
  };

  // Filter conversations by tab and search
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true;
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'direct') return c.type === 'direct' && matchesSearch;
    if (activeTab === 'group') return c.type === 'group' && matchesSearch;
    if (activeTab === 'channel') return c.type === 'channel' && matchesSearch;
    if (activeTab === 'context') return c.type.endsWith('_thread') && matchesSearch;
    return matchesSearch;
  });

  // Users available to add (not already in current conversation)
  const existingParticipantIds = new Set(activeConv?.participants.map(p => p.user_id) ?? []);
  const addableUsers = usersList.filter((u: any) => !existingParticipantIds.has(u.id));
  const filteredAddableUsers = addableUsers.filter((u: any) =>
    u.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-6 overflow-hidden app-page">

      {/* ═══ Left panel: Conversations List ═══ */}
      <div className={cn("flex flex-col w-full lg:w-80 xl:w-96 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] overflow-hidden shrink-0", selectedConversationId ? "hidden lg:flex" : "flex")}>
        {/* Header and Actions */}
        <div className="p-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]/30 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--accent-primary)]" /> Messages
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 rounded-xl border-[var(--border-default)] transition-all ${
                  notificationsEnabled
                    ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5 hover:bg-[var(--accent-primary)]/10'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
                }`}
                onClick={handleToggleNotifications}
                title={
                  permissionStatus === 'denied'
                    ? 'Notifications Blocked'
                    : notificationsEnabled ? 'Disable Browser Notifications' : 'Enable Browser Notifications'
                }
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)]"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)]/30 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tab filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {(['all', 'direct', 'group', 'channel', 'context'] as const).map(tab => (
              <button
                key={tab}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border leading-none transition-all shrink-0 ${
                  activeTab === tab
                    ? 'bg-[var(--accent-primary)] text-white border-transparent'
                    : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)]'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {loadingConvs ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] font-semibold flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]" /> Syncing conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)] italic font-semibold space-y-2">
              <Info className="h-8 w-8 mx-auto text-[var(--text-secondary)] opacity-60" />
              <p>No conversations found.</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isSelected = activeConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[var(--bg-sidebar-active)]/80 text-[var(--text-primary)] border-[var(--accent-primary)] shadow-sm'
                      : 'bg-transparent hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-primary)] border-transparent'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]'
                  }`}>
                    {getConvIcon(conv.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black truncate text-[var(--text-primary)]">
                        {conv.title || 'Direct Message'}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                        {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-secondary)] truncate leading-none">
                        {getConvTypeLabel(conv.type)} Chat
                      </span>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] text-[9px] font-black border border-[var(--border-default)] flex items-center justify-center shadow-sm">
                          {conv.unread_count}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ Main panel: Chat area ═══ */}
      <div className={cn("flex-1 flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-soft)] overflow-hidden", selectedConversationId ? "flex" : "hidden lg:flex")}>
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-elevated)]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(null);
                    router.replace('/messages');
                  }}
                  className="lg:hidden p-1 mr-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)] transition-all shrink-0"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 shadow-sm">
                  {getConvIcon(activeConv.type)}
                </div>
                <div>
                  <h2 className="text-sm font-black text-[var(--text-primary)] mb-0.5">
                    {activeConv.title || 'Direct Message'}
                  </h2>
                  <p className="text-[10px] text-[var(--text-secondary)] font-semibold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {activeConv.participants.length} participants
                    {myRole && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase ${roleBadge(myRole).cls}`}>
                        {roleBadge(myRole).label}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header action buttons — only for group/channel */}
              {isGroupOrChannel && (
                <div className="flex items-center gap-2">
                  {canIAddMembers && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-xs font-bold gap-1.5"
                      onClick={openManageModal}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Members
                    </Button>
                  )}
                  {canIManageSettings && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)]"
                      onClick={openSettingsModal}
                      title="Group/Channel Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Error alert */}
            {error && messages.length > 0 && (
              <div className="m-4 p-4 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center gap-3 animate-in fade-in duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">{error}</span>
              </div>
            )}

            {/* Message log */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-[var(--bg-surface-elevated)]/20">
              {loadingMsgs ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)] font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" /> Synchronizing thread...
                </div>
              ) : error ? (
                <div className="py-24 text-center text-xs text-[var(--text-muted)] font-semibold space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto shadow-md">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[var(--text-primary)] font-black uppercase tracking-wider text-xs">Unable to load conversation.</p>
                    <p className="text-[var(--text-secondary)] text-[10px] max-w-sm mx-auto font-semibold leading-relaxed">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-xs font-bold gap-2"
                    onClick={() => loadMessages(activeConv.id)}
                  >
                    Please try again
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-24 text-center text-xs text-[var(--text-muted)] italic font-semibold space-y-2">
                  <Info className="h-10 w-10 mx-auto text-[var(--text-secondary)] opacity-60" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isSelf = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 max-w-[85%] lg:max-w-[80%] ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      <Avatar className="h-8 w-8 shrink-0 shadow-sm ring-1 ring-[var(--border-default)]">
                        <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-[10px] font-black text-white">
                          {msg.sender.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] font-black text-[var(--text-primary)]">{msg.sender.full_name}</span>
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed border shadow-sm ${
                          isSelf
                            ? 'bg-[#1E2E54] text-white border-[#2E3F6E]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.body}</p>
                        </div>
                        {isSelf && (
                          <div className="flex items-center justify-end gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]/30 relative">
              {/* Mention picker */}
              {showMentionPicker && activeConv?.type !== 'direct' && (
                <div className="absolute bottom-full left-4 mb-2 w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-card)] p-1.5 z-40 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="p-2 text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-default)] mb-1">
                    Mention conversation members
                  </div>
                  {filteredMentionUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--text-muted)] italic font-semibold">
                      No mentionable users found.
                    </div>
                  ) : (
                    filteredMentionUsers.map(mu => (
                      <button
                        key={mu.id}
                        type="button"
                        onClick={() => handleSelectMention(mu.full_name)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-sidebar-hover)] rounded-lg text-xs font-bold text-[var(--text-primary)] text-left transition-all"
                      >
                        <Avatar className="h-5 w-5 shrink-0 ring-1 ring-[var(--border-default)]">
                          <AvatarFallback className="bg-[var(--bg-sidebar-active)] text-[8px] text-[var(--accent-primary)] font-black">
                            {mu.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="truncate leading-none mb-0.5">{mu.full_name}</p>
                          <p className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">{mu.role}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Send restriction notice */}
              {sendRestrictionMsg && (
                <div className="mb-3 flex items-center gap-2 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                  <ShieldOff className="h-4 w-4 shrink-0 text-[var(--status-warning-text)]" />
                  <span className="text-xs font-semibold">{sendRestrictionMsg}</span>
                </div>
              )}

              <div className="flex gap-3">
                <textarea
                  placeholder={canISend ? "Discuss work... Type @name to mention a colleague" : sendRestrictionMsg ?? ''}
                  rows={2}
                  disabled={!canISend}
                  className={`flex-1 p-3 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-strong)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)] resize-none transition-opacity ${
                    !canISend ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && canISend) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || isSending || !canISend}
                  className="px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl shadow-md shrink-0 flex flex-col justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-[var(--text-muted)] italic font-semibold bg-[var(--bg-surface-elevated)]/10 space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--accent-primary)] flex items-center justify-center shadow-md animate-bounce">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] not-italic">
                PIMS Communication Center
              </h2>
              <p className="text-xs text-[var(--text-secondary)] not-italic font-semibold">
                Select a conversation from the left sidebar or start a new direct message, group, or channel.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-xs font-bold gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" /> Start New Discussion
            </Button>
          </div>
        )}
      </div>

      {/* ═══ Create Conversation Modal ═══ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] text-[var(--text-primary)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" /> Start Conversation
              </h3>
              <button
                onClick={() => { setShowCreateModal(false); setSelectedParticipants([]); setNewConvTitle(''); }}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              {(['direct', 'group', 'channel'] as const).map(type => (
                <button
                  key={type}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider flex flex-col items-center gap-2 transition-all ${
                    newConvType === type
                      ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
                  }`}
                  onClick={() => { setNewConvType(type); setSelectedParticipants([]); }}
                >
                  {getConvIcon(type)}
                  {type}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateConversation} className="space-y-4">
              {newConvType !== 'direct' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Discussion Title</label>
                  <input
                    type="text"
                    placeholder="Enter discussion title..."
                    required
                    className="w-full p-3 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                    value={newConvTitle}
                    onChange={e => setNewConvTitle(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                  {newConvType === 'direct' ? 'Select Participant' : 'Add Group Participants'}
                </label>
                <div className="max-h-48 overflow-y-auto border border-[var(--border-default)] rounded-xl p-2 space-y-1 custom-scrollbar">
                  {usersList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)] italic font-semibold">No other team members found.</div>
                  ) : (
                    usersList.map((u: any) => {
                      const isSelected = selectedParticipants.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleParticipant(u.id)}
                          className={`w-full flex items-center justify-between p-2 hover:bg-[var(--bg-sidebar-hover)] rounded-xl text-left transition-all ${isSelected ? 'bg-[var(--bg-sidebar-active)]/50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 ring-1 ring-[var(--border-default)]">
                              <AvatarFallback className="bg-[var(--bg-sidebar-active)] text-xs text-[var(--accent-primary)] font-black">
                                {u.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-black text-[var(--text-primary)]">{u.full_name}</p>
                              <p className="text-[9px] text-[var(--text-muted)] uppercase font-semibold">{u.role}</p>
                            </div>
                          </div>
                          {isSelected && <UserCheck className="h-4 w-4 text-[var(--accent-primary)]" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <Button
                type="submit"
                disabled={submittingConv || selectedParticipants.length === 0}
                className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider"
              >
                {submittingConv ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Launch Discussion'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Manage Members Modal ═══ */}
      {showManageModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] text-[var(--text-primary)] flex flex-col max-h-[85vh]">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--accent-primary)]" />
                {activeConv.title || 'Conversation'} — Members
              </h3>
              <button
                onClick={() => { setShowManageModal(false); setManageError(null); setManageSuccess(null); }}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Feedback banners */}
              {manageError && (
                <div className="mx-6 mt-4 p-3 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {manageError}
                </div>
              )}
              {manageSuccess && (
                <div className="mx-6 mt-4 p-3 rounded-xl border border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success-text)] flex items-center gap-2 text-xs font-bold">
                  <UserCheck className="h-4 w-4 shrink-0" /> {manageSuccess}
                </div>
              )}

              {/* Current participants */}
              <div className="p-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Current Members ({activeConv.participants.length})
                </p>
                {activeConv.participants.map(p => {
                  const badge = roleBadge(p.role);
                  const isMe = p.user_id === user?.id;
                  const isOwner = p.role === 'owner';
                  const isLoading = memberActionLoading === p.user_id;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/40"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-1 ring-[var(--border-default)]">
                          <AvatarFallback className="bg-[var(--bg-sidebar-active)] text-xs text-[var(--accent-primary)] font-black">
                            {p.user.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-black text-[var(--text-primary)]">
                            {p.user.full_name} {isMe && <span className="text-[var(--text-muted)] font-semibold">(you)</span>}
                          </p>
                          <p className="text-[9px] text-[var(--text-muted)] font-semibold">{p.user.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Actions */}
                      {isMeAdminOrOwner && !isMe && (
                        <div className="flex items-center gap-1.5">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
                          ) : (
                            <>
                              {p.role === 'member' && (
                                <button
                                  onClick={() => handlePromoteMember(p.user_id, 'admin')}
                                  className="p-1.5 rounded-lg hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                                  title="Promote to Admin"
                                >
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {p.role === 'admin' && myRole === 'owner' && (
                                <button
                                  onClick={() => handlePromoteMember(p.user_id, 'member')}
                                  className="p-1.5 rounded-lg hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] hover:text-amber-500 transition-colors"
                                  title="Demote to Member"
                                >
                                  <ShieldOff className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {!isOwner && (
                                <button
                                  onClick={() => handleRemoveMember(p.user_id)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                  title="Remove"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Members section */}
              {canIAddMembers && filteredAddableUsers.length > 0 && (
                <div className="px-6 pb-6 space-y-3 border-t border-[var(--border-default)] pt-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Add Members</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search users to add..."
                      className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar">
                    {filteredAddableUsers.map((u: any) => {
                      const isSelected = addMemberSelection.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setAddMemberSelection(prev =>
                              isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            )
                          }
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border ${
                            isSelected
                              ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40'
                              : 'bg-transparent border-transparent hover:bg-[var(--bg-sidebar-hover)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 ring-1 ring-[var(--border-default)]">
                              <AvatarFallback className="bg-[var(--bg-sidebar-active)] text-xs text-[var(--accent-primary)] font-black">
                                {u.full_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-black text-[var(--text-primary)]">{u.full_name}</p>
                              <p className="text-[9px] text-[var(--text-muted)]">{u.role} · {u.email}</p>
                            </div>
                          </div>
                          {isSelected && <UserCheck className="h-4 w-4 text-[var(--accent-primary)]" />}
                        </button>
                      );
                    })}
                  </div>
                  {addMemberSelection.length > 0 && (
                    <Button
                      onClick={handleAddMembers}
                      disabled={isAddingMembers}
                      className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl text-xs font-black uppercase gap-2"
                    >
                      {isAddingMembers
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...</>
                        : <><UserPlus className="h-3.5 w-3.5" /> Add {addMemberSelection.length} Member{addMemberSelection.length > 1 ? 's' : ''}</>
                      }
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Settings Modal ═══ */}
      {showSettingsModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] text-[var(--text-primary)] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Settings className="h-4 w-4 text-[var(--accent-primary)]" />
                {activeConv.type === 'channel' ? 'Channel' : 'Group'} Settings
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {settingsError && (
              <div className="p-3 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] flex items-center gap-2 text-xs font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" /> {settingsError}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Group name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                  {activeConv.type === 'channel' ? 'Channel' : 'Group'} Name
                </label>
                <input
                  type="text"
                  className="w-full p-3 text-xs rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                  value={settingsTitle}
                  onChange={e => setSettingsTitle(e.target.value)}
                  placeholder={activeConv.title || 'Untitled'}
                />
              </div>

              {/* Who can send messages */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Who can send messages?</label>
                {activeConv.type === 'channel' ? (
                  <div className="p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)] font-semibold flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    Channel posting is restricted to admins only.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {(['all_members', 'admins_only'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSettingsWhoCanSend(v)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                          settingsWhoCanSend === v
                            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                            : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
                        }`}
                      >
                        {v === 'all_members' ? 'All Members' : 'Admins Only'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Who can edit group info */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Who can edit group info?</label>
                <div className="flex gap-2">
                  {(['all_members', 'admins_only'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSettingsWhoCanEdit(v)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                        settingsWhoCanEdit === v
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
                      }`}
                    >
                      {v === 'all_members' ? 'All Members' : 'Admins Only'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Who can add members */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Who can add members?</label>
                <div className="flex gap-2">
                  {(['all_members', 'admins_only'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSettingsWhoCanAdd(v)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                        settingsWhoCanAdd === v
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                          : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
                      }`}
                    >
                      {v === 'all_members' ? 'All Members' : 'Admins Only'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl border-[var(--border-default)] text-xs font-bold"
                  onClick={() => setShowSettingsModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl text-xs font-black uppercase"
                >
                  {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Settings'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] gap-4 text-[var(--text-primary)] bg-[var(--bg-surface)]">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent-primary)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Loading PIMS Conversations...</span>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
