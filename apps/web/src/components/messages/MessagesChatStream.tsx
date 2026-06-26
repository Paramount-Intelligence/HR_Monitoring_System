'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import apiClient from '@/lib/api/client';
import { messagesApi, type Conversation, type Message } from '@/lib/api/messages';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessageActionsMenu } from '@/components/messages/MessageActionsMenu';
import { MessageBody } from '@/components/messages/MessageBody';
import { MessageQuotedReply } from '@/components/messages/MessageQuotedReply';
import { MessageStatusIndicator } from '@/components/messages/MessageStatusIndicator';
import { VoiceMessageBubble } from '@/components/messages/VoiceMessageBubble';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import {
  formatMessageTime,
  type ConversationLoadError,
  type SlackMessageRenderItem,
} from '@/components/messages/messages-utils';
import { isVoiceNoteAttachment, isVoiceNoteMessage } from '@/lib/messages/voice-messages';

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
      } catch {
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
      <div className={cn('flex items-center justify-center bg-black/5 dark:bg-white/5', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-primary)]/40" />
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-black/5 dark:bg-white/5 text-[var(--text-muted)] text-[10px]',
          className
        )}
      >
        <span>Failed to load image</span>
      </div>
    );
  }

  return <img src={objectUrl} alt={alt} className={className} />;
}

export interface MessagesChatStreamProps {
  groupedMessages: { date: string; items: SlackMessageRenderItem[] }[];
  loading: boolean;
  loadError: ConversationLoadError | null;
  activeConv: Conversation | null;
  currentUserId?: string;
  userRole?: string;
  hasNewMessagesBelow: boolean;
  onScrollToNew: () => void;
  onRetry: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messageEndRef: React.RefObject<HTMLDivElement | null>;
  onReply: (message: Message) => void;
  onDelete: (message: Message) => void;
  onInfo: (message: Message) => void;
  canDeleteMessage: (
    msg: Message,
    conv: Conversation | null,
    userId: string | undefined,
    userRole?: string
  ) => boolean;
}

function shouldShowIncomingSenderName(
  activeConv: Conversation | null,
  showHeader: boolean
): boolean {
  if (!activeConv) return showHeader;
  if (activeConv.type === 'group' || activeConv.type === 'channel') return true;
  return showHeader;
}

export function MessagesChatStream({
  groupedMessages,
  loading,
  loadError,
  activeConv,
  currentUserId,
  userRole,
  hasNewMessagesBelow,
  onScrollToNew,
  onRetry,
  messagesContainerRef,
  messageEndRef,
  onReply,
  onDelete,
  onInfo,
  canDeleteMessage,
}: MessagesChatStreamProps) {
  const isEmpty =
    groupedMessages.length === 0 ||
    groupedMessages.every((group) => group.items.length === 0);

  return (
    <div
      ref={messagesContainerRef}
      className="messages-chat-stream flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 bg-[#efeae2] dark:bg-[#0b141a] relative"
    >
      {hasNewMessagesBelow && (
        <button
          type="button"
          onClick={onScrollToNew}
          className="sticky top-2 left-1/2 -translate-x-1/2 z-10 mx-auto block rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-bold text-white shadow-lg"
        >
          New message
        </button>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--text-muted)] font-semibold flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-primary)]" />
          Synchronizing thread...
        </div>
      ) : loadError ? (
        <div className="py-24 text-center text-xs text-[var(--text-muted)] font-semibold space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] flex items-center justify-center mx-auto shadow-md">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-[var(--text-primary)] font-black uppercase tracking-wider text-xs">
              {loadError.title}
            </p>
            <p className="text-[var(--text-secondary)] text-[10px] max-w-sm mx-auto font-semibold leading-relaxed">
              {loadError.message}
            </p>
          </div>
          {loadError.canRetry && (
            <Button
              variant="outline"
              className="rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-sidebar-hover)] text-xs font-bold gap-2"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </div>
      ) : isEmpty ? (
        <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-2 py-12">
          <MessageSquare className="h-8 w-8 text-[var(--text-muted)] opacity-50" />
          <p className="font-medium text-[var(--text-secondary)]">No messages yet</p>
          <p className="text-[10px] text-[var(--text-muted)] max-w-xs">
            Send the first message to start the conversation.
          </p>
        </div>
      ) : (
        groupedMessages.map((group) => (
          <div key={group.date} className="space-y-2">
            <div className="flex justify-center py-2">
              <span className="text-[11px] font-medium text-[#54656f] dark:text-[#aebac1] bg-white/90 dark:bg-[#182229] px-3 py-1 rounded-lg shadow-sm">
                {group.date}
              </span>
            </div>

            {group.items.map((item) => {
              const msg = item.message;
              const isSelf = msg.sender_id === currentUserId;
              const isSystem = msg.message_type === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span className="text-[10px] text-[#54656f] dark:text-[#aebac1] bg-white/90 dark:bg-[#182229] px-3 py-1 rounded-full shadow-sm">
                      {msg.body}
                    </span>
                  </div>
                );
              }

              const showSenderName = !isSelf && shouldShowIncomingSenderName(activeConv, item.showHeader);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex w-full items-end gap-2',
                    isSelf ? 'justify-end' : 'justify-start',
                    item.isContinuation ? 'mt-0.5' : 'mt-2'
                  )}
                >
                  {!isSelf && (
                    <div className="w-8 shrink-0">
                      {item.showAvatar ? (
                        <UserProfilePicture
                          user={msg.sender}
                          userId={msg.sender.id}
                          name={msg.sender.full_name}
                          size="sm"
                          className="h-8 w-8"
                          showPresence
                        />
                      ) : (
                        <span className="block w-8" aria-hidden />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      'group/message relative flex items-start gap-1 max-w-[65%]',
                      isSelf ? 'ml-auto' : 'mr-auto'
                    )}
                  >
                    <div
                      className={cn(
                        'min-w-0 rounded-lg px-2.5 py-1.5 text-sm leading-relaxed text-[#111b21] dark:text-[#e9edef]',
                        isSelf
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-sm'
                          : 'bg-white dark:bg-[#202c33] border border-[#e9edef] dark:border-[#374248] rounded-tl-sm shadow-sm'
                      )}
                    >
                      {showSenderName && (
                        <p className="text-xs font-semibold text-[#25d366] dark:text-[#53bdeb] mb-0.5 leading-tight">
                          {msg.sender.full_name}
                        </p>
                      )}

                      {msg.reply_to_message && !msg.is_deleted && (
                        <MessageQuotedReply reply={msg.reply_to_message} isSelf={isSelf} />
                      )}

                      {msg.is_deleted ? (
                        <p className="text-sm italic text-[#667781] dark:text-[#8696a0]">
                          This message was deleted.
                        </p>
                      ) : (
                        <>
                          {msg.body && !isVoiceNoteMessage(msg) && (
                            <MessageBody text={msg.body} html={msg.body_html} />
                          )}

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div
                              className={cn(
                                'space-y-2 mt-2 pt-1',
                                (msg.body || msg.reply_to_message) &&
                                  'border-t border-black/10 dark:border-white/10'
                              )}
                            >
                              {msg.attachments
                                .filter((att) => isVoiceNoteAttachment(att))
                                .map((att) => (
                                  <VoiceMessageBubble key={att.id} attachment={att} isSelf={isSelf} />
                                ))}

                              {msg.attachments.some((att) => att.mime_type.startsWith('image/')) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {msg.attachments
                                    .filter((att) => att.mime_type.startsWith('image/'))
                                    .map((att) => (
                                      <div
                                        key={att.id}
                                        className="relative rounded-lg overflow-hidden group border border-black/10 dark:border-white/10 aspect-video bg-black/5"
                                      >
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

                              {msg.attachments.filter(
                                (att) =>
                                  !att.mime_type.startsWith('image/') && !isVoiceNoteAttachment(att)
                              ).length > 0 && (
                                <div className="space-y-1">
                                  {msg.attachments
                                    .filter(
                                      (att) =>
                                        !att.mime_type.startsWith('image/') &&
                                        !isVoiceNoteAttachment(att)
                                    )
                                    .map((att) => (
                                      <div
                                        key={att.id}
                                        className={cn(
                                          'flex items-center justify-between p-2.5 rounded-lg border text-xs gap-3',
                                          isSelf
                                            ? 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-[#111b21] dark:text-[#e9edef]'
                                            : 'bg-[#f5f6f6] dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374248] text-[#111b21] dark:text-[#e9edef]'
                                        )}
                                      >
                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/30">
                                          <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="truncate font-semibold mb-0.5"
                                            title={att.original_file_name}
                                          >
                                            {att.original_file_name}
                                          </p>
                                          <p className="text-[9px] font-semibold uppercase text-[#667781] dark:text-[#8696a0]">
                                            {(att.file_size / 1024).toFixed(0)} KB
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => messagesApi.downloadAttachment(att.id)}
                                          className={cn(
                                            'p-1.5 rounded-lg border transition-colors',
                                            isSelf
                                              ? 'hover:bg-black/10 dark:hover:bg-white/10 text-[#54656f] dark:text-[#aebac1] border-black/10 dark:border-white/10'
                                              : 'hover:bg-[#e9edef] dark:hover:bg-[#374248] text-[#54656f] dark:text-[#aebac1] border-[#e9edef] dark:border-[#374248]'
                                          )}
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

                      <div
                        className={cn(
                          'flex items-center justify-end gap-1 mt-0.5 -mb-0.5',
                          'text-[10px] text-[#667781] dark:text-[#8696a0] tabular-nums'
                        )}
                      >
                        <span>{formatMessageTime(msg.created_at)}</span>
                        {isSelf && (
                          <MessageStatusIndicator
                            status={msg.delivery_status}
                            sentAt={msg.sent_at ?? msg.created_at}
                            deliveredAt={msg.delivered_at}
                            seenAt={msg.seen_at}
                            createdAt={msg.created_at}
                          />
                        )}
                      </div>
                    </div>

                    <MessageActionsMenu
                      isSelf={isSelf}
                      canDelete={canDeleteMessage(msg, activeConv, currentUserId, userRole)}
                      showDelete={!msg.is_deleted}
                      showReply={!msg.is_deleted}
                      onReply={() => onReply(msg)}
                      onInfo={() => onInfo(msg)}
                      onDelete={() => onDelete(msg)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      <div ref={messageEndRef} />
    </div>
  );
}
