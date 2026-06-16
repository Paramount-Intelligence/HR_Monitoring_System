import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchUsers } from '../../api/users.api';
import { getErrorMessage } from '../../api/client';
import { UserSearchResultCard } from './UserSearchResultCard';
import { BottomSheet } from '../ui/BottomSheet';
import { SearchInput } from '../ui/SearchInput';
import { AppButton } from '../ui/AppButton';
import type { User } from '../../types/user';
import { formatRole } from '../../utils/format';
import { colors, spacing, typography } from '../../theme';

interface NewConversationModalProps {
  visible: boolean;
  currentUserId?: string;
  isOffline?: boolean;
  onClose: () => void;
  onMessage: (user: User) => void;
  onVoiceCall: (user: User) => void;
  onVideoCall: (user: User) => void;
}

export function NewConversationModal({
  visible,
  currentUserId,
  isOffline = false,
  onClose,
  onMessage,
  onVoiceCall,
  onVideoCall,
}: NewConversationModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setError(null);
      setSelectedUser(null);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      void searchUsers(trimmed)
        .then((users) => {
          setResults(users.filter((u) => u.id !== currentUserId));
        })
        .catch((err) => {
          setError(getErrorMessage(err, 'Unable to search people.'));
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [query, visible, currentUserId]);

  const emptyLabel = useMemo(() => {
    if (query.trim().length < 2) return 'Type at least 2 characters to search.';
    if (loading) return null;
    if (error) return error;
    return 'No people found.';
  }, [error, loading, query]);

  const handleAction = (action: 'message' | 'voice' | 'video') => {
    if (!selectedUser) return;
    const user = selectedUser;
    setSelectedUser(null);
    onClose();
    if (action === 'message') onMessage(user);
    else if (action === 'voice') onVoiceCall(user);
    else onVideoCall(user);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <View style={styles.header}>
            <Text style={[typography.headlineMd, styles.title]}>New Message</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <SearchInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people…"
            autoFocus
        />

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <UserSearchResultCard user={item} onPress={() => setSelectedUser(item)} />
              )}
              ListEmptyComponent={
                emptyLabel ? <Text style={styles.empty}>{emptyLabel}</Text> : null
              }
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </Modal>

      <BottomSheet visible={Boolean(selectedUser)} onClose={() => setSelectedUser(null)}>
        {selectedUser ? (
          <View style={styles.sheetContent}>
            <Text style={[typography.headlineMd, styles.sheetTitle]}>{selectedUser.full_name}</Text>
            <Text style={[typography.bodyMd, styles.sheetSubtitle]}>
              {formatRole(selectedUser.role)}
              {selectedUser.department_name || selectedUser.department
                ? ` · ${selectedUser.department_name ?? selectedUser.department}`
                : ''}
            </Text>

            <AppButton
              title="Message"
              onPress={() => handleAction('message')}
              disabled={isOffline}
              style={styles.sheetAction}
            />
            <AppButton
              title="Voice Call"
              variant="secondary"
              onPress={() => handleAction('voice')}
              disabled={isOffline}
              style={styles.sheetAction}
            />
            <AppButton
              title="Video Call"
              variant="secondary"
              onPress={() => handleAction('video')}
              disabled={isOffline}
              style={styles.sheetAction}
            />

            <Pressable accessibilityRole="button" onPress={() => setSelectedUser(null)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  close: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  loader: {
    marginTop: spacing.lg,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    fontSize: 14,
  },
  sheetContent: {
    gap: spacing.sm,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  sheetSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sheetAction: {
    marginTop: spacing.xs,
  },
  cancel: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
