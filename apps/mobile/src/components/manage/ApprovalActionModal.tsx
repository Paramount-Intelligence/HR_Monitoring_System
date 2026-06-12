import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { colors, radii, spacing } from '../../constants/theme';

interface ApprovalActionModalProps {
  visible: boolean;
  mode: 'approve' | 'reject';
  title: string;
  description?: string;
  comment: string;
  onChangeComment: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ApprovalActionModal({
  visible,
  mode,
  title,
  description,
  comment,
  onChangeComment,
  onConfirm,
  onCancel,
  loading = false,
}: ApprovalActionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <Text style={styles.label}>Comment (optional)</Text>
          <TextInput
            value={comment}
            onChangeText={onChangeComment}
            placeholder="Add a note for the requester"
            placeholderTextColor={colors.mutedText}
            multiline
            style={styles.input}
          />
          <View style={styles.actions}>
            <AppButton title="Cancel" variant="secondary" onPress={onCancel} disabled={loading} />
            <AppButton
              title={mode === 'approve' ? 'Approve' : 'Reject'}
              variant={mode === 'approve' ? 'primary' : 'danger'}
              onPress={onConfirm}
              loading={loading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
  },
  label: {
    marginTop: spacing.md,
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
  },
  input: {
    marginTop: spacing.sm,
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    backgroundColor: colors.background,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
