import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ProjectApiRecord } from '../../types/project';
import type { TaskPriority } from '../../types/task';
import type { User } from '../../types/user';
import { FilterChips } from '../ui/FilterChips';
import { AppButton } from '../ui/AppButton';
import { AssigneeOptionCard } from './AssigneeOptionCard';
import { colors, radius, spacing, typography } from '../../theme';

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
];

interface TaskFormProps {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  assigneeId: string;
  projects: ProjectApiRecord[];
  assigneeQuery: string;
  assigneeResults: User[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onDueDateChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onAssigneeQueryChange: (value: string) => void;
  onAssigneeSelect: (user: User) => void;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  editMode?: boolean;
}

export function TaskForm({
  title,
  description,
  priority,
  dueDate,
  projectId,
  assigneeId,
  projects,
  assigneeQuery,
  assigneeResults,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onDueDateChange,
  onProjectChange,
  onAssigneeQueryChange,
  onAssigneeSelect,
  onSubmit,
  submitLabel = 'Save task',
  loading = false,
  disabled = false,
  editMode = false,
}: TaskFormProps) {
  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = assigneeResults.find((u) => u.id === assigneeId);

  const missing: string[] = [];
  if (title.trim().length < 3) missing.push('title (3+ characters)');
  if (!editMode && !projectId) missing.push('project');
  if (!editMode && !assigneeId) missing.push('assignee');
  if (!editMode && dueDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
    missing.push('valid due date (YYYY-MM-DD)');
  }

  const valid =
    title.trim().length >= 3 &&
    (editMode || (projectId && assigneeId)) &&
    !loading &&
    !disabled &&
    (editMode || !dueDate.trim() || /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()));

  return (
    <View style={styles.form}>
      <Field label="Task title" value={title} onChangeText={onTitleChange} placeholder="Task title" />
      <Field
        label="Description"
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="What needs to be done?"
        multiline
      />

      {!editMode ? (
        <>
          <Text style={[typography.labelSm, styles.sectionLabel]}>PROJECT</Text>
          <FilterChips
            options={projects.map((p) => ({ id: p.id, label: p.title.length > 18 ? `${p.title.slice(0, 18)}…` : p.title }))}
            selectedId={projectId || projects[0]?.id || ''}
            onSelect={onProjectChange}
          />
          {selectedProject ? (
            <Text style={[typography.caption, styles.hint]}>{selectedProject.title}</Text>
          ) : null}

          <Text style={[typography.labelSm, styles.sectionLabel]}>ASSIGNEE SEARCH</Text>
          <TextInput
            value={assigneeQuery}
            onChangeText={onAssigneeQueryChange}
            placeholder="Search by name"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {assigneeResults.slice(0, 5).map((user) => (
            <AssigneeOptionCard
              key={user.id}
              user={user}
              selected={assigneeId === user.id}
              onPress={() => {
                onAssigneeSelect(user);
                Keyboard.dismiss();
              }}
            />
          ))}
          {selectedAssignee ? (
            <View style={styles.selectedCard}>
              <Text style={[typography.caption, styles.hint]}>Selected assignee</Text>
              <AssigneeOptionCard user={selectedAssignee} selected onPress={() => undefined} />
            </View>
          ) : null}
          {missing.length > 0 ? (
            <Text style={[typography.caption, styles.validation]}>
              Required: {missing.join(', ')}
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={[typography.labelSm, styles.sectionLabel]}>PRIORITY</Text>
      <FilterChips
        options={PRIORITY_OPTIONS}
        selectedId={priority}
        onSelect={(id) => onPriorityChange(id as TaskPriority)}
      />

      <Field label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={onDueDateChange} placeholder="2026-12-31" />

      <AppButton title={submitLabel} loading={loading} disabled={!valid} onPress={onSubmit} style={styles.submit} />
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
    marginTop: spacing.sm,
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
  hint: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectedCard: {
    marginTop: spacing.xs,
  },
  validation: {
    color: colors.warning,
    marginTop: spacing.xs,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
