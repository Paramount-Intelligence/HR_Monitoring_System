import { StyleSheet, View, type ViewStyle } from 'react-native';
import { isWebRtcNativeAvailable } from '../../calls/media-stream-utils';
import { colors } from '../../constants/theme';

interface RTCVideoViewWrapperProps {
  streamUrl: string | null;
  mirror?: boolean;
  style?: ViewStyle;
  objectFit?: 'cover' | 'contain';
}

export function RTCVideoViewWrapper({
  streamUrl,
  mirror = false,
  style,
  objectFit = 'cover',
}: RTCVideoViewWrapperProps) {
  if (!streamUrl || !isWebRtcNativeAvailable()) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RTCView } = require('react-native-webrtc');
    return (
      <RTCView
        streamURL={streamUrl}
        mirror={mirror}
        objectFit={objectFit}
        style={[styles.video, style]}
      />
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  video: {
    flex: 1,
    backgroundColor: colors.call.videoBg,
  },
});
