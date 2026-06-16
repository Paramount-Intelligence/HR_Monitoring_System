import { StyleSheet, Text, View } from 'react-native';
import { PimsLogo } from '../brand/PimsLogo';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface AuthBrandingHeaderProps {
  title?: string;
  tagline?: string;
  description?: string;
}

export function AuthBrandingHeader({
  title = 'Welcome to PIMS',
  tagline = 'Paramount Intelligence Monitoring System',
  description = 'Secure access to your workforce monitoring and operations platform.',
}: AuthBrandingHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.logoFrame}>
        <PimsLogo size={64} />
      </View>
      <Text style={[typography.headlineLg, styles.title]}>{title}</Text>
      <Text style={[typography.labelSm, styles.tagline]}>{tagline}</Text>
      {description ? (
        <Text style={[typography.bodyMd, styles.description]}>{description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoFrame: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  tagline: {
    color: colors.primaryContainer,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
    fontFamily: 'Inter_600SemiBold',
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
    lineHeight: 20,
  },
});
