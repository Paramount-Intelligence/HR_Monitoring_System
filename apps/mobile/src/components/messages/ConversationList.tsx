import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { Conversation } from '../../types/messages';
import { ConversationCard } from './ConversationCard';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { LoadingSkeletonList } from '../ui/LoadingSkeleton';
import { colors, spacing } from '../../theme';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId?: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  onSelect: (conversationId: string) => void;
  onNewMessage?: () => void;
}

export function ConversationList({
  conversations,
  currentUserId,
  loading = false,
  refreshing = false,
  error = false,
  onRefresh,
  onRetry,
  onSelect,
  onNewMessage,
}: ConversationListProps) {
  if (error) {
    return (
      <ErrorState
        title="Messages unavailable"
        message="Unable to load conversations. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (loading && !conversations.length) {
    return <LoadingSkeletonList count={5} />;
  }

  if (!conversations.length) {
    return (
      <EmptyState
        title="No conversations yet"
        description="Start a new message to connect with your team."
        icon="chatbubbles-outline"
        actionLabel={onNewMessage ? 'New message' : undefined}
        onAction={onNewMessage}
      />
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ConversationCard
          conversation={item}
          currentUserId={currentUserId}
          onPress={() => onSelect(item.id)}
        />
      )}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.lg,
  },
});
