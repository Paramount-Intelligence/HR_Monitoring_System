import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../../types/user';
import { formatRole, getInitials } from '../../utils/format';
import { colors, radii, spacing } from '../../constants/theme';

interface UserSearchResultCardProps {
  user: User;
  onPress: () => void;
}

export function UserSearchResultCard({ user, onPress }: UserSearchResultCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {user.full_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatRole(user.role)}
          {user.designation ? ` · ${user.designation}` : ''}
        </Text>
        {user.department_name || user.department ? (
          <Text style={styles.dept} numberOfLines={1}>
            {user.department_name ?? user.department}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
    </Pressable>
  );
}

interface UserActionSheetProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onMessage: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
}

export function UserActionSheet({
  visible,
  user,
  onClose,
  onMessage,
  onVoiceCall,
  onVideoCall,
}: UserActionSheetProps) {
  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{user.full_name}</Text>
          <Text style={styles.sheetSubtitle}>{formatRole(user.role)}</Text>

          <ActionRow icon="chatbubble-outline" label="Message" onPress={onMessage} />
          <ActionRow icon="call-outline" label="Voice Call" onPress={onVoiceCall} />
          <ActionRow icon="videocam-outline" label="Video Call" onPress={onVideoCall} />

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionRow}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.92 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800' },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  dept: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSubtitle: { fontSize: 14, color: colors.mutedText, marginBottom: spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
  cancel: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.mutedText, fontWeight: '600' },
});
