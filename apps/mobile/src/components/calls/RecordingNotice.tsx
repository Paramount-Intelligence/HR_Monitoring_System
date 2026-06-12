import { StyleSheet, Text, View } from 'react-native';

interface RecordingNoticeProps {
  visible?: boolean;
  showLimitation?: boolean;
}

export function RecordingNotice({ visible = true, showLimitation = false }: RecordingNoticeProps) {
  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>This call is being recorded for internal review.</Text>
      {showLimitation ? (
        <Text style={styles.limitation}>
          Mobile recordings capture this device microphone only.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  text: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(226, 232, 240, 0.88)',
    lineHeight: 18,
  },
  limitation: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(148, 163, 184, 0.95)',
    lineHeight: 16,
  },
});
