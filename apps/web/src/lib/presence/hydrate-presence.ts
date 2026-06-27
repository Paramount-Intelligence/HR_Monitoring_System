import type { Conversation } from '@/lib/api/messages';
import type { MessagingDirectoryUser } from '@/lib/api/messages';
import { hydrateUserPresence } from './presence-store';
import type { OnlineState, PresenceStatus } from './types';

type HydratableUser = {
  id?: string;
  presence_status?: PresenceStatus | string | null;
  presence_updated_at?: string | null;
  last_seen_at?: string | null;
  online_state?: OnlineState | string | null;
  is_online?: boolean;
};

export function hydrateFromUserLike(user?: HydratableUser | null) {
  if (!user?.id) return;
  hydrateUserPresence(user.id, {
    presence_status:
      user.presence_status === 'active' || user.presence_status === 'away'
        ? user.presence_status
        : undefined,
    presence_updated_at: user.presence_updated_at ?? null,
    last_seen_at: user.last_seen_at ?? null,
    online_state:
      user.online_state === 'online' || user.online_state === 'offline'
        ? user.online_state
        : undefined,
    is_online: user.is_online,
  });
}

export function hydratePresenceFromConversations(conversations: Conversation[]) {
  for (const conversation of conversations) {
    for (const participant of conversation.participants ?? []) {
      hydrateFromUserLike(participant.user);
    }
  }
}

export function hydratePresenceFromDirectory(users: MessagingDirectoryUser[]) {
  for (const user of users) {
    hydrateFromUserLike(user);
  }
}

export function hydratePresenceFromUsers(users: HydratableUser[]) {
  for (const user of users) {
    hydrateFromUserLike(user);
  }
}
