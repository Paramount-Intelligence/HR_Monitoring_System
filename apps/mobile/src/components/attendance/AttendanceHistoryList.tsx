import { StyleSheet, Text, View } from 'react-native';
import type { AttendanceSession } from '../../types/attendance';
import { AttendanceHistoryCard } from './AttendanceHistoryCard';
import { LoadingSkeletonList } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface AttendanceHistoryListProps {
  sessions: AttendanceSession[];
  loading?: boolean;
  onSessionPress?: (session: AttendanceSession) => void;
}

export function AttendanceHistoryList({
  sessions,
  loading = false,
  onSessionPress,
}: AttendanceHistoryListProps) {
  if (loading && !sessions.length) {
    return (
      <View style={styles.section}>
        <Text style={[typography.headlineMd, styles.sectionTitle]}>Recent history</Text>
        <LoadingSkeletonList count={3} />
      </View>
    );
  }

  if (!sessions.length) {
    return (
      <View style={styles.section}>
        <Text style={[typography.headlineMd, styles.sectionTitle]}>Recent history</Text>
        <EmptyState
          title="No attendance records"
          description="Your check-in history will appear here once you start tracking attendance."
          icon="calendar-outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[typography.headlineMd, styles.sectionTitle]}>Recent history</Text>
      <View style={styles.listCard}>
        {sessions.map((session, index) => (
          <AttendanceHistoryCard
            key={session.id}
            session={session}
            onPress={onSessionPress ? () => onSessionPress(session) : undefined}
            isLast={index === sessions.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.md,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
});
