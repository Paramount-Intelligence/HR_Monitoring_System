import { EmptyState } from '../ui/EmptyState';

export function EmptyConversationState() {
  return (
    <EmptyState
      title="No conversations yet"
      description="When someone messages you, conversations will appear here."
      icon="chatbubbles-outline"
    />
  );
}
