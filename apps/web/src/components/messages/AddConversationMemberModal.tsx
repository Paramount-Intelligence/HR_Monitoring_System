'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import {
  messagesApi,
  type AvailableConversationMember,
} from '@/lib/api/messages';
import { getErrorMessage } from '@/lib/api/client';
import { canFetchProtectedData } from '@/lib/auth/session';
import { logProtectedFetchError } from '@/lib/api/fetch-errors';

interface AddConversationMemberModalProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddConversationMemberModal({
  open,
  conversationId,
  onClose,
  onAdded,
}: AddConversationMemberModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [users, setUsers] = useState<AvailableConversationMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadUsers = useCallback(async (search: string) => {
    if (!canFetchProtectedData() || !conversationId) return;
    try {
      setLoadingUsers(true);
      const data = await messagesApi.getAvailableConversationMembers(conversationId, search || undefined);
      setUsers(data.users);
    } catch (err) {
      logProtectedFetchError('[Messages] Available members error', err);
      setUsers([]);
      setError(getErrorMessage(err));
    } finally {
      setLoadingUsers(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    loadUsers(debouncedSearch);
  }, [open, debouncedSearch, loadUsers]);

  useEffect(() => {
    if (!open) {
      setSearchInput('');
      setDebouncedSearch('');
      setSelectedUserIds([]);
      setUsers([]);
      setError(null);
    }
  }, [open]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [users, selectedUserIds]
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (selectedUserIds.length === 0 || submitting) return;
    try {
      setSubmitting(true);
      setError(null);
      await messagesApi.addConversationParticipants(conversationId, selectedUserIds);
      onAdded();
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
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] text-[var(--text-primary)] flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--accent-primary)]" />
            Add Member
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] text-xs font-bold">
              {error}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search users by name, email, role, or department"
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[10px] font-bold"
                >
                  {user.name}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {loadingUsers ? (
            <div className="flex items-center justify-center py-10 text-xs text-[var(--text-muted)] gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching users...
            </div>
          ) : users.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--text-muted)]">No users found</div>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {users.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUser(user.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all border ${
                      isSelected
                        ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40'
                        : 'bg-transparent border-transparent hover:bg-[var(--bg-sidebar-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserProfilePicture
                        user={{ profile_picture_url: user.avatar_url, presence_status: user.presence_status as 'active' | 'away' | undefined }}
                        name={user.name}
                        size="default"
                        showPresence
                        className="h-8 w-8 ring-1 ring-[var(--border-default)]"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{user.name}</p>
                        <p className="text-[9px] text-[var(--text-muted)] truncate">
                          {user.role}
                          {user.department ? ` · ${user.department}` : ''}
                          {user.email ? ` · ${user.email}` : ''}
                        </p>
                      </div>
                    </div>
                    {isSelected && <UserCheck className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || selectedUserIds.length === 0}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
