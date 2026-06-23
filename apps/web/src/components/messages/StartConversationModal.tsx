'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Sparkles, UserCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { messagesApi, Conversation, ConversationType } from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { canFetchProtectedData } from '@/lib/auth/session';
import { logProtectedFetchError } from '@/lib/api/fetch-errors';
import {
  canLaunchConversation,
  getConversationTitleLabel,
  getLaunchButtonLabel,
  getMessagingUserSubtitle,
} from '@/components/messages/start-conversation-utils';
import type { MessagingDirectoryUser } from '@/lib/api/messages';

interface StartConversationModalProps {
  open: boolean;
  currentUserId?: string;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
  getConvIcon: (type: ConversationType) => React.ReactNode;
}

export function StartConversationModal({
  open,
  currentUserId,
  onClose,
  onCreated,
  getConvIcon,
}: StartConversationModalProps) {
  const [conversationType, setConversationType] = useState<ConversationType>('direct');
  const [title, setTitle] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<MessagingDirectoryUser[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadDirectory = useCallback(async (search: string) => {
    if (!canFetchProtectedData()) return;
    try {
      setLoadingDirectory(true);
      const data = await messagesApi.getMessagingDirectory({
        search: search || undefined,
        limit: 100,
      });
      setDirectoryUsers(data);
    } catch (err) {
      logProtectedFetchError('[Messages] Messaging directory error', err);
      setDirectoryUsers([]);
    } finally {
      setLoadingDirectory(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadDirectory(debouncedSearch);
  }, [open, debouncedSearch, loadDirectory]);

  useEffect(() => {
    if (!open) {
      setConversationType('direct');
      setTitle('');
      setSelectedParticipantIds([]);
      setSearchInput('');
      setDebouncedSearch('');
      setError(null);
    }
  }, [open]);

  const selectedUsers = useMemo(
    () =>
      selectedParticipantIds
        .map((id) => directoryUsers.find((user) => user.id === id))
        .filter(Boolean) as MessagingDirectoryUser[],
    [directoryUsers, selectedParticipantIds]
  );

  const visibleUsers = useMemo(() => {
    if (!currentUserId) return directoryUsers;
    return directoryUsers.filter((user) => user.id !== currentUserId);
  }, [directoryUsers, currentUserId]);

  const launchEnabled = canLaunchConversation({
    conversationType,
    selectedParticipantIds,
    title,
  });

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds((prev) => {
      if (conversationType === 'direct') return [userId];
      return prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId];
    });
  };

  const removeParticipant = (userId: string) => {
    setSelectedParticipantIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!launchEnabled) return;

    try {
      setSubmitting(true);
      setError(null);
      const conversation = await messagesApi.createConversation({
        type: conversationType,
        title: conversationType === 'direct' ? undefined : title.trim(),
        participant_ids: selectedParticipantIds,
      });
      onCreated(conversation);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-card)] text-[var(--text-primary)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" /> Start Conversation
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2">
          {(['direct', 'group', 'channel'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider flex flex-col items-center gap-2 transition-all ${
                conversationType === type
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                  : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]'
              }`}
              onClick={() => {
                setConversationType(type);
                setSelectedParticipantIds([]);
                setTitle('');
              }}
            >
              {getConvIcon(type)}
              {type}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search people by name, role, or department..."
            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {conversationType !== 'direct' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                {getConversationTitleLabel(conversationType)}
              </label>
              <input
                type="text"
                placeholder={conversationType === 'channel' ? 'e.g. engineering-updates' : 'Enter group name...'}
                required
                className="w-full p-3 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
          )}

          {conversationType !== 'direct' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] w-full">
                Selected {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'}
              </span>
              {selectedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => removeParticipant(user.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--text-primary)]"
                >
                  {user.full_name}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
              {conversationType === 'direct' ? 'Select participant' : 'Add participants'}
            </label>
            <div className="max-h-[360px] overflow-y-auto border border-[var(--border-default)] rounded-xl p-2 space-y-1 custom-scrollbar">
              {loadingDirectory ? (
                <div className="py-10 flex items-center justify-center text-xs text-[var(--text-muted)] gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading people...
                </div>
              ) : visibleUsers.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--text-muted)] font-semibold">
                  No people found.
                </div>
              ) : (
                visibleUsers.map((user) => {
                  const isSelected = selectedParticipantIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleParticipant(user.id)}
                      className={`w-full flex items-center justify-between p-2 hover:bg-[var(--bg-sidebar-hover)] rounded-xl text-left transition-all ${
                        isSelected ? 'bg-[var(--bg-sidebar-active)]/50 ring-1 ring-[var(--accent-primary)]/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserProfilePicture
                          user={user}
                          name={user.full_name}
                          size="default"
                          className="h-8 w-8 ring-1 ring-[var(--border-default)] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user.full_name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate capitalize">
                            {getMessagingUserSubtitle(user)}
                          </p>
                        </div>
                      </div>
                      {isSelected && <UserCheck className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <p className="text-[11px] text-[var(--status-danger-text)] font-semibold">{error}</p>
          )}

          <Button
            type="submit"
            disabled={submitting || !launchEnabled}
            className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 text-white rounded-xl shadow-md text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              getLaunchButtonLabel(conversationType)
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
