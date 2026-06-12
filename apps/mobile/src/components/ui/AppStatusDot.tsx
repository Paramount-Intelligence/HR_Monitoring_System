import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';

export type StatusDotTone = 'online' | 'offline' | 'recording' | 'calling' | 'warning';

const toneColors: Record<StatusDotTone, string> = {
  online: colors.success,
  offline: colors.mutedText,
  recording: colors.danger,
  calling: colors.info,
  warning: colors.warning,
};

interface AppStatusDotProps {
  tone?: StatusDotTone;
  size?: number;
  style?: ViewStyle;
}

export function AppStatusDot({ tone = 'offline', size = 8, style }: AppStatusDotProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: toneColors[tone],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 1,
    borderColor: colors.white,
  },
});
