import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import type { ProjectViewModel } from '../../types/project';
import { formatDate } from '../../utils/format';
import { ProjectHealthBadge, getHealthAccentColor } from './ProjectHealthBadge';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import { ProjectProgressSummary } from './ProjectProgressSummary';
import { ProjectTeamAvatars } from './ProjectTeamAvatars';
import { PriorityBadge } from '../ui/PriorityBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface ProjectCardProps {
  project: ProjectViewModel;
  onPress: () => void;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  const accent = getHealthAccentColor(project.health);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      style={styles.wrap}
    >
      <View style={styles.card}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={[typography.titleMd, styles.title]} numberOfLines={1} ellipsizeMode="tail">
              {project.name}
            </Text>
            <ProjectHealthBadge health={project.health} />
          </View>

          <View style={styles.badges}>
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </View>

          {project.description ? (
            <Text style={[typography.bodyMd, styles.description]} numberOfLines={2}>
              {project.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {project.dueDate ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={[typography.caption, styles.metaText]}>
                  Due {formatDate(project.dueDate)}
                </Text>
              </View>
            ) : null}
            <ProjectTeamAvatars
              ownerName={project.ownerName}
              managerName={project.managerName}
              count={project.teamMembersCount}
            />
          </View>

          <ProjectProgressSummary progress={project.progress} health={project.health} />

          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[typography.caption, styles.footerText]}>
                {project.taskSummary.completed}/{project.taskSummary.total || '—'} completed
              </Text>
            </View>
            {project.taskSummary.overdue > 0 ? (
              <View style={styles.footerItem}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[typography.caption, styles.footerDanger]}>
                  {project.taskSummary.overdue} overdue
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minWidth: 0,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    color: colors.textSecondary,
  },
  footerDanger: {
    color: colors.danger,
    fontFamily: 'Inter_600SemiBold',
  },
});
