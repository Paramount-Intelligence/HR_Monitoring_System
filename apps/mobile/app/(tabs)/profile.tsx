import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { AppButton } from '../../src/components/ui/AppButton';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { ProfileHeroCard } from '../../src/components/profile/ProfileHeroCard';
import { ProfilePicturePicker } from '../../src/components/profile/ProfilePicturePicker';
import { ProfileEditModal } from '../../src/components/profile/ProfileEditModal';
import { ProfileInfoCard } from '../../src/components/profile/ProfileInfoCard';
import { ProfileShortcuts } from '../../src/components/profile/ProfileShortcuts';
import { ProfileAlertsCard } from '../../src/components/profile/ProfileAlertsCard';
import { ProfileAdminToolsCard } from '../../src/components/profile/ProfileAdminToolsCard';
import { NotificationSettingsCard } from '../../src/components/profile/NotificationSettingsCard';
import { DevicePermissionsCard } from '../../src/components/profile/DevicePermissionsCard';
import { BuildDiagnosticsCard } from '../../src/components/profile/BuildDiagnosticsCard';
import { getProfile, updateProfile, uploadProfilePicture, deleteProfilePicture } from '../../src/api/profile.api';
import { getUnreadCount } from '../../src/api/messages.api';
import { getErrorMessage } from '../../src/api/client';
import { useAuthStore } from '../../src/auth/auth-store';
import { queryKeys } from '../../src/constants/query-keys';
import { useTabScreenBottomInset } from '../../src/hooks/useTabScreenBottomInset';
import type { ProfilePictureAsset } from '../../src/types/profile';
import { useNetworkStore } from '../../src/network/network-store';
import { APP_ENV } from '../../src/constants/env';
import { useUnreadNotificationCount, useOpenAlertsCount } from '../../src/hooks/useAlerts';
import {
  getCachedPushToken,
  getPushPermissionState,
  retryPushRegistration,
  unregisterPushToken,
} from '../../src/notifications/notifications-service';
import {
  getPushPermissionStatus,
  type PushPermissionStatus,
} from '../../src/notifications/notification-permissions';
import { colors, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isOffline = useNetworkStore((s) => s.isOffline);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const isLoggingOut = useAuthStore((s) => s.isLoading);

  const [imageFailed, setImageFailed] = useState(false);
  const [cacheBust, setCacheBust] = useState<number | undefined>();
  const [editVisible, setEditVisible] = useState(false);
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>(
    getPushPermissionState()
  );
  const [pushRegistered, setPushRegistered] = useState(Boolean(getCachedPushToken()));
  const [pushLoading, setPushLoading] = useState(false);
  const tabBottomInset = useTabScreenBottomInset();

  useEffect(() => {
    void getPushPermissionStatus().then((result) => {
      setPushPermission(result.status);
      setPushRegistered(Boolean(getCachedPushToken()));
    });
  }, []);

  const profileQuery = useQuery({
    queryKey: queryKeys.user,
    queryFn: getProfile,
    initialData: user ?? undefined,
  });

  const messagesUnreadQuery = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: getUnreadCount,
    staleTime: 30_000,
  });

  const unreadNotificationsQuery = useUnreadNotificationCount();
  const openAlertsQuery = useOpenAlertsCount();

  const uploadMutation = useMutation({
    mutationFn: (asset: ProfilePictureAsset) => uploadProfilePicture(asset),
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      setImageFailed(false);
      setCacheBust(Date.now());
      await queryClient.invalidateQueries({ queryKey: queryKeys.user });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      Alert.alert('Success', 'Profile picture uploaded successfully.');
    },
    onError: (error) => {
      Alert.alert(
        'Upload failed',
        getErrorMessage(error, 'Unable to upload profile picture. Please try again.')
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: deleteProfilePicture,
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      setImageFailed(false);
      setCacheBust(Date.now());
      await queryClient.invalidateQueries({ queryKey: queryKeys.user });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      Alert.alert('Success', 'Profile picture removed.');
    },
    onError: (error) => {
      Alert.alert(
        'Remove failed',
        getErrorMessage(error, 'Unable to remove profile picture. Please try again.')
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (updatedUser) => {
      setUser(updatedUser);
      setEditVisible(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.user });
      Alert.alert('Success', 'Profile updated successfully.');
    },
    onError: (error) => {
      Alert.alert('Update failed', getErrorMessage(error, 'Unable to update profile.'));
    },
  });

  const currentUser = profileQuery.data ?? user;
  const isActive = currentUser?.status === 'active';
  const unreadMessages = messagesUnreadQuery.data?.unread_messages ?? 0;
  const bellCount =
    (unreadNotificationsQuery.data ?? 0) + (openAlertsQuery.data ?? 0);

  const confirmLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const hasPicture =
    Boolean(currentUser?.profile_picture_url || currentUser?.avatar_url) && !imageFailed;

  if (profileQuery.isError && !currentUser) {
    return (
      <Screen scroll={false} withTabBarInset edges={['top', 'left', 'right']}>
        <OfflineBanner />
        <BrandHeader
          title="Profile"
          subtitle="Your account"
          showNotificationBell
          notificationCount={bellCount}
          onNotificationPress={() => router.push('/alerts')}
        />
        <ErrorState
          message="Unable to load your profile. Check your connection and try again."
          onRetry={() => void profileQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} withTabBarInset edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <BrandHeader
        title="Profile"
        subtitle="Account and settings"
        showNotificationBell
        notificationCount={bellCount}
        onNotificationPress={() => router.push('/alerts')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBottomInset },
        ]}
      >
        {profileQuery.isLoading && !currentUser ? (
          <LoadingSkeletonList count={3} />
        ) : (
          <>
            <ProfileHeroCard
              user={currentUser ?? null}
              cacheBust={cacheBust}
              imageFailed={imageFailed}
              onImageError={() => setImageFailed(true)}
              isActive={isActive}
            />

            <ProfilePicturePicker
              loading={uploadMutation.isPending}
              removing={removeMutation.isPending}
              hasPicture={hasPicture}
              onPick={(asset) => {
                if (isOffline) {
                  Alert.alert('Offline', 'Profile photo upload requires internet connection.');
                  return;
                }
                uploadMutation.mutate(asset);
              }}
              onRemove={() => {
                if (isOffline) {
                  Alert.alert('Offline', 'This action requires internet connection.');
                  return;
                }
                removeMutation.mutate();
              }}
            />

            <AppButton
              title="Edit profile"
              variant="secondary"
              onPress={() => {
                if (isOffline) {
                  Alert.alert('Offline', 'Profile edits require internet connection.');
                  return;
                }
                setEditVisible(true);
              }}
              style={styles.editButton}
            />

            <ProfileShortcuts unreadMessages={unreadMessages} />
            <ProfileAlertsCard />
            <ProfileAdminToolsCard role={currentUser?.role} />
            <ProfileInfoCard user={currentUser ?? null} />

            <NotificationSettingsCard
              permissionStatus={pushPermission}
              isRegistered={pushRegistered}
              loading={pushLoading}
              onEnable={() => {
                setPushLoading(true);
                void retryPushRegistration()
                  .then((result) => {
                    setPushPermission(getPushPermissionState());
                    setPushRegistered(result.supported);
                    if (!result.supported) {
                      Alert.alert(
                        'Notifications unavailable',
                        'Push notifications require a development build and permission.'
                      );
                    }
                  })
                  .finally(() => setPushLoading(false));
              }}
              onDisable={() => {
                setPushLoading(true);
                void unregisterPushToken()
                  .then(() => {
                    setPushRegistered(false);
                    setPushPermission(getPushPermissionState());
                  })
                  .finally(() => setPushLoading(false));
              }}
            />

            <DevicePermissionsCard />

            {APP_ENV !== 'production' ? (
              <BuildDiagnosticsCard userRole={currentUser?.role} />
            ) : null}

            <AppButton
              title="Logout"
              variant="danger"
              loading={isLoggingOut}
              onPress={confirmLogout}
              style={styles.logout}
            />
          </>
        )}
      </ScrollView>

      <ProfileEditModal
        visible={editVisible}
        user={currentUser}
        loading={updateMutation.isPending}
        onClose={() => setEditVisible(false)}
        onSave={(payload) => updateMutation.mutate(payload)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  editButton: {
    marginBottom: spacing.md,
  },
  logout: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
