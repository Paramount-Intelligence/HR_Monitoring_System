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
  MessageAttachment,
} from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import apiClient from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  Send, Search, Plus, Hash, User, Users, Briefcase, CheckSquare,
  Calendar, AlertCircle, Edit2, Trash2, Loader2, Sparkles, Smile, Info,
  MessageSquare, ChevronRight, X, UserCheck, Bell, BellOff,
  UserPlus, Settings, Shield, ShieldCheck, ShieldOff, Crown, Eye, ArrowLeft,
  Paperclip, FileText, Image, Download, File,
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, AlertTriangle,
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

function SecureImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadImage = async () => {
      try {
        setLoading(true);
        const relativeUrl = src.startsWith('/api/v1') ? src.slice(7) : src;
        const response = await apiClient.get(relativeUrl, { responseType: 'blob' });
        if (active) {
          const url = URL.createObjectURL(response.data);
          setObjectUrl(url);
        }
      } catch (err) {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadImage();
    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-black/5 dark:bg-white/5", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]/40" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-black/5 dark:bg-white/5 text-[var(--text-muted)] text-[10px]", className)}>
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      src={objectUrl}
      alt={alt}
      className={className}
    />
  );
}

function FilePreviewCard({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  const isImg = file.type.startsWith('image/') && objectUrl;

  return (
    <div className="relative flex items-center gap-2 p-1.5 pr-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-xs max-w-[180px] group shadow-sm">
      {isImg ? (
        <img
          src={objectUrl}
          alt={file.name}
          className="h-8 w-8 object-cover rounded border border-[var(--border-default)] shrink-0"
        />
      ) : (
        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/30">
          <FileText className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-black text-[var(--text-primary)] text-[10px] mb-0.5" title={file.name}>
          {file.name}
        </p>
        <p className="text-[8px] text-[var(--text-muted)] font-black uppercase">
          {(file.size / 1024).toFixed(0)} KB
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 p-1 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
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

  // Attachment upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Check total count limit
    if (selectedFiles.length + files.length > 5) {
      setError("You can attach up to 5 files.");
      return;
    }

    const ALLOWED_EXTENSIONS = [
      'png', 'jpg', 'jpeg', 'webp', 'gif',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'ppt', 'pptx'
    ];
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError("File type not supported.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File is too large. Maximum size is 10 MB.");
        return;
      }
    }

    setSelectedFiles(prev => [...prev, ...files]);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  // WebRTC / Call states
  const [callSession, setCallSession] = useState<any | null>(null);
  const [callRole, setCallRole] = useState<'caller' | 'callee' | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoDisabled, setLocalVideoDisabled] = useState(false);
  const [iceConnectionState, setIceConnectionState] = useState<string>('new');
  const [isOutgoingRinging, setIsOutgoingRinging] = useState(false);
  const [isIncomingRinging, setIsIncomingRinging] = useState(false);
  const [incomingCallerName, setIncomingCallerName] = useState('');
  const [showPremiumCallModal, setShowPremiumCallModal] = useState(false);

  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

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
    if (!selectedConversationId || isSending || !canISend) return;
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      setIsSending(true);
      setError(null);

      let attachment_ids: string[] = [];
      if (selectedFiles.length > 0) {
        try {
          const uploaded = await messagesApi.uploadConversationAttachments(
            selectedConversationId,
            selectedFiles
          );
          attachment_ids = uploaded.map(att => att.id);
        } catch (uploadErr) {
          setError("Unable to upload attachment.");
          return;
        }
      }

      const mentioned_user_ids: string[] = [];
      mentionableUsers.forEach(u => {
        if (newMessage.includes(`@${u.full_name}`) && u.id) mentioned_user_ids.push(u.id);
      });

      const sentMsg = await messagesApi.sendMessage(selectedConversationId, {
        body: newMessage,
        mentioned_user_ids,
        attachment_ids,
      });

      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
      setSelectedFiles([]);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversationId
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setError("Unable to send message.");
    } finally {
      setIsSending(false);
    }
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

  // ─── WebRTC Call Helpers & Handlers ─────────────────────────────────────

  const getDirectChatRecipient = (conv: Conversation | null) => {
    if (!conv || conv.type !== 'direct') return null;
    return conv.participants.find(p => p.user_id !== user?.id)?.user ?? null;
  };

  // Safe resolved helper values for call participant information to prevent crashes
  const currentCallConv = conversations.find(c => c.id === callSession?.conversation_id) || activeConv;
  const otherCallParticipant = getDirectChatRecipient(currentCallConv);
  const otherCallParticipantName = otherCallParticipant?.full_name || incomingCallerName || 'Direct Call';
  const otherCallParticipantInitial = otherCallParticipantName.charAt(0).toUpperCase() || 'C';

  const handleTeardownCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setCallSession(null);
    setCallRole(null);
    setIsOutgoingRinging(false);
    setIsIncomingRinging(false);
    setLocalMuted(false);
    setLocalVideoDisabled(false);
    setIceConnectionState('new');
    setIncomingCallerName('');
    pendingCandidates.current = [];

    setLocalStream(prev => {
      if (prev) prev.getTracks().forEach(track => track.stop());
      return null;
    });
    setRemoteStream(prev => {
      if (prev) prev.getTracks().forEach(track => track.stop());
      return null;
    });
  }, []);

  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (!activeConv || activeConv.type !== 'direct') return;
    const recipient = getDirectChatRecipient(activeConv);
    if (!recipient) return;

    let stream: MediaStream | null = null;
    try {
      setError(null);

      // 1. Device and API compatibility checks
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        setError("This browser does not support audio/video calls.");
        return;
      }

      const constraints = {
        audio: true,
        video: callType === 'video'
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
      } catch (permErr: any) {
        console.warn('Media devices access denied:', permErr);
        setError("Microphone/camera permission is required to join this call.");
        return;
      }

      const session = await messagesApi.startCall(activeConv.id, callType);
      setCallSession(session);
      setCallRole('caller');
      setIsOutgoingRinging(true);

      const stunUrl = process.env.NEXT_PUBLIC_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302';
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunUrl }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          messagesApi.sendSignal(session.id, recipient.id, 'ice_candidate', event.candidate);
        }
      };

      pc.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.iceConnectionState);
      };

      const remoteMediaStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteMediaStream.addTrack(track);
        });
        setRemoteStream(remoteMediaStream);
      };

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream!);
      });

      peerConnectionRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await messagesApi.sendSignal(session.id, recipient.id, 'offer', offer);

    } catch (err: any) {
      console.error('Failed to start call:', err);
      setError(getErrorMessage(err) || 'Could not initiate audio/video call session.');
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      handleTeardownCall();
    }
  };

  const handleAcceptCall = async () => {
    if (!callSession?.id) {
      setError("Invalid call session.");
      return;
    }

    const callerId = callSession.started_by_id;
    let stream: MediaStream | null = null;
    try {
      setIsIncomingRinging(false);
      setError(null);

      // 1. Device and API compatibility checks
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        setError("This browser does not support audio/video calls.");
        return;
      }

      // 2. Request media permissions safely
      const constraints = {
        audio: true,
        video: callSession.call_type === 'video'
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
      } catch (permErr: any) {
        console.warn('Media devices access denied:', permErr);
        setError("Microphone/camera permission is required to join this call.");
        return;
      }

      // 3. Accept call via API
      let acceptedSession;
      try {
        acceptedSession = await messagesApi.acceptCall(callSession.id);
        setCallSession(acceptedSession);
      } catch (apiErr: any) {
        console.error('Accept API call failed:', apiErr);
        setError("Unable to accept call. Call session expired or no longer available.");
        if (stream) stream.getTracks().forEach(t => t.stop());
        return;
      }

      // 4. Initialize RTCPeerConnection safely with fallback STUN URL
      const stunUrl = process.env.NEXT_PUBLIC_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302';
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: stunUrl }]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          messagesApi.sendSignal(callSession.id, callerId, 'ice_candidate', event.candidate);
        }
      };

      pc.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.iceConnectionState);
      };

      const remoteMediaStream = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          remoteMediaStream.addTrack(track);
        });
        setRemoteStream(remoteMediaStream);
      };

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream!);
      });

      peerConnectionRef.current = pc;

    } catch (err: any) {
      console.error('Failed to accept call:', err);
      setError(getErrorMessage(err) || 'Call could not connect. This may happen on restricted networks.');
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      handleDeclineCall();
    }
  };

  const handleDeclineCall = async () => {
    if (!callSession) return;
    const callerId = callSession.started_by_id;
    try {
      if (callerId) {
        await messagesApi.sendSignal(callSession.id, callerId, 'end', {});
      }
      await messagesApi.declineCall(callSession.id);
    } catch (err) {
      console.error('Failed to decline call:', err);
    } finally {
      handleTeardownCall();
    }
  };

  const handleEndCall = async () => {
    if (!callSession) return;
    const conv = conversations.find(c => c.id === callSession.conversation_id) || activeConv;
    const otherParticipant = conv?.participants.find(p => p.user_id !== user?.id);
    const recipientId = callRole === 'caller'
      ? otherParticipant?.user_id
      : callSession.started_by_id;
    try {
      if (recipientId) {
        await messagesApi.sendSignal(callSession.id, recipientId, 'end', {});
      }
      await messagesApi.endCall(callSession.id);
    } catch (err) {
      console.error('Failed to end call:', err);
    } finally {
      handleTeardownCall();
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setLocalMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setLocalVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // Video track assignment refs
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Polling loop 1: Incoming calls (every 5 seconds)
  useEffect(() => {
    if (callSession) return;
    const interval = setInterval(async () => {
      try {
        const incoming = await messagesApi.getIncomingCall();
        if (incoming) {
          setCallSession(incoming);
          setCallRole('callee');
          setIsIncomingRinging(true);
          const conv = conversations.find(c => c.id === incoming.conversation_id) || activeConv;
          const callerPart = conv?.participants.find(p => p.user_id === incoming.started_by_id);
          setIncomingCallerName(callerPart?.user?.full_name || 'Someone');
        }
      } catch (err) {
        console.error('Failed to check incoming calls:', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [callSession, conversations, activeConv]);

  // Polling loop 2: Consume signaling messages (every 1 second)
  useEffect(() => {
    if (!callSession) return;

    const interval = setInterval(async () => {
      try {
        const signals = await messagesApi.getSignals(callSession.id);
        for (const sig of signals) {
          const pc = peerConnectionRef.current;
          let payload = sig.payload;
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch (e) {
              console.warn('Failed to parse signal payload:', e);
            }
          }
          if (sig.signal_type === 'offer' && callRole === 'callee' && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            const callerId = callSession.started_by_id;
            await messagesApi.sendSignal(callSession.id, callerId, 'answer', answer);
            // Drain pending candidates
            while (pendingCandidates.current.length > 0) {
              const cand = pendingCandidates.current.shift();
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          } else if (sig.signal_type === 'answer' && callRole === 'caller' && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
            // Drain pending candidates
            while (pendingCandidates.current.length > 0) {
              const cand = pendingCandidates.current.shift();
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          } else if (sig.signal_type === 'ice_candidate' && pc) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload));
            } else {
              pendingCandidates.current.push(payload);
            }
          } else if (sig.signal_type === 'end') {
            handleTeardownCall();
          }
        }
      } catch (err) {
        console.error('Error fetching signaling messages:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [callSession, callRole, handleTeardownCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      setLocalStream(prev => {
        if (prev) prev.getTracks().forEach(t => t.stop());
        return null;
      });
      setRemoteStream(prev => {
        if (prev) prev.getTracks().forEach(t => t.stop());
        return null;
      });
    };
  }, []);

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

              {/* Call and settings buttons */}
              <div className="flex items-center gap-2">
                {activeConv.type === 'direct' ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] hover:text-emerald-500 transition-colors"
                      onClick={() => handleStartCall('voice')}
                      title="Voice Call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] hover:text-emerald-500 transition-colors"
                      onClick={() => handleStartCall('video')}
                      title="Video Call"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)]/50 cursor-not-allowed"
                      onClick={() => setShowPremiumCallModal(true)}
                      title="Group Voice Call (Premium)"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)]/50 cursor-not-allowed"
                      onClick={() => setShowPremiumCallModal(true)}
                      title="Group Video Call (Premium)"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {isGroupOrChannel && (
                  <>
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
                  </>
                )}
              </div>
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
                          {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                          
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-2 mt-2 pt-1 border-t border-white/10">
                              {/* Separate into images and docs for beautiful grid rendering */}
                              {msg.attachments.some(att => att.mime_type.startsWith('image/')) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {msg.attachments
                                    .filter(att => att.mime_type.startsWith('image/'))
                                    .map(att => (
                                      <div key={att.id} className="relative rounded-lg overflow-hidden group border border-[var(--border-default)] aspect-video bg-black/5">
                                        <SecureImage
                                          src={att.download_url}
                                          alt={att.original_file_name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => messagesApi.downloadAttachment(att.id)}
                                            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/40 transition-colors"
                                            title="Download"
                                          >
                                            <Download className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {msg.attachments.filter(att => !att.mime_type.startsWith('image/')).length > 0 && (
                                <div className="space-y-1">
                                  {msg.attachments
                                    .filter(att => !att.mime_type.startsWith('image/'))
                                    .map(att => (
                                      <div
                                        key={att.id}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs gap-3 shadow-sm ${
                                          isSelf
                                            ? 'bg-[#15203b]/40 border-[#2e3f6e]/60 text-white'
                                            : 'bg-[var(--bg-elevated)]/50 border-[var(--border-default)] text-[var(--text-primary)]'
                                        }`}
                                      >
                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/30">
                                          <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="truncate font-black mb-0.5" title={att.original_file_name}>
                                            {att.original_file_name}
                                          </p>
                                          <p className={`text-[9px] font-black uppercase ${isSelf ? 'text-gray-400' : 'text-[var(--text-muted)]'}`}>
                                            {(att.file_size / 1024).toFixed(0)} KB
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => messagesApi.downloadAttachment(att.id)}
                                          className={`p-1.5 rounded-lg border transition-colors ${
                                            isSelf
                                              ? 'hover:bg-white/10 text-white border-white/20'
                                              : 'hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] border-[var(--border-default)]'
                                          }`}
                                          title="Download"
                                        >
                                          <Download className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          )}
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

              {/* Selected Files Preview Queue */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 mb-2 bg-[var(--bg-elevated)]/40 rounded-xl border border-[var(--border-default)]">
                  {selectedFiles.map((file, idx) => (
                    <FilePreviewCard
                      key={idx}
                      file={file}
                      onRemove={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              )}

              <div className="flex gap-3 items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  disabled={!canISend || isSending}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border border-[var(--border-strong)]/40 hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] shrink-0 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
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
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending || !canISend}
                  className="h-10 px-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl shadow-md shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* ═══ Premium Call Limit Modal ═══ */}
      {showPremiumCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">Group Calls Feature</h3>
              <p className="text-xs text-[var(--text-secondary)] font-semibold leading-relaxed">
                Group voice and video calls are not available in the free version. Please upgrade to PIMS Premium to enable multi-party calling.
              </p>
            </div>
            <Button
              onClick={() => setShowPremiumCallModal(false)}
              className="w-full py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Incoming Call Overlay ═══ */}
      {isIncomingRinging && callSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <div className="relative mx-auto h-20 w-20 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)]/20 animate-pulse">
              <Avatar className="h-16 w-16 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-xl font-black text-white">
                  {incomingCallerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Incoming {callSession.call_type} Call</p>
              <h3 className="text-lg font-black text-[var(--text-primary)]">{incomingCallerName}</h3>
              <p className="text-xs text-[var(--text-secondary)] font-semibold">is calling you...</p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleDeclineCall}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <PhoneOff className="h-4 w-4" /> Decline
              </Button>
              <Button
                onClick={handleAcceptCall}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" /> Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Outgoing Call Overlay ═══ */}
      {isOutgoingRinging && callSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-card)] text-center space-y-6">
            <div className="relative mx-auto h-20 w-20 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)]/20 animate-pulse">
              <Avatar className="h-16 w-16 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-xl font-black text-white">
                  {getDirectChatRecipient(activeConv)?.full_name.charAt(0).toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Calling...</p>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {getDirectChatRecipient(activeConv)?.full_name || 'Team Member'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-semibold">Ringing...</p>
            </div>
            <Button
              onClick={handleEndCall}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <PhoneOff className="h-4 w-4" /> Cancel Call
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Active Call Overlay ═══ */}
      {callSession && !isIncomingRinging && !isOutgoingRinging && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-xl p-6 text-white animate-in fade-in duration-300">
          {/* Call Header */}
          <div className="flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                  {callSession.call_type === 'video' ? <Video className="h-5 w-5 animate-pulse" /> : <Phone className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {otherCallParticipantName}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Call in progress · {callSession.call_type === 'video' ? 'Video' : 'Voice'}
                  </p>
                </div>
              </div>

              {/* ICE state warning if failed */}
              {iceConnectionState === 'failed' && (
                <div className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-black flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Connectivity issue: Restricted network NAT</span>
                </div>
              )}
            </div>

            {/* Beautiful, premium error banner for call issues */}
            {error && (
              <div className="mx-auto w-full max-w-md p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span className="flex-1">{error}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-300 hover:text-white hover:bg-white/10 rounded-lg shrink-0" onClick={() => setError(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Media Stream Layout */}
          <div className="flex-1 my-6 flex items-center justify-center overflow-hidden relative rounded-2xl bg-white/5 border border-white/10">
            {callSession.call_type === 'video' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Remote Video */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <Avatar className="h-20 w-20 mx-auto border border-white/20 shadow-lg animate-pulse">
                      <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-xl font-black text-white">
                        {otherCallParticipantInitial}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-gray-400 font-semibold animate-pulse">Waiting for participant stream...</p>
                  </div>
                )}

                {/* Local Video Picture-in-Picture */}
                <div className="absolute top-4 right-4 w-32 md:w-48 aspect-video rounded-xl overflow-hidden border border-white/20 bg-black/60 shadow-xl z-10">
                  {localStream && !localVideoDisabled ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase text-gray-400 bg-white/5">
                      Camera Off
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Voice Call Visualizer */
              <div className="text-center space-y-6">
                <div className="relative mx-auto h-28 w-28 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
                  <div className="absolute inset-2 rounded-full border border-[var(--accent-primary)]/40 animate-ping duration-1000" />
                  <Avatar className="h-24 w-24 border border-white/10 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--text-secondary)] text-2xl font-black text-white">
                      {otherCallParticipantInitial}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h4 className="text-base font-black">
                    {otherCallParticipantName}
                  </h4>
                  <p className="text-xs text-gray-400 font-semibold mt-1">
                    {iceConnectionState === 'connected' ? 'Connected' : 'Connecting audio...'}
                  </p>
                </div>
                {/* Audio tag for remote stream */}
                {remoteStream && (
                  <audio
                    ref={el => {
                      if (el) el.srcObject = remoteStream;
                    }}
                    autoPlay
                  />
                )}
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="flex items-center justify-center gap-4 shrink-0 bg-white/5 border border-white/10 py-4 px-6 rounded-2xl backdrop-blur-md">
            {/* Mute button */}
            <Button
              type="button"
              variant="outline"
              onClick={toggleMute}
              className={cn("h-12 w-12 rounded-full border border-white/20 transition-all hover:scale-105",
                localMuted ? "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20")}
              title={localMuted ? "Unmute" : "Mute"}
            >
              {localMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            {/* Video toggle (only for video calls) */}
            {callSession.call_type === 'video' && (
              <Button
                type="button"
                variant="outline"
                onClick={toggleVideo}
                className={cn("h-12 w-12 rounded-full border border-white/20 transition-all hover:scale-105",
                  localVideoDisabled ? "bg-red-500/20 border-red-500 text-red-500 hover:bg-red-500/30" : "bg-white/10 text-white hover:bg-white/20")}
                title={localVideoDisabled ? "Turn Camera On" : "Turn Camera Off"}
              >
                {localVideoDisabled ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            )}

            {/* End call button */}
            <Button
              type="button"
              onClick={handleEndCall}
              className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white hover:scale-105 transition-all flex items-center justify-center"
              title="End Call"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
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
