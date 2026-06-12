import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppIconButton } from '../ui/AppIconButton';
import { getInitialsFromName } from '../../utils/messages';
import { colors, spacing } from '../../constants/theme';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  canCall?: boolean;
  callsEnabled?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

export function ChatHeader({
  title,
  subtitle,
  canCall = false,
  callsEnabled = false,
  onStartVoiceCall,
  onStartVideoCall,
}: ChatHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backLabel}>‹</Text>
      </Pressable>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitialsFromName(title)}</Text>
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {canCall ? (
        <View style={styles.actions}>
          <AppIconButton
            icon="call"
            accessibilityLabel="Start voice call"
            variant="dark"
            disabled={!callsEnabled}
            onPress={onStartVoiceCall}
          />
          <AppIconButton
            icon="videocam"
            accessibilityLabel="Start video call"
            variant="dark"
            disabled={!callsEnabled}
            onPress={onStartVideoCall}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  backLabel: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
