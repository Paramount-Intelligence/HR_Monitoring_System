import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { Conversation } from '../../types/messages';
import { ConversationCard } from './ConversationCard';
import { EmptyConversationState } from './EmptyConversationState';
import { AppLoadingState } from '../ui/AppLoadingState';
import { ErrorState } from '../ui/ErrorState';
import { colors, spacing } from '../../constants/theme';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId?: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  onSelect: (conversationId: string) => void;
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
}: ConversationListProps) {
  if (error) {
    return <ErrorState message="Unable to load data. Please try again." onRetry={onRetry} />;
  }

  if (loading && !conversations.length) {
    return <AppLoadingState message="Loading conversations…" />;
  }

  if (!conversations.length) {
    return <EmptyConversationState />;
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
