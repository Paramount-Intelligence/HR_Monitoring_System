import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { CallParticipantAvatar } from './CallParticipantAvatar';

interface CameraOffPlaceholderProps {
  name: string;
  label?: string;
  compact?: boolean;
}

export function CameraOffPlaceholder({
  name,
  label = 'Camera off',
  compact = false,
}: CameraOffPlaceholderProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {!compact ? (
        <CallParticipantAvatar name={name} size="lg" ringColor="rgba(255,255,255,0.15)" />
      ) : (
        <View style={styles.compactAvatar}>
          <Text style={styles.compactInitial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.labelRow}>
        <Ionicons name="videocam-off" size={14} color="rgba(255,255,255,0.7)" />
        <Text style={styles.label}>{label}</Text>
      </View>
      {!compact ? <Text style={styles.hint}>Camera will appear here</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.call.controlBar,
  },
  compact: {
    flex: 0,
    padding: 8,
  },
  compactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.call.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactInitial: {
    color: colors.call.textOnDark,
    fontWeight: '800',
    fontSize: 18,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  label: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
});
