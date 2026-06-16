import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { colors, radius, spacing } from '../../theme';

interface TaskCommentComposerProps {
  onSubmit: (content: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function TaskCommentComposer({ onSubmit, loading = false, disabled = false }: TaskCommentComposerProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed.length < 1) return;
    onSubmit(trimmed);
    setContent('');
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Add a comment or update…"
        placeholderTextColor={colors.muted}
        multiline
        editable={!disabled && !loading}
        style={styles.input}
      />
      <AppButton
        title="Post comment"
        loading={loading}
        disabled={disabled || content.trim().length < 1}
        onPress={handleSubmit}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  button: {
    alignSelf: 'flex-start',
  },
});
