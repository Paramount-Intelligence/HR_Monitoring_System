import { Platform } from 'react-native';

/**
 * iOS call recording requires TestFlight validation with active WebRTC.
 * Set to true only after confirming expo-audio recording works during live calls on iOS.
 */
export const IOS_CALL_RECORDING_VALIDATED = false;

export function isIosCallRecordingBlocked(): boolean {
  return Platform.OS === 'ios' && !IOS_CALL_RECORDING_VALIDATED;
}

export function getRecordingUnsupportedReason(): string | null {
  if (Platform.OS === 'web') return 'Recording is not available on web.';
  if (isIosCallRecordingBlocked()) {
    return 'Call recording on iOS is pending TestFlight validation.';
  }
  return null;
}
