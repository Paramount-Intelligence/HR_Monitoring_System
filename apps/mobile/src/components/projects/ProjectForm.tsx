import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { ProjectCreatePayload, ProjectPriority } from '../../types/project';
import { FilterChips } from '../ui/FilterChips';
import { AppButton } from '../ui/AppButton';
import { colors, radius, spacing, typography } from '../../theme';

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

interface ProjectFormProps {
  title: string;
  description: string;
  priority: ProjectPriority;
  dueDate: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: ProjectPriority) => void;
  onDueDateChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  errorMessage?: string | null;
}

export function ProjectForm({
  title,
  description,
  priority,
  dueDate,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onDueDateChange,
  onSubmit,
  submitLabel = 'Save project',
  loading = false,
  disabled = false,
  errorMessage,
}: ProjectFormProps) {
  const valid =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !loading &&
    !disabled;

  return (
    <View style={styles.form}>
      <Field label="Project name" value={title} onChangeText={onTitleChange} placeholder="Project title" />
      <Field
        label="Description"
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Goals and success criteria"
        multiline
      />
      <Text style={[typography.labelSm, styles.sectionLabel]}>PRIORITY</Text>
      <FilterChips
        options={PRIORITY_OPTIONS}
        selectedId={priority}
        onSelect={(id) => onPriorityChange(id as ProjectPriority)}
      />
      <Field
        label="Due date (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={onDueDateChange}
        placeholder="2026-12-31"
      />
      {errorMessage ? (
        <Text style={[typography.caption, styles.error]}>{errorMessage}</Text>
      ) : null}
      <AppButton
        title={submitLabel}
        loading={loading}
        disabled={!valid}
        onPress={onSubmit}
        style={styles.submit}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[typography.labelSm, styles.sectionLabel]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  field: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    color: colors.danger,
  },
  submit: {
    marginTop: spacing.md,
  },
});

export type { ProjectCreatePayload };
