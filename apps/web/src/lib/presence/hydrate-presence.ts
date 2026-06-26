import type { Conversation } from '@/lib/api/messages';
import type { MessagingDirectoryUser } from '@/lib/api/messages';
import { hydrateUserPresence } from './presence-store';
import type { PresenceStatus } from './types';

function hydrateFromUser(
  userId: string | undefined,
  presenceStatus?: string | null,
  presenceUpdatedAt?: string | null,
  lastSeenAt?: string | null,
) {
  if (!userId || (presenceStatus !== 'active' && presenceStatus !== 'away')) return;
  hydrateUserPresence(userId, {
    presence_status: presenceStatus as PresenceStatus,
    presence_updated_at: presenceUpdatedAt ?? null,
    last_seen_at: lastSeenAt ?? null,
  });
}

export function hydratePresenceFromConversations(conversations: Conversation[]) {
  for (const conversation of conversations) {
    for (const participant of conversation.participants ?? []) {
      const user = participant.user;
      hydrateFromUser(
        user?.id,
        user?.presence_status,
        user?.presence_updated_at,
        user?.last_seen_at,
      );
    }
  }
}

export function hydratePresenceFromDirectory(users: MessagingDirectoryUser[]) {
  for (const user of users) {
    hydrateFromUser(
      user.id,
      user.presence_status,
      user.presence_updated_at,
      user.last_seen_at,
    );
  }
}

export function hydratePresenceFromUsers(
  users: Array<{
    id?: string;
    presence_status?: PresenceStatus | string | null;
    presence_updated_at?: string | null;
    last_seen_at?: string | null;
  }>,
) {
  for (const user of users) {
    hydrateFromUser(user.id, user.presence_status, user.presence_updated_at, user.last_seen_at);
  }
}
