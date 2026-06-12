import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../ui/AppButton';

import { colors, radii, spacing } from '../../constants/theme';



interface AttendanceActionCardProps {

  canCheckIn: boolean;

  canCheckOut: boolean;

  isSessionClosed: boolean;

  zeroDuration?: boolean;

  loading?: boolean;

  onCheckIn: () => void;

  onCheckOut: () => void;

  message?: string | null;

  offlineBlocked?: boolean;

}



export function AttendanceActionCard({

  canCheckIn,

  canCheckOut,

  isSessionClosed,

  zeroDuration = false,

  loading = false,

  onCheckIn,

  onCheckOut,

  message,

  offlineBlocked = false,

}: AttendanceActionCardProps) {

  return (

    <View style={styles.card}>

      <Text style={styles.title}>Actions</Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}



      {canCheckIn ? (

        <AppButton title="Check In" loading={loading} onPress={onCheckIn} />

      ) : null}



      {canCheckOut ? (
        <AppButton
          title="Check Out"
          variant="danger"
          loading={loading}
          onPress={onCheckOut}
          style={canCheckIn ? styles.spaced : undefined}
        />
      ) : null}



      {isSessionClosed ? (

        <View style={styles.closedBox}>

          <Text style={styles.closedText}>Session Closed</Text>

          <Text style={styles.closedHint}>

            {zeroDuration
              ? 'Your session was closed, but worked duration is 0m.'
              : 'Your work session for today is already closed.'}

          </Text>

        </View>

      ) : null}



      {!canCheckIn && !canCheckOut && !isSessionClosed && !offlineBlocked ? (

        <Text style={styles.hint}>Attendance status is loading…</Text>

      ) : null}

    </View>

  );

}



const styles = StyleSheet.create({

  card: {

    backgroundColor: colors.card,

    borderRadius: radii.lg,

    borderWidth: 1,

    borderColor: colors.border,

    padding: spacing.lg,

    marginBottom: spacing.md,

  },

  title: {

    fontSize: 17,

    fontWeight: '700',

    color: colors.text,

    marginBottom: spacing.sm,

  },

  message: {

    fontSize: 14,

    color: colors.mutedText,

    marginBottom: spacing.md,

    lineHeight: 20,

  },

  spaced: {

    marginTop: spacing.sm,

  },

  closedBox: {

    backgroundColor: colors.overlay,

    borderRadius: radii.md,

    padding: spacing.md,

    alignItems: 'center',

  },

  closedText: {

    fontSize: 16,

    fontWeight: '700',

    color: colors.text,

  },

  closedHint: {

    fontSize: 13,

    color: colors.mutedText,

    marginTop: spacing.xs,

    textAlign: 'center',

    lineHeight: 18,

  },

  hint: {

    fontSize: 14,

    color: colors.mutedText,

  },

});


