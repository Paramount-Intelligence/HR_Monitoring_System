import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PimsLogo } from '../brand/PimsLogo';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface AuthBootstrapSplashProps {
  message?: string;
}

/** In-app bootstrap splash shown while fonts and auth hydrate. */
export function AuthBootstrapSplash({
  message = 'Initializing system…',
}: AuthBootstrapSplashProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoFrame}>
        <PimsLogo size={72} />
      </View>
      <Text style={[typography.headlineLg, styles.title]}>PIMS</Text>
      <Text style={[typography.labelSm, styles.tagline]}>
        Paramount Intelligence Monitoring System
      </Text>
      <ActivityIndicator size="large" color={colors.primaryContainer} style={styles.spinner} />
      <Text style={[typography.caption, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  logoFrame: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
    fontFamily: 'Inter_600SemiBold',
  },
  spinner: {
    marginTop: spacing.xl,
  },
  message: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
