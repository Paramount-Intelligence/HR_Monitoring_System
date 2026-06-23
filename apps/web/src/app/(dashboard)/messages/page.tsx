'use client';

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { canFetchProtectedData } from '@/lib/auth/session';
import { logProtectedFetchError } from '@/lib/api/fetch-errors';
import { useRealtimeEvent, useRealtimeReconnect, useRealtimeStatus } from '@/hooks/useRealtime';
import { useCall } from '@/providers/CallProvider';
import { unlockSounds } from '@/lib/calls/sounds';
import { usersApi } from '@/lib/api/users';
import {
  messagesApi,
  Conversation,
  Message,
  MessageInfo,
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
  Calendar, AlertCircle, Edit2, Trash2, Loader2, Sparkles, Info,
  MessageSquare, ChevronRight, X, UserCheck, Bell, BellOff,
  UserPlus, Settings, Shield, ShieldCheck, ShieldOff, Crown, Eye, ArrowLeft,
  Paperclip, FileText, Image, Download, File,
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, AlertTriangle,
  Star, MoreHorizontal, AtSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { MessagesWorkspaceSidebar } from '@/components/messages/MessagesWorkspaceSidebar';
import { MessageActionsMenu } from '@/components/messages/MessageActionsMenu';
import { MessageReplyComposerPreview } from '@/components/messages/MessageReplyComposerPreview';
import { MessageQuotedReply } from '@/components/messages/MessageQuotedReply';
import { MessageInfoDialog } from '@/components/messages/MessageInfoDialog';
import { MessageStatusIndicator } from '@/components/messages/MessageStatusIndicator';
import { MessageBody } from '@/components/messages/MessageBody';
import {
  RichTextComposer,
  type RichTextComposerHandle,
} from '@/components/messages/RichTextComposer';
import { ComposerEmojiPicker } from '@/components/messages/ComposerEmojiPicker';
import { hasRichFormatting } from '@/lib/messages/message-sanitize';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  SidebarFilter,
  ConversationPanelTab,
  getConversationDisplayName,
  groupMessagesByDateWithSlack,
  collectAttachments,
  collectCallEvents,
  formatMessageTime,
  getConversationLoadError,
  type ConversationLoadError,
} from '@/components/messages/messages-utils';
import { StartConversationModal } from '@/components/messages/StartConversationModal';
import { VoiceMessageRecorder } from '@/components/messages/VoiceMessageRecorder';
import { VoiceMessageBubble } from '@/components/messages/VoiceMessageBubble';
import { isVoiceNoteAttachment, isVoiceNoteMessage } from '@/lib/messages/voice-messages';
import { stopActiveVoicePlayback } from '@/lib/messages/voice-playback-controller';
import { getCallButtonState, getCallButtonTitle } from '@/lib/calls/call-ui-utils';
import { isWebRtcSupported } from '@/lib/calls/media';

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

function canDeleteMessage(
  msg: Message,
  conv: Conversation | null,
  userId: string | undefined,
  userRole?: string
): boolean {
  if (!userId || !conv) return false;
  if (msg.is_deleted) return false;
  if (msg.sender_id === userId) return true;
  if (userRole === 'admin') return true;
  const myPart = getMyParticipant(conv, userId);
  return myPart ? isAdminOrOwner(myPart.role) : false;
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
  const { user, isAuthenticated } = useAuth();
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
  const composerRef = useRef<RichTextComposerHandle>(null);
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


  // Input fields
  const [composerPlainText, setComposerPlainText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [threadLoadError, setThreadLoadError] = useState<ConversationLoadError | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Message actions (reply, delete, info)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<Message | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [messageInfoOpen, setMessageInfoOpen] = useState(false);
  const [messageInfoTargetId, setMessageInfoTargetId] = useState<string | null>(null);
  const [messageInfoData, setMessageInfoData] = useState<MessageInfo | null>(null);
  const [messageInfoLoading, setMessageInfoLoading] = useState(false);
  const [messageInfoError, setMessageInfoError] = useState<string | null>(null);

  // Create conversation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>('home');
  const [conversationPanelTab, setConversationPanelTab] = useState<ConversationPanelTab>('messages');

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

  const {
    handleStartCall,
    showPremiumCallModal,
    setShowPremiumCallModal,
    setActiveConversationId,
    callSession,
    connectionStatus,
  } = useCall();

  useEffect(() => {
    setActiveConversationId(selectedConversationId);
  }, [selectedConversationId, setActiveConversationId]);

  // Ref to always hold the latest selected conversation ID for intervals
  const latestSelectedConvId = useRef<string | null>(null);
  useEffect(() => {
    latestSelectedConvId.current = selectedConversationId;
    stopActiveVoicePlayback();
  }, [selectedConversationId]);

  const { isConnected } = useRealtimeStatus();
  const dmCallButtonState = useMemo(
    () =>
      getCallButtonState({
        isDirect: activeConv?.type === 'direct',
        isParticipant: Boolean(myParticipant),
        isWebRtcSupported: isWebRtcSupported(),
        hasActiveCall: Boolean(callSession),
        realtimeConnected: isConnected,
      }),
    [activeConv?.type, myParticipant, callSession, isConnected]
  );
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Poll & directory loading
  useEffect(() => {
    if (!isAuthenticated) return;

    loadConversations();
    loadActiveDirectory();
    const pollMs = isConnected ? 60000 : 15000;
    const interval = setInterval(() => {
      if (canFetchProtectedData()) pollUpdates();
    }, pollMs);
    return () => clearInterval(interval);
  }, [isAuthenticated, isConnected]);

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

  useEffect(() => {
    if (!selectedConversationId || !isAuthenticated) {
      setMessages([]);
      setMentionableUsers([]);
      setReplyingTo(null);
      return;
    }
    if (!canFetchProtectedData()) return;
    let active = true;

    const fetchThread = async () => {
      if (!canFetchProtectedData()) return;
      try {
        setLoadingMsgs(true); setThreadLoadError(null); setMessages([]);
        const data = await messagesApi.getMessages(selectedConversationId, { limit: 50 });
        if (active) setMessages(data);
      } catch (err) { if (active) setThreadLoadError(getConversationLoadError(err)); }
      finally { if (active) setLoadingMsgs(false); }
    };

    const markRead = async () => {
      if (!canFetchProtectedData()) return;
      try {
        await messagesApi.markConversationRead(selectedConversationId);
        if (active) {
          setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, unread_count: 0 } : c));
          window.dispatchEvent(new Event('pims-messages-unread-update'));
        }
      } catch (err) { logProtectedFetchError('[Messages] Mark read error', err); }
    };

    const fetchMentionable = async () => {
      if (!canFetchProtectedData()) return;
      try {
        const data = await messagesApi.getMentionableUsers(selectedConversationId);
        if (active) setMentionableUsers(data);
      } catch (err) { logProtectedFetchError('[Messages] Mentionable users error', err); }
    };

    fetchThread(); markRead(); fetchMentionable();
    return () => { active = false; };
  }, [selectedConversationId, isAuthenticated]);

  useEffect(() => {
    if (!hasNewMessagesBelow) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, hasNewMessagesBelow]);

  const loadConversations = async () => {
    if (!canFetchProtectedData()) return;
    try {
      setLoadingConvs(true);
      const data = await messagesApi.getConversations();
      const sorted = [...data].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setConversations(sorted);
      setError(null);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoadingConvs(false); }
  };

  const loadActiveDirectory = async () => {
    if (!canFetchProtectedData()) return;
    try {
      const data = await usersApi.getActiveDirectory();
      setUsersList(data.filter((u: any) => u.id !== user?.id));
    } catch (err) { logProtectedFetchError('[Messages] Directory error', err); }
  };

  const pollUpdates = async () => {
    if (!canFetchProtectedData()) return;
    try {
      const data = await messagesApi.getConversations();
      setConversations(data);
      const activeId = latestSelectedConvId.current;
      if (activeId) {
        const freshMsgs = await messagesApi.getMessages(activeId, { limit: 50 });
        setMessages(freshMsgs);
      }
    } catch (err) { logProtectedFetchError('[Messages Polling] Failed', err); }
  };

  useRealtimeEvent('new_message', (ev) => {
    const convId = String(ev.payload.conversation_id);
    const messageId = String(ev.payload.message_id);

    setConversations(prev =>
      prev.map(c =>
        c.id === convId
          ? {
              ...c,
              updated_at: String(ev.payload.created_at || new Date().toISOString()),
            }
          : c
      )
    );
    window.dispatchEvent(new CustomEvent('pims-messages-unread-update'));

    if (convId !== latestSelectedConvId.current) return;

    if (isNearBottom()) {
      messagesApi.getMessages(convId, { limit: 50 }).then(fresh => {
        setMessages(prev => {
          if (prev.some(m => m.id === messageId)) return prev;
          return fresh;
        });
        setHasNewMessagesBelow(false);
      }).catch(() => {});
    } else {
      setHasNewMessagesBelow(true);
    }
  });

  useRealtimeEvent(['message_updated', 'message_deleted'], (ev) => {
    const convId = String(ev.payload.conversation_id);
    const messageId = String(ev.payload.message_id);
    if (convId === latestSelectedConvId.current) {
      if (ev.type === 'message_deleted') {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, is_deleted: true, body: '', attachments: [] }
              : m
          )
        );
      } else {
        messagesApi.getMessages(convId, { limit: 50 }).then(setMessages).catch(() => {});
      }
    }
  });

  useRealtimeEvent(['message_seen', 'message_delivered'], (ev) => {
    const convId = String(ev.payload.conversation_id);
    const messageId = String(ev.payload.message_id);
    if (convId !== latestSelectedConvId.current) return;

    setMessages(prev =>
      prev.map(m => {
        if (m.id !== messageId || m.sender_id !== user?.id) return m;
        const total = m.total_recipients ?? 1;
        if (ev.type === 'message_delivered') {
          const delivered = Math.min((m.delivered_count ?? 0) + 1, total);
          return {
            ...m,
            delivered_count: delivered,
            delivery_status: delivered >= total ? 'delivered' : 'delivered',
          };
        }
        const seen = Math.min((m.seen_count ?? 0) + 1, total);
        return {
          ...m,
          seen_count: seen,
          delivered_count: Math.max(m.delivered_count ?? 0, seen),
          delivery_status: seen >= total ? 'seen' : m.delivery_status ?? 'delivered',
        };
      })
    );
  });

  useRealtimeEvent('conversation_updated', () => {
    messagesApi.getConversations().then(data => {
      setConversations(data);
    }).catch(() => {});
  });

  useRealtimeReconnect(() => {
    pollUpdates();
  });

  const loadMessages = async (convId: string) => {
    if (!canFetchProtectedData()) return;
    try {
      setLoadingMsgs(true); setThreadLoadError(null); setMessages([]);
      const data = await messagesApi.getMessages(convId, { limit: 50 });
      setMessages(data);
    } catch (err) { setThreadLoadError(getConversationLoadError(err)); }
    finally { setLoadingMsgs(false); }
  };

  const handleSelectConversation = (convId: string) => {
    stopActiveVoicePlayback();
    setSelectedConversationId(convId);
    setConversationPanelTab('messages');
    router.replace(`/messages?conversation_id=${convId}`);
  };

  const handleSendVoiceNote = async (file: File, _durationSeconds: number) => {
    if (!selectedConversationId || isSending || !canISend) {
      throw new Error('Unable to send voice message.');
    }

    try {
      setIsSending(true);
      setSendError(null);
      const sentMsg = await messagesApi.sendVoiceNote(selectedConversationId, file, {
        reply_to_message_id: replyingTo?.id,
      });
      setMessages((prev) => [...prev, sentMsg]);
      setReplyingTo(null);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setSendError(getErrorMessage(err) || 'Unable to send voice message.');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || isSending || !canISend) return;

    const messageText = composerRef.current?.getPlainText().trim() ?? composerPlainText.trim();
    if (!messageText && selectedFiles.length === 0) return;

    const messageHtml = composerRef.current?.getHtml() ?? '';
    const sendRichHtml = hasRichFormatting(messageHtml, messageText) ? messageHtml : undefined;

    try {
      setIsSending(true);
      setSendError(null);

      let attachment_ids: string[] = [];
      if (selectedFiles.length > 0) {
        try {
          const uploaded = await messagesApi.uploadConversationAttachments(
            selectedConversationId,
            selectedFiles
          );
          attachment_ids = uploaded.map(att => att.id);
        } catch (uploadErr) {
          setSendError("Unable to upload attachment.");
          return;
        }
      }

      const mentioned_user_ids: string[] = [];
      mentionableUsers.forEach(u => {
        if (messageText.includes(`@${u.full_name}`) && u.id) mentioned_user_ids.push(u.id);
      });

      const payload: Parameters<typeof messagesApi.sendMessage>[1] = {
        body: messageText,
        body_html: sendRichHtml,
        mentioned_user_ids,
        attachment_ids,
      };
      if (replyingTo?.id) {
        payload.reply_to_message_id = replyingTo.id;
      }

      const sentMsg = await messagesApi.sendMessage(selectedConversationId, payload);

      setMessages(prev => [...prev, sentMsg]);
      composerRef.current?.clear();
      setComposerPlainText('');
      setSelectedFiles([]);
      setReplyingTo(null);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversationId
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      setSendError(getErrorMessage(err) || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversationSuccess = (newConv: Conversation) => {
    setConversations((prev) => [newConv, ...prev]);
    setShowCreateModal(false);
    handleSelectConversation(newConv.id);
  };

  const handleDeleteMessage = async () => {
    if (!deleteConfirmMessage) return;
    try {
      setIsDeletingMessage(true);
      await messagesApi.deleteMessage(deleteConfirmMessage.id);
      setMessages(prev =>
        prev.map(m =>
          m.id === deleteConfirmMessage.id
            ? { ...m, is_deleted: true, body: '', attachments: [] }
            : m
        )
      );
      setDeleteConfirmMessage(null);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const openMessageInfo = async (msg: Message) => {
    setMessageInfoTargetId(msg.id);
    setMessageInfoOpen(true);
    setMessageInfoLoading(true);
    setMessageInfoError(null);
    setMessageInfoData(null);
    try {
      const info = await messagesApi.getMessageInfo(msg.id);
      setMessageInfoData(info);
    } catch (err) {
      setMessageInfoError(getErrorMessage(err));
    } finally {
      setMessageInfoLoading(false);
    }
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

  const handleComposerUpdate = (plainText: string) => {
    setComposerPlainText(plainText);
    const words = plainText.split(/\s+/);
    const lastWord = words[words.length - 1] ?? '';
    if (lastWord.startsWith('@') && activeConv?.type !== 'direct') {
      setMentionFilter(lastWord.slice(1));
      setShowMentionPicker(true);
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleSelectMention = (fullName: string) => {
    const plain = composerRef.current?.getPlainText() ?? composerPlainText;
    const words = plain.split(/\s+/);
    words[words.length - 1] = `@${fullName}`;
    const next = `${words.join(' ')} `;
    composerRef.current?.clear();
    composerRef.current?.insertText(next);
    setComposerPlainText(next.trimEnd());
    setShowMentionPicker(false);
  };

  const handleEmojiInsert = (emoji: string) => {
    composerRef.current?.insertText(emoji);
  };

  const handleComposerSubmit = () => {
    if (!canISend || isSending) return;
    if (!composerPlainText.trim() && selectedFiles.length === 0) return;
    void handleSendMessage({ preventDefault: () => {} } as React.FormEvent);
  };

  const filteredMentionUsers = mentionableUsers.filter(u =>
    u.full_name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Unlock audio on first interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => { void unlockSounds(); };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // ─── Utility helpers ────────────────────────────────────────────────────

  const getDirectChatRecipient = (conv: Conversation | null) => {
    if (!conv || conv.type !== 'direct') return null;
    return conv.participants.find(p => p.user_id !== user?.id)?.user ?? null;
  };

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

  // Users available to add (not already in current conversation)
  const existingParticipantIds = new Set(activeConv?.participants.map(p => p.user_id) ?? []);
  const addableUsers = usersList.filter((u: any) => !existingParticipantIds.has(u.id));
  const filteredAddableUsers = addableUsers.filter((u: any) =>
    u.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const sharedAttachments = useMemo(() => collectAttachments(messages), [messages]);
  const callEvents = useMemo(() => collectCallEvents(messages), [messages]);
  const groupedMessages = useMemo(() => groupMessagesByDateWithSlack(messages), [messages]);
  const activeConvName = activeConv ? getConversationDisplayName(activeConv, user?.id) : '';

  const PANEL_TABS: { id: ConversationPanelTab; label: string }[] = [
    { id: 'messages', label: 'Messages' },
    { id: 'files', label: 'Files' },
    { id: 'calls', label: 'Calls' },
    { id: 'details', label: 'Details' },
  ];

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[var(--bg-page)]">
      <MessagesWorkspaceSidebar
        conversations={conversations}
        loading={loadingConvs}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sidebarFilter={sidebarFilter}
        onSidebarFilterChange={setSidebarFilter}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewMessage={() => setShowCreateModal(true)}
        currentUserId={user?.id}
        visible={!isMobile || !selectedConversationId}
      />

      {/* Active conversation panel */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[var(--bg-surface)] dark:bg-[#111827]',
          selectedConversationId ? 'flex' : 'hidden lg:flex'
        )}
      >
        {activeConv ? (
          <>
            {/* Fixed conversation header */}
            <div className="shrink-0 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(null);
                    router.replace('/messages');
                  }}
                  className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] shrink-0"
                  aria-label="Back to messages"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="h-9 w-9 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                  {getConvIcon(activeConv.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {activeConvName}
                    </h2>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                      {getConvTypeLabel(activeConv.type)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {activeConv.participants.length} members
                    {myRole && (
                      <span className={`px-1 py-0.5 rounded border text-[8px] font-bold uppercase ${roleBadge(myRole).cls}`}>
                        {roleBadge(myRole).label}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeConv.type === 'direct' ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={!dmCallButtonState.canCall} onClick={() => handleStartCall('voice')} title={getCallButtonTitle('voice', dmCallButtonState)}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" disabled={!dmCallButtonState.canCall} onClick={() => handleStartCall('video')} title={getCallButtonTitle('video', dmCallButtonState)}>
                      <Video className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-50" onClick={() => setShowPremiumCallModal(true)} title="Group voice call">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-50" onClick={() => setShowPremiumCallModal(true)} title="Group video call">
                      <Video className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hidden sm:flex" title="Search in conversation">
                  <Search className="h-4 w-4" />
                </Button>
                {isGroupOrChannel && canIAddMembers && (
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs hidden md:flex" onClick={openManageModal}>
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Details
                  </Button>
                )}
                {isGroupOrChannel && canIManageSettings && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={openSettingsModal} title="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto custom-scrollbar">
              {PANEL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setConversationPanelTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors',
                    conversationPanelTab === tab.id
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {conversationPanelTab === 'messages' && (
              <>
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 bg-[var(--bg-surface)] dark:bg-[#111827] relative"
            >
              {hasNewMessagesBelow && (
                <button
                  type="button"
                  onClick={() => {
                    setHasNewMessagesBelow(false);
                    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="sticky top-2 left-1/2 -translate-x-1/2 z-10 mx-auto block rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white shadow-lg"
                >
                  New message
                </button>
              )}
              {loadingMsgs ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)] font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" /> Synchronizing thread...
                </div>
              ) : threadLoadError ? (
                <div className="py-24 text-center text-xs text-[var(--text-muted)] font-semibold space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto shadow-md">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[var(--text-primary)] font-black uppercase tracking-wider text-xs">{threadLoadError.title}</p>
                    <p className="text-[var(--text-secondary)] text-[10px] max-w-sm mx-auto font-semibold leading-relaxed">{threadLoadError.message}</p>
                  </div>
                  {threadLoadError.canRetry && (
                    <Button
                      variant="outline"
                      className="rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-xs font-bold gap-2"
                      onClick={() => loadMessages(activeConv.id)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-2 py-12">
                  <MessageSquare className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
                  <p className="font-medium text-[var(--text-secondary)]">
                    No messages yet. Start the conversation with {activeConvName}.
                  </p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-2">
                        {group.date}
                      </span>
                      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                    </div>
                    {group.items.map((item) => {
                  const msg = item.message;
                  const isSelf = msg.sender_id === user?.id;
                  const isSystem = msg.message_type === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center py-1">
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1 rounded-full border border-[var(--border-subtle)]">
                          {msg.body}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'group/message relative flex gap-2 w-full max-w-4xl hover:bg-[var(--bg-subtle)]/60 rounded-md px-2 -mx-2',
                        item.isContinuation ? 'mt-0.5 pt-0.5' : 'mt-3 first:mt-1'
                      )}
                    >
                      <div className="w-9 shrink-0 flex justify-center">
                        {item.showAvatar ? (
                          <UserProfilePicture
                            user={msg.sender}
                            name={msg.sender.full_name}
                            size="default"
                            className="h-9 w-9 shrink-0"
                          />
                        ) : (
                          <span className="w-9" aria-hidden />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {item.showHeader && (
                          <div className="flex items-baseline gap-2 leading-none mb-1">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{msg.sender.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] font-medium text-[var(--text-muted)]">(you)</span>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isSelf && activeConv && (
                              <MessageStatusIndicator
                                status={msg.delivery_status}
                                seenCount={msg.seen_count}
                                deliveredCount={msg.delivered_count}
                                totalRecipients={msg.total_recipients}
                                conversationType={activeConv.type}
                              />
                            )}
                          </div>
                        )}

                        {!item.showHeader && (
                          <span className="absolute left-1 top-1 w-10 text-right pr-1 text-[10px] text-[var(--text-muted)] opacity-0 group-hover/message:opacity-100 tabular-nums pointer-events-none">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        )}

                        <div className="flex items-start gap-1">
                          <div className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--text-primary)]">
                            {msg.reply_to_message && !msg.is_deleted && (
                              <MessageQuotedReply reply={msg.reply_to_message} isSelf={false} />
                            )}
                            {msg.is_deleted ? (
                              <p className="text-sm italic text-[var(--text-muted)]">
                                This message was deleted.
                              </p>
                            ) : (
                              <>
                                {msg.body && !isVoiceNoteMessage(msg) && (
                                  <MessageBody text={msg.body} html={msg.body_html} />
                                )}

                                {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-2 mt-2 pt-1 border-t border-[var(--border-subtle)]">
                              {msg.attachments
                                .filter((att) => isVoiceNoteAttachment(att))
                                .map((att) => (
                                  <VoiceMessageBubble key={att.id} attachment={att} isSelf={false} />
                                ))}

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

                              {msg.attachments.filter(att => !att.mime_type.startsWith('image/') && !isVoiceNoteAttachment(att)).length > 0 && (
                                <div className="space-y-1">
                                  {msg.attachments
                                    .filter(att => !att.mime_type.startsWith('image/') && !isVoiceNoteAttachment(att))
                                    .map(att => (
                                      <div
                                        key={att.id}
                                        className="flex items-center justify-between p-2.5 rounded-lg border text-xs gap-3 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                                      >
                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/30">
                                          <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="truncate font-semibold mb-0.5" title={att.original_file_name}>
                                            {att.original_file_name}
                                          </p>
                                          <p className="text-[9px] font-semibold uppercase text-[var(--text-muted)]">
                                            {(att.file_size / 1024).toFixed(0)} KB
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => messagesApi.downloadAttachment(att.id)}
                                          className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-secondary)] border-[var(--border-default)]"
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
                            </>
                          )}
                          </div>
                          <MessageActionsMenu
                            isSelf={isSelf}
                            canDelete={canDeleteMessage(msg, activeConv, user?.id, user?.role)}
                            showDelete={!msg.is_deleted}
                            showReply={!msg.is_deleted}
                            onReply={() => setReplyingTo(msg)}
                            onInfo={() => openMessageInfo(msg)}
                            onDelete={() => setDeleteConfirmMessage(msg)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                ))
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Fixed composer */}
            <form onSubmit={handleSendMessage} className="shrink-0 p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] dark:bg-[#0f172a] relative">
              {showMentionPicker && activeConv?.type !== 'direct' && (
                <div className="absolute bottom-full left-3 mb-2 w-64 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-lg p-1.5 z-40 max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="p-2 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] mb-1">
                    Mention members
                  </div>
                  {filteredMentionUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-[var(--text-muted)]">No mentionable users found.</div>
                  ) : (
                    filteredMentionUsers.map(mu => (
                      <button
                        key={mu.id}
                        type="button"
                        onClick={() => handleSelectMention(mu.full_name)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-subtle)] rounded-md text-xs text-left"
                      >
                        <UserProfilePicture user={mu} name={mu.full_name} size="sm" className="h-5 w-5 shrink-0" />
                        <span className="truncate font-medium">{mu.full_name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {sendError && (
                <div className="mb-2 flex items-center gap-2 p-2 rounded-lg border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] flex-1">{sendError}</span>
                  <button type="button" onClick={() => setSendError(null)} className="hover:opacity-80">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {sendRestrictionMsg && (
                <div className="mb-2 flex items-center gap-2 p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                  <ShieldOff className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px]">{sendRestrictionMsg}</span>
                </div>
              )}

              {replyingTo && (
                <MessageReplyComposerPreview
                  replyTarget={replyingTo}
                  onCancel={() => setReplyingTo(null)}
                />
              )}

              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 mb-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  {selectedFiles.map((file, idx) => (
                    <FilePreviewCard
                      key={idx}
                      file={file}
                      onRemove={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
                <RichTextComposer
                  ref={composerRef}
                  placeholder={canISend ? `Message ${activeConvName}` : sendRestrictionMsg ?? ''}
                  disabled={!canISend || isSending}
                  onUpdate={handleComposerUpdate}
                  onSubmit={handleComposerSubmit}
                />
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30">
                  <div className="flex items-center gap-0.5 min-w-0">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md shrink-0" disabled={!canISend || isSending} onClick={() => fileInputRef.current?.click()} title="Attach file">
                      <Paperclip className="h-3.5 w-3.5" />
                    </Button>
                    <ComposerEmojiPicker disabled={!canISend || isSending} onSelect={handleEmojiInsert} />
                    <VoiceMessageRecorder
                      disabled={!canISend}
                      isSending={isSending}
                      onSendVoice={handleSendVoiceNote}
                      onError={(message) => setSendError(message)}
                    />
                    {activeConv?.type !== 'direct' && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" title="Mention" onClick={() => setShowMentionPicker(true)}>
                        <AtSign className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {activeConv?.type === 'direct' && (
                      <>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md hidden sm:flex" disabled={!dmCallButtonState.canCall} onClick={() => handleStartCall('voice')} title={getCallButtonTitle('voice', dmCallButtonState)}>
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md hidden sm:flex" disabled={!dmCallButtonState.canCall} onClick={() => handleStartCall('video')} title={getCallButtonTitle('video', dmCallButtonState)}>
                          <Video className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={(!composerPlainText.trim() && selectedFiles.length === 0) || isSending || !canISend}
                    className="h-8 rounded-md px-3"
                  >
                    {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" /> Send</>}
                  </Button>
                </div>
              </div>
            </form>
              </>
            )}

            {conversationPanelTab === 'files' && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                {sharedAttachments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] py-12">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <p>No files shared in this conversation yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sharedAttachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                        <FileText className="h-5 w-5 text-[var(--accent-primary)] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{att.original_file_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{(att.file_size / 1024).toFixed(0)} KB</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => messagesApi.downloadAttachment(att.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {conversationPanelTab === 'calls' && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
                {callEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] py-12">
                    <Phone className="h-8 w-8 mb-2 opacity-50" />
                    <p>No call history in this conversation yet.</p>
                    {activeConv?.type === 'direct' && (
                      <Button
                        size="sm"
                        className="mt-3 rounded-lg"
                        disabled={!dmCallButtonState.canCall}
                        title={getCallButtonTitle('voice', dmCallButtonState)}
                        onClick={() => handleStartCall('voice')}
                      >
                        Start voice call
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callEvents.map((evt) => (
                      <div key={evt.id} className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs">
                        <p className="font-medium text-[var(--text-primary)]">{evt.body}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatMessageTime(evt.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {conversationPanelTab === 'details' && (
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">About</p>
                  <p className="text-sm font-semibold">{activeConvName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Type: {getConvTypeLabel(activeConv.type)}</p>
                  {activeConv.related_entity_type && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Related: {activeConv.related_entity_type.replace('_', ' ')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Participants ({activeConv.participants.length})
                  </p>
                  <div className="space-y-2">
                    {activeConv.participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-[var(--border-subtle)]">
                        <UserProfilePicture user={p.user} name={p.user.full_name} size="sm" className="h-8 w-8" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{p.user.full_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{p.user.email || p.user.role}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${roleBadge(p.role).cls}`}>
                          {roleBadge(p.role).label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col justify-center items-center p-8 text-center text-[var(--text-muted)] space-y-4">
            <div className="h-14 w-14 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--accent-primary)] flex items-center justify-center">
              <MessageSquare className="h-7 w-7" />
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

      <StartConversationModal
        open={showCreateModal}
        currentUserId={user?.id}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreateConversationSuccess}
        getConvIcon={getConvIcon}
      />

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
                        <UserProfilePicture user={p.user} name={p.user.full_name} size="default" className="h-9 w-9 ring-1 ring-[var(--border-default)]" />
                        <div>
                          <p className="text-xs font-black text-[var(--text-primary)]">
                            {p.user.full_name} {isMe && <span className="text-[var(--text-muted)] font-semibold">(you)</span>}
                          </p>
                          <p className="text-[9px] text-[var(--text-muted)] font-semibold">{p.user.email || p.user.role}</p>
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
                            <UserProfilePicture user={u} name={u.full_name} size="default" className="h-8 w-8 ring-1 ring-[var(--border-default)]" />
                            <div>
                              <p className="text-xs font-black text-[var(--text-primary)]">{u.full_name}</p>
                              <p className="text-[9px] text-[var(--text-muted)]">{u.role}{u.email ? ` · ${u.email}` : ''}</p>
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

      <MessageInfoDialog
        open={messageInfoOpen}
        onOpenChange={setMessageInfoOpen}
        loading={messageInfoLoading}
        info={messageInfoData}
        error={messageInfoError}
        isDirect={activeConv?.type === 'direct'}
      />

      <Dialog open={!!deleteConfirmMessage} onOpenChange={(open) => !open && setDeleteConfirmMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this message?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-[var(--text-secondary)]">
              This will remove the message for everyone in this conversation.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmMessage(null)}
              disabled={isDeletingMessage}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteMessage}
              disabled={isDeletingMessage}
            >
              {isDeletingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        <span className="text-xs text-[var(--text-muted)]">Loading messages workspace…</span>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
