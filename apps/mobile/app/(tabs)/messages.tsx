import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/ui/Screen';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { SearchInput } from '../../src/components/ui/SearchInput';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { ConnectionStatusBar } from '../../src/components/messages/ConnectionStatusBar';
import { ConversationList } from '../../src/components/messages/ConversationList';
import { NewConversationModal } from '../../src/components/messages/NewConversationModal';
import { getConversations, getOrCreateDirectConversation } from '../../src/api/conversations.api';
import { getUnreadNotificationCount } from '../../src/api/notifications.api';
import { useAuthStore } from '../../src/auth/auth-store';
import { useCallStore } from '../../src/calls/call-store';
import { queryKeys } from '../../src/constants/query-keys';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import { useRealtimeStore } from '../../src/realtime/realtime-store';
import { useNetworkStore } from '../../src/network/network-store';
import { matchesConversationSearch } from '../../src/utils/messages';
import { colors, spacing } from '../../src/theme';
import type { User } from '../../src/types/user';
import { getFriendlyErrorMessage, isForbiddenError } from '../../src/api/client';

export default function MessagesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const connectionStatus = useRealtimeStore((s) => s.status);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);
  const [newMessageVisible, setNewMessageVisible] = useState(false);
  const [search, setSearch] = useState('');
  const tabBottomInset = useTabScreenBottomInset();

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => getConversations({ limit: 50 }),
    throwOnError: false,
    retry: (count, error) => !isForbiddenError(error) && count < 1,
  });

  const alertsUnreadQuery = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: getUnreadNotificationCount,
  });

  const filteredConversations = useMemo(() => {
    const list = conversationsQuery.data ?? [];
    return list.filter((conv) => matchesConversationSearch(conv, search, user?.id));
  }, [conversationsQuery.data, search, user?.id]);

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
    if (isOffline) {
      Alert.alert('Offline', 'Connect to the internet to start a conversation.');
      return;
    }

    try {
      const conversation = await getOrCreateDirectConversation(selected.id);
      await conversationsQuery.refetch();

      if (action === 'message') {
        openConversation(conversation.id);
        return;
      }

      if (connectionStatus !== 'connected') {
        Alert.alert('Call unavailable', 'Realtime connection is required for calls.');
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

  const onRefresh = () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    void conversationsQuery.refetch();
  };

  const messagingDenied = conversationsQuery.isError && isForbiddenError(conversationsQuery.error);

  return (
    <Screen scroll={false} withTabBarInset edges={['top', 'left', 'right']} style={styles.screen}>
      <OfflineBanner />
      <BrandHeader
        title="Messages"
        subtitle="Team conversations"
        showNotificationBell
        notificationCount={alertsUnreadQuery.data ?? 0}
        onNotificationPress={() => router.push('/alerts')}
        right={
          <Pressable
            onPress={() => setNewMessageVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="New Message"
            style={styles.newBtn}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </Pressable>
        }
      />
      <ConnectionStatusBar status={connectionStatus} />

      <View style={[styles.body, { paddingBottom: tabBottomInset }]}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations…"
          containerStyle={styles.search}
        />
        {messagingDenied ? (
          <ErrorState
            title="Messaging unavailable"
            message="Messaging is not available for your account."
            onRetry={() => void conversationsQuery.refetch()}
          />
        ) : (
          <ConversationList
            conversations={filteredConversations}
            currentUserId={user?.id}
            loading={conversationsQuery.isLoading}
            refreshing={conversationsQuery.isRefetching}
            error={conversationsQuery.isError && !messagingDenied}
            onRefresh={onRefresh}
            onRetry={() => void conversationsQuery.refetch()}
            onSelect={(conversationId) => openConversation(conversationId)}
            onNewMessage={() => setNewMessageVisible(true)}
          />
        )}
      </View>

      <NewConversationModal
        visible={newMessageVisible}
        currentUserId={user?.id}
        isOffline={isOffline}
        onClose={() => setNewMessageVisible(false)}
        onMessage={(selected) => void handleUserAction(selected, 'message')}
        onVoiceCall={(selected) => void handleUserAction(selected, 'voice')}
        onVideoCall={(selected) => void handleUserAction(selected, 'video')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  search: {
    marginBottom: spacing.sm,
  },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
