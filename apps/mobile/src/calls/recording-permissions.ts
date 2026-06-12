import { Platform } from 'react-native';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

export async function ensureRecordingPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const current = await getRecordingPermissionsAsync();
  if (current.granted) return true;

  const requested = await requestRecordingPermissionsAsync();
  return requested.granted;
}
