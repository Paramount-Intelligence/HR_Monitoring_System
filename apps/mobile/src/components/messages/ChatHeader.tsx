import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppIconButton } from '../ui/AppIconButton';
import { getInitialsFromName } from '../../utils/messages';
import { RoleBadge } from '../ui/RoleBadge';
import { colors, spacing, typography } from '../../theme';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  role?: string | null;
  canCall?: boolean;
  callsEnabled?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

export function ChatHeader({
  title,
  subtitle,
  role,
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
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitialsFromName(title)}</Text>
      </View>

      <View style={styles.textWrap}>
        <Text style={[typography.headlineMd, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {role ? (
          <View style={styles.roleWrap}>
            <RoleBadge role={role} />
          </View>
        ) : subtitle ? (
          <Text style={[typography.caption, styles.subtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {canCall ? (
        <View style={styles.actions}>
          <AppIconButton
            icon="call"
            accessibilityLabel="Start voice call"
            variant="default"
            disabled={!callsEnabled}
            onPress={onStartVoiceCall}
          />
          <AppIconButton
            icon="videocam"
            accessibilityLabel="Start video call"
            variant="default"
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
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
