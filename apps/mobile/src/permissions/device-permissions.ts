import { Linking, PermissionsAndroid, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  getPushPermissionStatus,
  requestPushPermission,
  type PushPermissionStatus,
} from '../notifications/notification-permissions';

export type DevicePermissionKind = 'notifications' | 'microphone' | 'camera' | 'mediaLibrary';

export type DevicePermissionDisplayStatus =
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'unavailable'
  | 'required_when_used';

export interface DevicePermissionRow {
  kind: DevicePermissionKind;
  label: string;
  status: DevicePermissionDisplayStatus;
  canRequest: boolean;
}

function mapPushStatus(status: PushPermissionStatus): DevicePermissionDisplayStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  if (status === 'unavailable') return 'unavailable';
  return 'undetermined';
}

function mapImagePickerStatus(
  granted: boolean,
  status: ImagePicker.PermissionStatus
): DevicePermissionDisplayStatus {
  if (granted) return 'granted';
  if (status === ImagePicker.PermissionStatus.DENIED) return 'denied';
  return 'required_when_used';
}

async function getMicrophoneStatus(): Promise<DevicePermissionDisplayStatus> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return granted ? 'granted' : 'required_when_used';
  }

  try {
    const { getRecordingPermissionsAsync } = await import('expo-audio');
    const result = await getRecordingPermissionsAsync();
    if (result.granted) return 'granted';
    if (result.status === 'denied') return 'denied';
    return 'required_when_used';
  } catch {
    return 'unavailable';
  }
}

async function getCameraStatus(): Promise<DevicePermissionDisplayStatus> {
  try {
    const result = await ImagePicker.getCameraPermissionsAsync();
    return mapImagePickerStatus(result.granted, result.status);
  } catch {
    return 'unavailable';
  }
}

async function getMediaLibraryStatus(): Promise<DevicePermissionDisplayStatus> {
  try {
    const result = await ImagePicker.getMediaLibraryPermissionsAsync();
    return mapImagePickerStatus(result.granted, result.status);
  } catch {
    return 'unavailable';
  }
}

export async function getDevicePermissionRows(): Promise<DevicePermissionRow[]> {
  const push = await getPushPermissionStatus();

  return [
    {
      kind: 'notifications',
      label: 'Notifications',
      status: mapPushStatus(push.status),
      canRequest: push.status !== 'granted' && push.status !== 'unavailable',
    },
    {
      kind: 'microphone',
      label: 'Microphone',
      status: await getMicrophoneStatus(),
      canRequest: Platform.OS !== 'web',
    },
    {
      kind: 'camera',
      label: 'Camera',
      status: await getCameraStatus(),
      canRequest: Platform.OS !== 'web',
    },
    {
      kind: 'mediaLibrary',
      label: 'Photo library',
      status: await getMediaLibraryStatus(),
      canRequest: Platform.OS !== 'web',
    },
  ];
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

export async function requestDevicePermission(kind: DevicePermissionKind): Promise<void> {
  switch (kind) {
    case 'notifications':
      await requestPushPermission();
      return;
    case 'microphone':
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        return;
      }
      try {
        const { requestRecordingPermissionsAsync } = await import('expo-audio');
        await requestRecordingPermissionsAsync();
      } catch {
        // noop
      }
      return;
    case 'camera':
      await ImagePicker.requestCameraPermissionsAsync();
      return;
    case 'mediaLibrary':
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      return;
  }
}

export function permissionStatusLabel(status: DevicePermissionDisplayStatus): string {
  switch (status) {
    case 'granted':
      return 'Granted';
    case 'denied':
      return 'Not granted';
    case 'undetermined':
      return 'Not requested';
    case 'unavailable':
      return 'Unavailable';
    case 'required_when_used':
      return 'Required when used';
  }
}

export function permissionStatusVariant(
  status: DevicePermissionDisplayStatus
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'granted') return 'success';
  if (status === 'denied') return 'danger';
  if (status === 'required_when_used' || status === 'undetermined') return 'warning';
  return 'neutral';
}
