import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import {
  registerDeviceToken,
  unregisterCurrentDeviceToken,
  type DeviceTokenRegisterPayload,
} from '../api/notifications.api';
import {
  getPushPermissionStatus,
  isExpoGo,
  requestPushPermission,
  type PushPermissionStatus,
} from './notification-permissions';
import { ensureNotificationChannels } from './notification-channels';
import { secureLog } from '../utils/secure-log';

export type PushSetupResult =
  | { supported: true; token: string }
  | { supported: false; reason: string };

let cachedPushToken: string | null = null;
let lastRegisteredToken: string | null = null;
let permissionStatus: PushPermissionStatus = 'undetermined';

export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

export function getPushPermissionState(): PushPermissionStatus {
  return permissionStatus;
}

function resolveEnvironment(): DeviceTokenRegisterPayload['environment'] {
  const env = Constants.expoConfig?.extra?.environment;
  if (env === 'production' || env === 'preview' || env === 'development') {
    return env;
  }
  return __DEV__ ? 'development' : 'production';
}

async function configureNotificationHandler(): Promise<void> {
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function setupPushNotifications(): Promise<PushSetupResult> {
  if (isExpoGo) {
    secureLog('PUSH_MOBILE', 'skipped native push setup in Expo Go');
    permissionStatus = 'unavailable';
    return { supported: false, reason: 'expo_go_not_supported' };
  }

  try {
    const Device = await import('expo-device');
    await configureNotificationHandler();

    if (!Device.isDevice) {
      permissionStatus = 'unavailable';
      secureLog('PUSH_MOBILE', 'skipped push setup on simulator/emulator');
      return { supported: false, reason: 'simulator' };
    }

    await ensureNotificationChannels();

    const permission = await requestPushPermission();
    permissionStatus = permission.status;
    if (permission.status !== 'granted') {
      secureLog('PUSH_MOBILE', 'permission not granted');
      return { supported: false, reason: 'permission_denied' };
    }

    const Notifications = await import('expo-notifications');
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenResult = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    cachedPushToken = tokenResult.data;
    return { supported: true, token: tokenResult.data };
  } catch {
    permissionStatus = 'unavailable';
    secureLog('PUSH_MOBILE', 'push setup unavailable in current environment');
    return { supported: false, reason: 'setup_failed' };
  }
}

function buildRegistrationPayload(token: string): DeviceTokenRegisterPayload {
  return {
    expo_push_token: token,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
    device_name: Constants.deviceName ?? undefined,
    device_id: Application.applicationId ?? undefined,
    app_version: Application.nativeApplicationVersion ?? undefined,
    build_version: Application.nativeBuildVersion ?? undefined,
    environment: resolveEnvironment(),
  };
}

/** Register push token with backend after login. Never crashes the app. */
export async function registerPushTokenIfAvailable(): Promise<void> {
  try {
    const currentPermission = await getPushPermissionStatus();
    permissionStatus = currentPermission.status;

    const result = await setupPushNotifications();
    if (!result.supported) return;

    if (lastRegisteredToken === result.token) {
      secureLog('PUSH_MOBILE', 'token_already_registered');
      return;
    }

    await registerDeviceToken(buildRegistrationPayload(result.token));
    lastRegisteredToken = result.token;
    cachedPushToken = result.token;
    secureLog('PUSH_MOBILE', `token_registered platform=${Platform.OS}`);
  } catch {
    secureLog('PUSH_MOBILE', 'push registration skipped');
  }
}

export async function unregisterPushToken(): Promise<void> {
  try {
    const token = cachedPushToken ?? lastRegisteredToken;
    if (!token) return;
    await unregisterCurrentDeviceToken(token);
    secureLog('PUSH_MOBILE', 'token_unregistered');
  } catch {
    secureLog('PUSH_MOBILE', 'token_unregister_skipped');
  } finally {
    cachedPushToken = null;
    lastRegisteredToken = null;
  }
}

export async function retryPushRegistration(): Promise<PushSetupResult> {
  lastRegisteredToken = null;
  await registerPushTokenIfAvailable();
  if (cachedPushToken) {
    return { supported: true, token: cachedPushToken };
  }
  return { supported: false, reason: 'registration_failed' };
}

export function clearPushRegistrationCache(): void {
  cachedPushToken = null;
  lastRegisteredToken = null;
  permissionStatus = 'undetermined';
}
