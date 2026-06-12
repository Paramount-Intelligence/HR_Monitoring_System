import Constants from 'expo-constants';

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export interface PushPermissionResult {
  status: PushPermissionStatus;
  canAskAgain: boolean;
}

/** Running inside Expo Go — remote push is not available (SDK 53+). */
export const isExpoGo = Constants.appOwnership === 'expo';

export async function getPushPermissionStatus(): Promise<PushPermissionResult> {
  if (isExpoGo) {
    return { status: 'unavailable', canAskAgain: false };
  }

  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) {
      return { status: 'unavailable', canAskAgain: false };
    }

    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    return {
      status: current.granted ? 'granted' : current.status === 'denied' ? 'denied' : 'undetermined',
      canAskAgain: current.canAskAgain ?? true,
    };
  } catch {
    return { status: 'unavailable', canAskAgain: false };
  }
}

export async function requestPushPermission(): Promise<PushPermissionResult> {
  if (isExpoGo) {
    return { status: 'unavailable', canAskAgain: false };
  }

  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) {
      return { status: 'unavailable', canAskAgain: false };
    }

    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return { status: 'granted', canAskAgain: current.canAskAgain ?? true };
    }

    const requested = await Notifications.requestPermissionsAsync();
    return {
      status: requested.granted
        ? 'granted'
        : requested.status === 'denied'
          ? 'denied'
          : 'undetermined',
      canAskAgain: requested.canAskAgain ?? true,
    };
  } catch {
    return { status: 'unavailable', canAskAgain: false };
  }
}
