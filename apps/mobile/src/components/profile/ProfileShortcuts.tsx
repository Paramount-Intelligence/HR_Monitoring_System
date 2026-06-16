import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { QuickActionCard } from '../dashboard/QuickActionCard';
import { spacing, typography, colors } from '../../theme';

interface ProfileShortcutsProps {
  unreadMessages?: number;
}

export function ProfileShortcuts({ unreadMessages = 0 }: ProfileShortcutsProps) {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={[typography.titleMd, styles.sectionTitle]}>Quick access</Text>
      <QuickActionCard
        index={0}
        title="Attendance"
        subtitle="Check in, history, and leave"
        onPress={() => router.push('/(tabs)/attendance')}
      />
      <QuickActionCard
        index={1}
        title="My Projects"
        subtitle="Assigned project work"
        onPress={() => router.push('/(tabs)/projects')}
      />
      <QuickActionCard
        index={2}
        title="My Tasks"
        subtitle="Your task queue"
        onPress={() => router.push('/(tabs)/tasks')}
      />
      <QuickActionCard
        index={3}
        title="Messages"
        subtitle={
          unreadMessages > 0
            ? `${unreadMessages} unread conversation${unreadMessages === 1 ? '' : 's'}`
            : 'Team conversations'
        }
        onPress={() => router.push('/(tabs)/messages')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.sm,
  },
});
