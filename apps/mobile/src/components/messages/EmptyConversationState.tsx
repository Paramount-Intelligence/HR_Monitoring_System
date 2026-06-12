import { AppEmptyState } from '../ui/AppEmptyState';

export function EmptyConversationState() {
  return (
    <AppEmptyState
      title="No messages yet."
      description="When someone messages you, conversations will appear here."
      icon="chatbubbles-outline"
    />
  );
}
