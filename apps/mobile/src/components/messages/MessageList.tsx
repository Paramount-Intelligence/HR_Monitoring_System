import {
  ActivityIndicator,
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
import { colors, radii, spacing } from '../../constants/theme';

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
      <ErrorState message="Unable to load messages." onRetry={onRetry} />
    );
  }

  if (loading && !messages.length) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!messages.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No messages yet.</Text>
        <Text style={styles.emptyBody}>Start the conversation below.</Text>
      </View>
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
                <Text style={styles.divider}>{formatMessageDateDivider(item.created_at)}</Text>
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.mutedText,
  },
  dividerWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  divider: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedText,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
});
