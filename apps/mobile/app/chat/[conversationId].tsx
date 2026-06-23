import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversation, markConversationRead } from '../../src/api/conversations.api';
import { getMessages, sendMessage, sendVoiceNote, getVoiceNoteSendErrorMessage } from '../../src/api/messages.api';
import { getFriendlyErrorMessage } from '../../src/api/client';
import { ChatComposer } from '../../src/components/messages/ChatComposer';
import { ChatHeader } from '../../src/components/messages/ChatHeader';
import { ConnectionStatusBar } from '../../src/components/messages/ConnectionStatusBar';
import { MessageList } from '../../src/components/messages/MessageList';
import { useAuthStore } from '../../src/auth/auth-store';
import { useCallStore } from '../../src/calls/call-store';
import {
  canStartCallInConversation,
  getDirectChatParticipant,
} from '../../src/calls/call-utils';
import { queryKeys } from '../../src/constants/query-keys';
import { useNetworkStore } from '../../src/network/network-store';
import {
  createClientMessageId,
  queueSendMessage,
  shouldQueueOnError,
} from '../../src/offline/offline-sync';
import { useRealtimeStore } from '../../src/realtime/realtime-store';
import type { Conversation, Message } from '../../src/types/messages';
import type { CallType } from '../../src/types/calls';
import { dedupeMessages, buildVoiceNoteFilename, getConversationDisplayName, getDirectParticipant, sortMessagesChronologically } from '../../src/utils/messages';
import { colors } from '../../src/theme';

export default function ChatScreen() {
  const { conversationId, callId } = useLocalSearchParams<{
    conversationId: string;
    callId?: string;
  }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const connectionStatus = useRealtimeStore((s) => s.status);
  const setActiveConversationId = useRealtimeStore((s) => s.setActiveConversationId);
  const callPhase = useCallStore((s) => s.phase);
  const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);
  const hydrateIncomingCallFromPush = useCallStore((s) => s.hydrateIncomingCallFromPush);

  useEffect(() => {
    if (!callId || !user?.id) return;
    void hydrateIncomingCallFromPush(
      {
        call_id: callId,
        conversation_id: conversationId,
      },
      user.id
    );
  }, [callId, conversationId, hydrateIncomingCallFromPush, user?.id]);

  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
    return () => setActiveConversationId(null);
  }, [conversationId, setActiveConversationId]);

  const conversationQuery = useQuery({
    queryKey: queryKeys.conversation(conversationId ?? ''),
    queryFn: () => getConversation(conversationId!),
    enabled: Boolean(conversationId),
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.messages(conversationId ?? ''),
    queryFn: () => getMessages(conversationId!, { limit: 50 }),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (!conversationId || isOffline) return;
    void markConversationRead(conversationId).then(() => {
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations, (prev) =>
        prev?.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    });
  }, [conversationId, queryClient, isOffline]);

  const [voiceUploading, setVoiceUploading] = useState(false);

  const addOptimisticVoiceMessage = (
    clientId: string,
    localUri: string,
    durationSeconds: number,
    clientStatus: Message['clientStatus']
  ) => {
    if (!conversationId || !user) return;
    queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) => {
      const previous = prev ?? [];
      const optimistic: Message = {
        id: clientId,
        clientId,
        clientStatus,
        clientVoiceLocalUri: localUri,
        clientVoiceDuration: durationSeconds,
        conversation_id: conversationId,
        sender_id: user.id,
        sender: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url ?? user.profile_picture_url,
        },
        body: '',
        message_type: 'text',
        parent_message_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        mentions: [],
        reactions: [],
        attachments: [
          {
            id: clientId,
            file_name: buildVoiceNoteFilename(durationSeconds),
            original_file_name: buildVoiceNoteFilename(durationSeconds),
            mime_type: 'audio/mp4',
            file_size: 0,
            download_url: localUri,
            created_at: new Date().toISOString(),
          },
        ],
      };
      return dedupeMessages([...previous, optimistic]);
    });
  };

  const addOptimisticMessage = (body: string, clientId: string, clientStatus: Message['clientStatus']) => {
    if (!conversationId || !user) return;
    queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) => {
      const previous = prev ?? [];
      const optimistic: Message = {
        id: clientId,
        clientId,
        clientStatus,
        conversation_id: conversationId,
        sender_id: user.id,
        sender: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url ?? user.profile_picture_url,
        },
        body,
        message_type: 'text',
        parent_message_id: null,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        mentions: [],
        reactions: [],
      };
      return dedupeMessages([...previous, optimistic]);
    });
  };

  const sendMutation = useMutation({
    mutationFn: (payload: { body: string; clientId: string }) =>
      sendMessage(conversationId!, { body: payload.body }),
    onMutate: async ({ body, clientId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(conversationId!) });
      addOptimisticMessage(body, clientId, 'sending');
      return { clientId };
    },
    onSuccess: (savedMessage, _payload, context) => {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages(conversationId!),
        (prev) =>
          dedupeMessages(
            (prev ?? [])
              .filter((m) => m.clientId !== context?.clientId)
              .concat({ ...savedMessage, clientStatus: 'sent' })
          )
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
    onError: (error, payload, context) => {
      if (shouldQueueOnError(error) && context?.clientId) {
        void queueSendMessage(conversationId!, payload.body, context.clientId).then(() => {
          queryClient.setQueryData<Message[]>(
            queryKeys.messages(conversationId!),
            (prev) =>
              (prev ?? []).map((message) =>
                message.clientId === context.clientId
                  ? { ...message, clientStatus: 'queued' as const }
                  : message
              )
          );
        });
        return;
      }
      queryClient.setQueryData<Message[]>(
        queryKeys.messages(conversationId!),
        (prev) =>
          (prev ?? []).map((message) =>
            message.clientId === context?.clientId
              ? { ...message, clientStatus: 'failed' as const }
              : message
          )
      );
    },
  });

  const handleSend = async (text: string) => {
    if (!conversationId) return;
    const clientId = createClientMessageId();

    if (isOffline) {
      addOptimisticMessage(text, clientId, 'queued');
      await queueSendMessage(conversationId, text, clientId);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      sendMutation.mutate(
        { body: text, clientId },
        {
          onSuccess: () => resolve(),
          onError: (error) => {
            if (shouldQueueOnError(error)) resolve();
            else reject(error);
          },
        }
      );
    });
  };

  const handleSendVoiceNote = async (localUri: string, durationSeconds: number) => {
    if (!conversationId) return;
    if (isOffline) {
      Alert.alert('Offline', 'Voice notes require an internet connection.');
      throw new Error('offline');
    }

    const clientId = createClientMessageId();
    setVoiceUploading(true);
    addOptimisticVoiceMessage(clientId, localUri, durationSeconds, 'sending');

    try {
      const saved = await sendVoiceNote(conversationId, localUri, durationSeconds);
      queryClient.setQueryData<Message[]>(
        queryKeys.messages(conversationId),
        (prev) =>
          dedupeMessages(
            (prev ?? [])
              .filter((m) => m.clientId !== clientId)
              .concat({ ...saved, clientStatus: 'sent' })
          )
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    } catch (error) {
      queryClient.setQueryData<Message[]>(
        queryKeys.messages(conversationId),
        (prev) =>
          (prev ?? []).map((message) =>
            message.clientId === clientId
              ? { ...message, clientStatus: 'failed' as const }
              : message
          )
      );
      Alert.alert('Voice note failed', getVoiceNoteSendErrorMessage(error));
      throw new Error('voice_send_failed');
    } finally {
      setVoiceUploading(false);
    }
  };

  const handleRetryMessage = async (message: Message) => {
    if (!conversationId) return;

    if (message.clientVoiceLocalUri && message.clientVoiceDuration) {
      queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
        (prev ?? []).filter((m) => m.clientId !== message.clientId)
      );
      await handleSendVoiceNote(message.clientVoiceLocalUri, message.clientVoiceDuration);
      return;
    }

    if (!message.body || !message.clientId) return;

    queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
      (prev ?? []).map((m) =>
        m.clientId === message.clientId ? { ...m, clientStatus: 'sending' as const } : m
      )
    );

    if (isOffline) {
      await queueSendMessage(conversationId, message.body, message.clientId);
      queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
        (prev ?? []).map((m) =>
          m.clientId === message.clientId ? { ...m, clientStatus: 'queued' as const } : m
        )
      );
      return;
    }

    try {
      const saved = await sendMessage(conversationId, { body: message.body });
      queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
        dedupeMessages(
          (prev ?? [])
            .filter((m) => m.clientId !== message.clientId)
            .concat({ ...saved, clientStatus: 'sent' })
        )
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    } catch (error) {
      if (shouldQueueOnError(error)) {
        await queueSendMessage(conversationId, message.body, message.clientId);
        queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
          (prev ?? []).map((m) =>
            m.clientId === message.clientId ? { ...m, clientStatus: 'queued' as const } : m
          )
        );
      } else {
        queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (prev) =>
          (prev ?? []).map((m) =>
            m.clientId === message.clientId ? { ...m, clientStatus: 'failed' as const } : m
          )
        );
      }
    }
  };

  const conversation = conversationQuery.data;
  const messages = sortMessagesChronologically(messagesQuery.data ?? []);
  const title = conversation
    ? getConversationDisplayName(conversation, user?.id)
    : 'Chat';

  const canCall = canStartCallInConversation(conversation, user?.id);
  const directParticipant = getDirectChatParticipant(conversation, user?.id);
  const participantUser = conversation ? getDirectParticipant(conversation, user?.id) : null;
  const callsEnabled =
    !isOffline && connectionStatus === 'connected' && callPhase === 'idle';

  const handleStartCall = async (callType: CallType) => {
    if (!conversationId || !directParticipant) return;
    if (isOffline || connectionStatus !== 'connected') {
      Alert.alert('Call unavailable', 'Realtime connection is required for calls.');
      return;
    }
    try {
      await startOutgoingCall(
        conversationId,
        callType,
        directParticipant.name,
        directParticipant.userId
      );
    } catch (error) {
      Alert.alert('Call failed', getFriendlyErrorMessage(error, 'Unable to start call.'));
    }
  };

  const handleRefresh = () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    void conversationQuery.refetch();
    void messagesQuery.refetch();
  };

  const showMessagesError = messagesQuery.isError && !messages.length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ChatHeader
        title={title}
        subtitle={
          isOffline
            ? 'Offline'
            : connectionStatus === 'connected'
              ? 'Connected'
              : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                ? 'Reconnecting…'
                : undefined
        }
        role={participantUser?.role}
        canCall={canCall}
        callsEnabled={callsEnabled}
        onStartVoiceCall={() => void handleStartCall('voice')}
        onStartVideoCall={() => void handleStartCall('video')}
      />
      <ConnectionStatusBar status={connectionStatus} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 24}
      >
        <View style={styles.flex}>
          <MessageList
            messages={messages}
            currentUserId={user?.id}
            loading={messagesQuery.isLoading}
            refreshing={messagesQuery.isRefetching}
            error={showMessagesError}
            onRefresh={handleRefresh}
            onRetry={() => void messagesQuery.refetch()}
            onRetryMessage={(message) => void handleRetryMessage(message)}
          />
        </View>

        <ChatComposer
          conversationName={title}
          sending={sendMutation.isPending}
          voiceUploading={voiceUploading}
          disabled={false}
          offline={isOffline}
          onSend={handleSend}
          onSendVoiceNote={handleSendVoiceNote}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
});
