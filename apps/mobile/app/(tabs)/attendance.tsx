import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { AppHeader } from '../../src/components/layout/AppHeader';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { AttendanceStatusCard } from '../../src/components/attendance/AttendanceStatusCard';
import { AttendanceActionCard } from '../../src/components/attendance/AttendanceActionCard';
import { AttendanceHistoryList } from '../../src/components/attendance/AttendanceHistoryList';
import { CheckoutReasonModal } from '../../src/components/attendance/CheckoutReasonModal';
import {
  checkIn,
  checkOut,
  getActiveSession,
  getAttendanceHistory,
} from '../../src/api/attendance.api';
import { getErrorMessage } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/auth-store';
import { queryKeys } from '../../src/constants/query-keys';
import type { CheckOutPayload, CheckoutModalType } from '../../src/types/attendance';
import { getCheckoutModalType, getWorkSessionState, isActiveSession, isZeroDurationSession } from '../../src/utils/attendance';
import { colors, badgePalettes, spacing } from '../../src/constants/theme';
import { useNetworkStore } from '../../src/network/network-store';

export default function AttendanceScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const [checkoutModal, setCheckoutModal] = useState<CheckoutModalType>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const activeQuery = useQuery({
    queryKey: queryKeys.attendanceActive,
    queryFn: getActiveSession,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.attendanceHistory,
    queryFn: getAttendanceHistory,
  });

  const invalidateAttendance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceActive }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceHistory }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
  };

  const checkInMutation = useMutation({
    mutationFn: () => checkIn({ work_mode: 'office' }),
    onSuccess: async () => {
      setActionMessage('Checked in successfully.');
      await invalidateAttendance();
    },
    onError: (error) => {
      Alert.alert('Check-in failed', getErrorMessage(error, 'Unable to check in right now.'));
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (payload: CheckOutPayload) => checkOut(payload),
    onSuccess: async () => {
      setCheckoutModal(null);
      setActionMessage('Checked out successfully.');
      await invalidateAttendance();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Unable to check out right now.');
      Alert.alert('Check-out failed', message);

      const lower = message.toLowerCase();
      const session = activeQuery.data;
      if (!session) return;

      if (lower.includes('before your shift ends') || lower.includes('early checkout')) {
        setCheckoutModal('early');
      } else if (lower.includes('after shift end') || lower.includes('overtime')) {
        setCheckoutModal('overtime');
      }
    },
  });

  const activeSession = activeQuery.data ?? null;
  const todaySession = useMemo(() => {
    if (activeSession) return activeSession;
    const today = new Date().toDateString();
    return (
      historyQuery.data?.find((session) => {
        const sessionDate = new Date(session.check_in_at).toDateString();
        return sessionDate === today;
      }) ?? null
    );
  }, [activeSession, historyQuery.data]);

  const isActive = isActiveSession(activeSession);
  const workState = getWorkSessionState(todaySession);
  const isSessionClosed = workState === 'session_closed';
  const zeroDuration = isZeroDurationSession(todaySession);

  const canCheckIn = !activeQuery.isLoading && !isActive && !isSessionClosed;
  const canCheckOut = !activeQuery.isLoading && isActive;

  const handleCheckIn = () => {
    if (isOffline) {
      Alert.alert('Internet required', 'Attendance actions require internet connection.');
      return;
    }
    checkInMutation.mutate();
  };

  const handleCheckOutPress = () => {
    if (isOffline) {
      Alert.alert('Internet required', 'Attendance actions require internet connection.');
      return;
    }
    if (!activeSession) return;
    const modalType = getCheckoutModalType(activeSession);
    if (modalType) {
      setCheckoutModal(modalType);
      return;
    }
    checkOutMutation.mutate({});
  };

  const isActionLoading = checkInMutation.isPending || checkOutMutation.isPending;

  if ((activeQuery.isError || historyQuery.isError) && !activeQuery.data && !historyQuery.data?.length) {
    return (
      <Screen withTabBarInset>
        <AppHeader title="Attendance" subtitle="Track your workday" />
        <ErrorState
          message="Unable to load data. Please try again."
          onRetry={() => {
            void activeQuery.refetch();
            void historyQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen withTabBarInset>
      <AppHeader title="Attendance" subtitle="Track your workday" />

      {actionMessage ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{actionMessage}</Text>
        </View>
      ) : null}

      <AttendanceStatusCard
        session={todaySession}
        shiftTiming={user?.shift_timing ?? user?.shift_name}
        loading={activeQuery.isLoading}
      />

      <AttendanceActionCard
        canCheckIn={canCheckIn && !isOffline}
        canCheckOut={canCheckOut && !isOffline}
        isSessionClosed={isSessionClosed}
        zeroDuration={zeroDuration}
        loading={isActionLoading}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOutPress}
        offlineBlocked={isOffline}
        message={
          isOffline
            ? 'Attendance actions require internet connection.'
            : activeSession?.active_break
              ? 'End your active break before checking out.'
              : null
        }
      />

      <AttendanceHistoryList
        sessions={historyQuery.data ?? []}
        loading={historyQuery.isLoading}
      />

      <CheckoutReasonModal
        visible={checkoutModal !== null}
        type={checkoutModal}
        loading={checkOutMutation.isPending}
        onClose={() => setCheckoutModal(null)}
        onSubmitEarly={(reason) => checkOutMutation.mutate({ early_checkout_reason: reason })}
        onSubmitOvertime={(payload) => checkOutMutation.mutate(payload)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: badgePalettes.success.bg,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 14,
  },
});
