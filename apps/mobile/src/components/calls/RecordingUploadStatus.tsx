import { StyleSheet, Text, View } from 'react-native';
import type { RecordingStatus } from '../../types/calls';
import { colors } from '../../constants/theme';

interface RecordingUploadStatusProps {
  status: RecordingStatus;
  errorMessage?: string | null;
}

export function RecordingUploadStatus({ status, errorMessage }: RecordingUploadStatusProps) {
  if (status === 'idle' || status === 'preparing' || status === 'recording' || status === 'stopping') {
    return null;
  }

  let message: string | null = null;
  if (status === 'uploading') {
    message = 'Saving recording…';
  } else if (status === 'uploaded') {
    message = 'Recording saved';
  } else if (status === 'failed') {
    message = errorMessage ?? 'Recording upload failed';
  } else if (status === 'unsupported') {
    message = 'Recording is not available on this device build.';
  }

  if (!message) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, status === 'failed' && styles.error]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  text: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(226, 232, 240, 0.88)',
  },
  error: {
    color: colors.call.statusDanger,
  },
});
