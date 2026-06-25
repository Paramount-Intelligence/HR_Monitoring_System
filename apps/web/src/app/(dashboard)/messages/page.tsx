'use client';

import { useState, useEffect, useRef, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { canFetchProtectedData } from '@/lib/auth/session';
import { logProtectedFetchError } from '@/lib/api/fetch-errors';
import { useRealtimeEvent, useRealtimeReconnect, useRealtimeStatus } from '@/hooks/useRealtime';
import { useCall } from '@/providers/CallProvider';
import { unlockSounds } from '@/lib/calls/sounds';
import { playOutgoingMessageSound } from '@/lib/notifications/sounds';
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
import {
  MessagesSettingsPanel,
  type MessagesLeftPanelMode,
} from '@/components/messages/MessagesSettingsPanel';
import { MessagesConversationHeader } from '@/components/messages/MessagesConversationHeader';
import { MessagesChatStream } from '@/components/messages/MessagesChatStream';
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
  ChatListFilter,
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
  const pendingComposerFocusRef = useRef<string | null>(null);
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
  const [chatListFilter, setChatListFilter] = useState<ChatListFilter>('all');
  const [leftPanelMode, setLeftPanelMode] = useState<MessagesLeftPanelMode>('chats');
  const [settingsSearch, setSettingsSearch] = useState('');
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
    pendingComposerFocusRef.current = null;
  }, [selectedConversationId]);

  useEffect(() => {
    if (isSending) return;

    const conversationId = pendingComposerFocusRef.current;
    if (!conversationId) return;
    pendingComposerFocusRef.current = null;

    if (latestSelectedConvId.current !== conversationId) return;
    if (!canISend) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (latestSelectedConvId.current !== conversationId) return;
        composerRef.current?.focus();
      });
    });
  }, [isSending, canISend]);

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
    const convId = selectedConversationId;
    let active = true;

    const fetchThread = async () => {
      if (!canFetchProtectedData() || !convId) return;
      try {
        setLoadingMsgs(true);
        setThreadLoadError(null);
        setMessages([]);

        let data: Message[] = [];
        let lastError: unknown;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            data = await messagesApi.getMessages(convId, { limit: 50 });
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            const status = (err as { response?: { status?: number } }).response?.status;
            if (status === 403 || status === 404) throw err;
            if (attempt < 1) {
              await new Promise((resolve) => setTimeout(resolve, 400));
              continue;
            }
            throw err;
          }
        }

        if (!active || latestSelectedConvId.current !== convId) return;
        setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active || latestSelectedConvId.current !== convId) return;
        setThreadLoadError(getConversationLoadError(err));
      } finally {
        if (active) setLoadingMsgs(false);
      }
    };

    const markRead = async () => {
      if (!canFetchProtectedData()) return;
      try {
        await messagesApi.markConversationRead(convId);
        if (active) {
          setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
          window.dispatchEvent(new Event('pims-messages-unread-update'));
        }
      } catch (err) { logProtectedFetchError('[Messages] Mark read error', err); }
    };

    const fetchMentionable = async () => {
      if (!canFetchProtectedData()) return;
      try {
        const data = await messagesApi.getMentionableUsers(convId);
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
      playOutgoingMessageSound();
    } catch (err) {
      setSendError(getErrorMessage(err) || 'Unable to send voice message.');
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const conversationIdAtSend = selectedConversationId;
    if (!conversationIdAtSend || isSending || !canISend) return;

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
            conversationIdAtSend,
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

      const sentMsg = await messagesApi.sendMessage(conversationIdAtSend, payload);

      if (latestSelectedConvId.current !== conversationIdAtSend) return;

      setMessages(prev => [...prev, sentMsg]);
      pendingComposerFocusRef.current = conversationIdAtSend;
      composerRef.current?.clear();
      setComposerPlainText('');
      setSelectedFiles([]);
      setReplyingTo(null);
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationIdAtSend
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        )
      );
      playOutgoingMessageSound();
    } catch (err) {
      setSendError(getErrorMessage(err) || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversationSuccess = (newConv: Conversation) => {
    setConversations((prev) => [newConv, ...prev]);
    setShowCreateModal(false);
    setThreadLoadError(null);
    setMessages([]);
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
  const showLeftPanel =
    leftPanelMode !== 'chats' ? true : !isMobile || !selectedConversationId;
  const showConversationPanel =
    leftPanelMode === 'chats' &&
    (selectedConversationId ? true : !isMobile ? true : false);

  const PANEL_TABS: { id: ConversationPanelTab; label: string }[] = [
    { id: 'messages', label: 'Messages' },
    { id: 'files', label: 'Files' },
    { id: 'calls', label: 'Calls' },
    { id: 'details', label: 'Details' },
  ];

  // ─── RENDER ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-white dark:bg-[#111b21]">
      <MessagesWorkspaceSidebar
        conversations={conversations}
        loading={loadingConvs}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        chatListFilter={chatListFilter}
        onChatListFilterChange={setChatListFilter}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewMessage={() => setShowCreateModal(true)}
        onOpenSettings={() => setLeftPanelMode('settings')}
        currentUserId={user?.id}
        visible={showLeftPanel && leftPanelMode === 'chats'}
      />

      {showLeftPanel && leftPanelMode === 'settings' && (
        <MessagesSettingsPanel
          onBack={() => setLeftPanelMode('chats')}
          settingsSearch={settingsSearch}
          onSettingsSearchChange={setSettingsSearch}
        />
      )}

      {/* Active conversation panel */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]',
          showConversationPanel ? 'flex' : 'hidden lg:flex'
        )}
      >
        {activeConv ? (
          <>
            <MessagesConversationHeader
              activeConv={activeConv}
              activeConvName={activeConvName}
              currentUserId={user?.id}
              myRole={myRole}
              isMobile={isMobile}
              isGroupOrChannel={isGroupOrChannel}
              canIAddMembers={canIAddMembers}
              canIManageSettings={canIManageSettings}
              dmCallButtonState={dmCallButtonState}
              onBack={() => {
                setSelectedConversationId(null);
                router.replace('/messages');
              }}
              onStartCall={handleStartCall}
              onShowPremiumCall={() => setShowPremiumCallModal(true)}
              onOpenManage={openManageModal}
              onOpenSettings={openSettingsModal}
              getCallButtonTitle={getCallButtonTitle}
              roleBadge={roleBadge}
            />

            {/* Sub-tabs */}
            <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[#f0f2f5] dark:bg-[#202c33] overflow-x-auto custom-scrollbar">
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
            <MessagesChatStream
              groupedMessages={groupedMessages}
              loading={loadingMsgs}
              loadError={threadLoadError}
              activeConv={activeConv}
              currentUserId={user?.id}
              userRole={user?.role}
              hasNewMessagesBelow={hasNewMessagesBelow}
              onScrollToNew={() => {
                setHasNewMessagesBelow(false);
                messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              onRetry={() => loadMessages(activeConv.id)}
              messagesContainerRef={messagesContainerRef}
              messageEndRef={messageEndRef}
              onReply={setReplyingTo}
              onDelete={setDeleteConfirmMessage}
              onInfo={openMessageInfo}
              canDeleteMessage={canDeleteMessage}
            />

            {/* Fixed composer */}
            <form onSubmit={handleSendMessage} className="shrink-0 p-3 border-t border-[var(--border-subtle)] bg-[#f0f2f5] dark:bg-[#202c33] relative">
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
                  placeholder={canISend ? 'Type a message' : sendRestrictionMsg ?? ''}
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
                    onMouseDown={event => event.preventDefault()}
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
          <div className="flex-1 min-h-0 flex flex-col justify-center items-center p-8 text-center bg-[#f0f2f5] dark:bg-[#222e35]">
            <div className="h-24 w-24 rounded-full bg-[#dfe5e7] dark:bg-[#374248] flex items-center justify-center mb-6">
              <MessageSquare className="h-10 w-10 text-[#54656f]" />
            </div>
            <h2 className="text-2xl font-light text-[#41525d] dark:text-[#e9edef] mb-2">
              PIMS Messages
            </h2>
            <p className="text-sm text-[#667781] dark:text-[#8696a0] max-w-sm mb-6">
              Select a chat from the list or start a new conversation to send messages.
            </p>
            <Button
              className="rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-white px-6"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> New chat
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
