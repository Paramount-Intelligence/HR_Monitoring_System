import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { AppHeader } from '../../src/components/layout/AppHeader';
import { AppIconButton } from '../../src/components/ui/AppIconButton';
import { ConnectionStatusBar } from '../../src/components/messages/ConnectionStatusBar';
import { ConversationList } from '../../src/components/messages/ConversationList';
import { NewConversationModal } from '../../src/components/messages/NewConversationModal';
import { getConversations, getOrCreateDirectConversation } from '../../src/api/conversations.api';
import { useAuthStore } from '../../src/auth/auth-store';
import { useCallStore } from '../../src/calls/call-store';
import { queryKeys } from '../../src/constants/query-keys';
import { useRealtimeStore } from '../../src/realtime/realtime-store';
import { spacing } from '../../src/constants/theme';
import type { User } from '../../src/types/user';
import { Alert } from 'react-native';
import { getFriendlyErrorMessage } from '../../src/api/client';

export default function MessagesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const connectionStatus = useRealtimeStore((s) => s.status);
  const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);
  const [newMessageVisible, setNewMessageVisible] = useState(false);

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => getConversations({ limit: 50 }),
  });

  const openConversation = (conversationId: string) => {
    router.push({
      pathname: '/chat/[conversationId]',
      params: { conversationId },
    });
  };

  const handleUserAction = async (
    selected: User,
    action: 'message' | 'voice' | 'video'
  ) => {
    try {
      const conversation = await getOrCreateDirectConversation(selected.id);
      await conversationsQuery.refetch();

      if (action === 'message') {
        openConversation(conversation.id);
        return;
      }

      openConversation(conversation.id);
      await startOutgoingCall(
        conversation.id,
        action === 'voice' ? 'voice' : 'video',
        selected.full_name ?? 'Contact',
        selected.id
      );
    } catch (error) {
      Alert.alert('Unable to start', getFriendlyErrorMessage(error, 'Please try again.'));
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.content} withTabBarInset>
      <AppHeader
        title="Messages"
        subtitle="Team conversations"
        rightAction={
          <AppIconButton
            icon="create-outline"
            accessibilityLabel="New Message"
            variant="dark"
            onPress={() => setNewMessageVisible(true)}
          />
        }
      />
      <ConnectionStatusBar status={connectionStatus} />

      <View style={styles.listWrap}>
        <ConversationList
          conversations={conversationsQuery.data ?? []}
          currentUserId={user?.id}
          loading={conversationsQuery.isLoading}
          refreshing={conversationsQuery.isRefetching}
          error={conversationsQuery.isError}
          onRefresh={() => void conversationsQuery.refetch()}
          onRetry={() => void conversationsQuery.refetch()}
          onSelect={(conversationId) => openConversation(conversationId)}
        />
      </View>

      <NewConversationModal
        visible={newMessageVisible}
        currentUserId={user?.id}
        onClose={() => setNewMessageVisible(false)}
        onMessage={(selected) => void handleUserAction(selected, 'message')}
        onVoiceCall={(selected) => void handleUserAction(selected, 'voice')}
        onVideoCall={(selected) => void handleUserAction(selected, 'video')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  listWrap: {
    flex: 1,
  },
});
