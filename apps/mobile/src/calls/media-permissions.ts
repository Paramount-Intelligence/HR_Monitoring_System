import { Alert, Linking, Platform, PermissionsAndroid, type Permission } from 'react-native';
import type { CallType } from '../types/calls';

export interface MediaPermissionResult {
  granted: boolean;
  microphone: boolean;
  camera: boolean;
  message?: string;
}

async function requestAndroidPermissions(callType: CallType): Promise<MediaPermissionResult> {
  const permissions: Permission[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (callType === 'video') {
    permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const micGranted =
    results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
  const camGranted =
    callType !== 'video' ||
    results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

  if (!micGranted) {
    return {
      granted: false,
      microphone: false,
      camera: camGranted,
      message: 'Microphone permission is required for calls.',
    };
  }

  if (callType === 'video' && !camGranted) {
    return {
      granted: true,
      microphone: true,
      camera: false,
      message: 'Camera unavailable. Continue with audio?',
    };
  }

  return { granted: true, microphone: true, camera: callType === 'video' ? camGranted : false };
}

/** Request mic (voice) or mic+camera (video) before starting/accepting a call. */
export async function requestCallMediaPermissions(
  callType: CallType
): Promise<MediaPermissionResult> {
  if (Platform.OS === 'android') {
    return requestAndroidPermissions(callType);
  }

  // iOS: getUserMedia triggers system prompt in dev build.
  return { granted: true, microphone: true, camera: callType === 'video' };
}

export function showPermissionDeniedAlert(message: string): void {
  Alert.alert('Permission required', message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => void Linking.openSettings(),
    },
  ]);
}

/** Ask user to continue a video call with audio only when camera is unavailable. */
export function confirmAudioOnlyFallback(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Camera unavailable',
      'Camera unavailable. Continue with audio?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: false }
    );
  });
}
