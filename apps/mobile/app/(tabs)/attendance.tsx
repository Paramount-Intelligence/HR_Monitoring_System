import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/ui/Screen';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { FilterChips } from '../../src/components/ui/FilterChips';
import { ActiveSessionCard } from '../../src/components/attendance/ActiveSessionCard';
import { AttendanceHistoryList } from '../../src/components/attendance/AttendanceHistoryList';
import { AttendanceDetailSheet } from '../../src/components/attendance/AttendanceDetailSheet';
import { CheckoutReasonModal } from '../../src/components/attendance/CheckoutReasonModal';
import {
  checkIn,
  checkOut,
  getActiveSession,
  getAttendanceHistory,
} from '../../src/api/attendance.api';
import { getUnreadNotificationCount } from '../../src/api/notifications.api';
import { getErrorMessage } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/auth-store';
import { queryKeys } from '../../src/constants/query-keys';
import type { AttendanceSession, CheckOutPayload, CheckoutModalType, WorkMode } from '../../src/types/attendance';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import {
  getCheckoutModalType,
  getWorkSessionState,
  getWorkedMinutes,
  isActiveSession,
  isZeroDurationSession,
} from '../../src/utils/attendance';
import { formatDuration } from '../../src/utils/format';
import { useNetworkStore } from '../../src/network/network-store';
import { OfflineQueueStatus } from '../../src/offline/OfflineQueueStatus';
import { colors, radius, shadows, spacing, typography } from '../../src/theme';

type HistoryFilter = 'all' | 'week' | 'month';

const HISTORY_FILTERS = [
  { id: 'all' as const, label: 'All' },
  { id: 'week' as const, label: 'This week' },
  { id: 'month' as const, label: 'This month' },
];

function filterHistory(sessions: AttendanceSession[], filter: HistoryFilter): AttendanceSession[] {
  if (filter === 'all') return sessions;
  const now = Date.now();
  const days = filter === 'week' ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return sessions.filter((session) => new Date(session.check_in_at).getTime() >= cutoff);
}

export default function AttendanceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const [checkoutModal, setCheckoutModal] = useState<CheckoutModalType>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [workMode, setWorkMode] = useState<WorkMode>('office');
  const tabBottomInset = useTabScreenBottomInset();

  const activeQuery = useQuery({
    queryKey: queryKeys.attendanceActive,
    queryFn: getActiveSession,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.attendanceHistory,
    queryFn: () => getAttendanceHistory(),
  });

  const alertsUnreadQuery = useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: getUnreadNotificationCount,
  });

  const invalidateAttendance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceActive }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceHistory }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    ]);
  };

  const checkInMutation = useMutation({
    mutationFn: (mode: WorkMode) => checkIn({ work_mode: mode }),
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

  const historySessions = useMemo(() => {
    const all = historyQuery.data ?? [];
    const withoutTodayActive =
      activeSession != null
        ? all.filter((s) => s.id !== activeSession.id)
        : all;
    return filterHistory(withoutTodayActive, historyFilter);
  }, [activeSession, historyFilter, historyQuery.data]);

  const isActive = isActiveSession(activeSession);
  const workState = getWorkSessionState(todaySession);
  const isSessionClosed = workState === 'session_closed';
  const zeroDuration = isZeroDurationSession(todaySession);
  const workedMinutes = getWorkedMinutes(todaySession);

  const canCheckIn = !activeQuery.isLoading && !isActive && !isSessionClosed;
  const canCheckOut = !activeQuery.isLoading && isActive;
  const isActionLoading = checkInMutation.isPending || checkOutMutation.isPending;

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const onRefresh = useCallback(async () => {
    if (isOffline) {
      Alert.alert('Offline', 'No internet connection.');
      return;
    }
    await Promise.all([activeQuery.refetch(), historyQuery.refetch()]);
  }, [activeQuery, historyQuery, isOffline]);

  const handleCheckIn = () => {
    if (isOffline) {
      Alert.alert('Internet required', 'Attendance actions require internet connection.');
      return;
    }
    checkInMutation.mutate(workMode);
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

  const openDetail = (session: AttendanceSession) => {
    setSelectedSession(session);
    setDetailVisible(true);
  };

  if ((activeQuery.isError || historyQuery.isError) && !activeQuery.data && !historyQuery.data?.length) {
    return (
      <Screen scroll={false} withTabBarInset edges={['top', 'left', 'right']} style={styles.screen}>
        <OfflineBanner />
        <BrandHeader
          title="Attendance"
          subtitle="Today's work session"
          showNotificationBell
          notificationCount={alertsUnreadQuery.data ?? 0}
          onNotificationPress={() => router.push('/alerts')}
        />
        <ErrorState
          title="Attendance unavailable"
          message="Unable to load attendance data. Please try again."
          onRetry={() => {
            void activeQuery.refetch();
            void historyQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} withTabBarInset edges={['top', 'left', 'right']} style={styles.screen}>
      <OfflineBanner />
      <BrandHeader
        title="Attendance"
        subtitle="Workforce tracking"
        showNotificationBell
        notificationCount={alertsUnreadQuery.data ?? 0}
        onNotificationPress={() => router.push('/alerts')}
      />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBottomInset }]}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching || historyQuery.isRefetching}
            onRefresh={() => void onRefresh()}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <OfflineQueueStatus />

        <View style={styles.dateRow}>
          <View>
            <Text style={[typography.labelSm, styles.todayLabel]}>TODAY</Text>
            <Text style={[typography.headlineLg, styles.todayDate]}>{todayLabel}</Text>
          </View>
        </View>

        <ActiveSessionCard
          session={todaySession}
          shiftTiming={user?.shift_timing ?? user?.shift_name}
          loading={activeQuery.isLoading}
          canCheckIn={canCheckIn && !isOffline}
          canCheckOut={canCheckOut && !isOffline}
          isSessionClosed={isSessionClosed}
          actionLoading={isActionLoading}
          offlineBlocked={isOffline}
          actionMessage={actionMessage}
          workMode={workMode}
          onWorkModeChange={setWorkMode}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOutPress}
        />

        <View style={styles.shortcutGrid}>
          <View style={styles.durationCard}>
            <View style={styles.durationIcon}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[typography.caption, styles.durationLabel]}>Total duration</Text>
            <Text style={[typography.headlineMd, styles.durationValue]}>
              {formatDuration(workedMinutes)}
            </Text>
          </View>
          <View style={styles.shortcutStack}>
            <ShortcutButton
              icon="create-outline"
              label="Correction"
              tint={colors.info}
              onPress={() => {
                if (todaySession) {
                  openDetail(todaySession);
                } else {
                  router.push('/attendance/correction' as never);
                }
              }}
            />
            <ShortcutButton
              icon="home-outline"
              label="Leave / WFH"
              tint={colors.secondary}
              onPress={() => router.push('/leave-request')}
            />
          </View>
        </View>

        <FilterChips
          options={HISTORY_FILTERS}
          selectedId={historyFilter}
          onSelect={(id) => setHistoryFilter(id as HistoryFilter)}
        />

        <AttendanceHistoryList
          sessions={historySessions}
          loading={historyQuery.isLoading}
          onSessionPress={openDetail}
        />
      </ScrollView>

      <AttendanceDetailSheet
        session={selectedSession}
        visible={detailVisible}
        shiftTiming={user?.shift_timing ?? user?.shift_name}
        onClose={() => {
          setDetailVisible(false);
          setSelectedSession(null);
        }}
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

function ShortcutButton({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.shortcutBtn, pressed && styles.shortcutPressed]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: `${tint}1A` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={[typography.labelSm, styles.shortcutLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    flexGrow: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  todayLabel: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  todayDate: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  shortcutGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  durationCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  durationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  durationLabel: {
    color: colors.textSecondary,
  },
  durationValue: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  shortcutStack: {
    flex: 1,
    gap: spacing.sm,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    ...shadows.card,
  },
  shortcutPressed: {
    opacity: 0.92,
  },
  shortcutIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    color: colors.text,
    textTransform: 'none',
    fontFamily: 'Inter_600SemiBold',
  },
});
