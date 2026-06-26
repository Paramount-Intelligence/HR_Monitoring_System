import { messagesApi } from '@/lib/api/messages';

const markedDeliveredKeys = new Set<string>();
const pendingDeliveredByConversation = new Map<string, Set<string>>();
let deliveredFlushTimer: ReturnType<typeof setTimeout> | null = null;

const seenTimers = new Map<string, ReturnType<typeof setTimeout>>();
const seenInFlight = new Set<string>();

function markKey(conversationId: string, messageId: string): string {
  return `${conversationId}:${messageId}`;
}

async function flushDeliveredMarks(): Promise<void> {
  deliveredFlushTimer = null;
  const batches = [...pendingDeliveredByConversation.entries()];
  pendingDeliveredByConversation.clear();

  await Promise.all(
    batches.map(async ([conversationId, messageIds]) => {
      const ids = [...messageIds];
      if (!ids.length) return;
      try {
        await messagesApi.markMessagesDelivered(conversationId, ids);
        ids.forEach((id) => markedDeliveredKeys.add(markKey(conversationId, id)));
      } catch {
        ids.forEach((id) => markedDeliveredKeys.delete(markKey(conversationId, id)));
      }
    }),
  );
}

/** Queue delivered receipt for an incoming message (idempotent, batched). */
export function queueMarkDelivered(
  conversationId: string,
  messageId: string,
  senderId: string | undefined,
  currentUserId: string | undefined,
): void {
  if (!conversationId || !messageId || !currentUserId || !senderId) return;
  if (senderId === currentUserId) return;

  const key = markKey(conversationId, messageId);
  if (markedDeliveredKeys.has(key)) return;

  let pending = pendingDeliveredByConversation.get(conversationId);
  if (!pending) {
    pending = new Set();
    pendingDeliveredByConversation.set(conversationId, pending);
  }
  if (pending.has(messageId)) return;
  pending.add(messageId);

  if (deliveredFlushTimer) clearTimeout(deliveredFlushTimer);
  deliveredFlushTimer = setTimeout(() => {
    void flushDeliveredMarks();
  }, 120);
}

/** Mark conversation messages as seen (immediate). */
export async function markConversationSeen(
  conversationId: string,
  messageIds?: string[],
): Promise<void> {
  if (!conversationId || typeof document === 'undefined' || document.hidden) return;
  if (seenInFlight.has(conversationId)) return;

  seenInFlight.add(conversationId);
  try {
    await messagesApi.markConversationSeen(conversationId, messageIds);
  } finally {
    seenInFlight.delete(conversationId);
  }
}

/** Debounced seen mark for active visible conversations. */
export function scheduleMarkConversationSeen(
  conversationId: string,
  messageIds?: string[],
): void {
  if (!conversationId || typeof document === 'undefined' || document.hidden) return;

  const existing = seenTimers.get(conversationId);
  if (existing) clearTimeout(existing);

  seenTimers.set(
    conversationId,
    setTimeout(() => {
      seenTimers.delete(conversationId);
      void markConversationSeen(conversationId, messageIds);
    }, 80),
  );
}

/** After delivered flush, mark seen for active conversation messages. */
export async function markDeliveredThenSeen(
  conversationId: string,
  messageId: string,
  senderId: string | undefined,
  currentUserId: string | undefined,
  isActiveConversation: boolean,
): Promise<void> {
  if (!conversationId || !messageId || !currentUserId || !senderId) return;
  if (senderId === currentUserId) return;
  if (!isActiveConversation || document.hidden) return;

  const key = markKey(conversationId, messageId);
  try {
    if (!markedDeliveredKeys.has(key)) {
      await messagesApi.markMessagesDelivered(conversationId, [messageId]);
      markedDeliveredKeys.add(key);
    }
    await markConversationSeen(conversationId, [messageId]);
  } catch {
    markedDeliveredKeys.delete(key);
  }
}

export function noteDeliveredMessages(conversationId: string, messageIds: string[]): void {
  messageIds.forEach((id) => markedDeliveredKeys.add(markKey(conversationId, id)));
}

export function resetDeliveryMarkersForTests(): void {
  markedDeliveredKeys.clear();
  pendingDeliveredByConversation.clear();
  seenTimers.clear();
  seenInFlight.clear();
  if (deliveredFlushTimer) clearTimeout(deliveredFlushTimer);
  deliveredFlushTimer = null;
}
