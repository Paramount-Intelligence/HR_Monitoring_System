import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchUsers } from '../../api/users.api';
import { getErrorMessage } from '../../api/client';
import { UserActionSheet, UserSearchResultCard } from './UserSearchResultCard';
import type { User } from '../../types/user';
import { colors, radii, spacing } from '../../constants/theme';

interface NewConversationModalProps {
  visible: boolean;
  currentUserId?: string;
  onClose: () => void;
  onMessage: (user: User) => void;
  onVoiceCall: (user: User) => void;
  onVideoCall: (user: User) => void;
}

export function NewConversationModal({
  visible,
  currentUserId,
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

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.md) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>New Message</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search people…"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
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

      <UserActionSheet
        visible={Boolean(selectedUser)}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onMessage={() => {
          if (!selectedUser) return;
          const user = selectedUser;
          setSelectedUser(null);
          onClose();
          onMessage(user);
        }}
        onVoiceCall={() => {
          if (!selectedUser) return;
          const user = selectedUser;
          setSelectedUser(null);
          onClose();
          onVoiceCall(user);
        }}
        onVideoCall={() => {
          if (!selectedUser) return;
          const user = selectedUser;
          setSelectedUser(null);
          onClose();
          onVideoCall(user);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  close: { color: colors.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  loader: { marginTop: spacing.lg },
  list: { paddingBottom: spacing.xl },
  empty: {
    textAlign: 'center',
    color: colors.mutedText,
    marginTop: spacing.lg,
    fontSize: 14,
  },
});
