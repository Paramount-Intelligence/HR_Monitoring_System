import { useEffect, useState } from 'react';

import { Alert, StyleSheet } from 'react-native';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Screen } from '../../src/components/ui/Screen';

import { AppHeader } from '../../src/components/layout/AppHeader';

import { AppButton } from '../../src/components/ui/AppButton';

import { ErrorState } from '../../src/components/ui/ErrorState';

import { ProfileHeader } from '../../src/components/profile/ProfileHeader';

import { ProfileInfoCard } from '../../src/components/profile/ProfileInfoCard';

import { ProfilePicturePicker } from '../../src/components/profile/ProfilePicturePicker';

import { ProfileEditModal } from '../../src/components/profile/ProfileEditModal';

import { NotificationSettingsCard } from '../../src/components/profile/NotificationSettingsCard';
import { BuildDiagnosticsCard } from '../../src/components/profile/BuildDiagnosticsCard';

import { getProfile, updateProfile, uploadProfilePicture, deleteProfilePicture } from '../../src/api/profile.api';

import { getErrorMessage } from '../../src/api/client';

import { useAuthStore } from '../../src/auth/auth-store';

import { queryKeys } from '../../src/constants/query-keys';

import type { ProfilePictureAsset } from '../../src/types/profile';

import { spacing } from '../../src/constants/theme';
import { useNetworkStore } from '../../src/network/network-store';
import { APP_ENV } from '../../src/constants/env';

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



export default function ProfileScreen() {

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



  const confirmLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const hasPicture = Boolean(
    currentUser?.profile_picture_url || currentUser?.avatar_url
  ) && !imageFailed;



  if (profileQuery.isError && !currentUser) {

    return (

      <Screen withTabBarInset>

        <AppHeader title="Profile" subtitle="Your account" />

        <ErrorState

          message="Unable to connect. Please check your internet connection."

          onRetry={() => void profileQuery.refetch()}

        />

      </Screen>

    );

  }



  return (

    <Screen withTabBarInset>

      <AppHeader title="Profile" subtitle="Your account" />



      <ProfileHeader

        user={currentUser}

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

        title="Edit Profile"

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



      <ProfileInfoCard user={currentUser} />

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

  editButton: {

    marginBottom: spacing.md,

  },

  logout: {

    marginTop: spacing.sm,

    marginBottom: spacing.lg,

  },

});


