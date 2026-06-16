import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Message } from '../../types/messages';
import { shouldShowDateDivider, formatMessageDateDivider } from '../../utils/messages';
import { ChatBubble } from './ChatBubble';
import { CallSystemMessage, shouldRenderCallSystemMessage } from './CallSystemMessage';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSkeletonList } from '../ui/LoadingSkeleton';
import { colors, radius, spacing, typography } from '../../theme';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  onRetryMessage?: (message: Message) => void;
}

export function MessageList({
  messages,
  currentUserId,
  loading = false,
  refreshing = false,
  error = false,
  onRefresh,
  onRetry,
  onRetryMessage,
}: MessageListProps) {
  if (error && !messages.length) {
    return (
      <ErrorState
        title="Messages unavailable"
        message="Unable to load messages."
        onRetry={onRetry}
      />
    );
  }

  if (loading && !messages.length) {
    return <LoadingSkeletonList count={6} />;
  }

  if (!messages.length) {
    return (
      <EmptyState
        title="No messages yet"
        description="Start the conversation below."
        icon="chatbubble-outline"
        style={styles.empty}
      />
    );
  }

  const invertedData = [...messages].reverse();

  return (
    <FlatList
      inverted
      data={invertedData}
      keyExtractor={(item) => item.id || item.clientId || item.created_at}
      renderItem={({ item, index }) => {
        const previous = invertedData[index + 1];
        const showDivider = shouldShowDateDivider(item, previous);
        return (
          <View>
            {showDivider ? (
              <View style={styles.dividerWrap}>
                <Text style={[typography.labelSm, styles.divider]}>
                  {formatMessageDateDivider(item.created_at)}
                </Text>
              </View>
            ) : null}
            {shouldRenderCallSystemMessage(item) ? (
              <CallSystemMessage message={item} />
            ) : (
              <ChatBubble
                message={item}
                isOwn={item.sender_id === currentUserId}
                onRetry={onRetryMessage}
              />
            )}
          </View>
        );
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  empty: {
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  dividerWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  divider: {
    color: colors.textSecondary,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    textTransform: 'none',
    fontFamily: 'Inter_600SemiBold',
  },
});
