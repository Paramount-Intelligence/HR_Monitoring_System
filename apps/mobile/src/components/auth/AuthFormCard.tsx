import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface AuthFormCardProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthFormCard({ children, footer }: AuthFormCardProps) {
  return (
    <View style={styles.card}>
      {children}
      {footer ?? (
        <View style={styles.footer}>
          <Text style={[typography.caption, styles.footerText]}>© Paramount Intelligence</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}80`,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.card,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: `${colors.outlineVariant}80`,
    alignItems: 'center',
  },
  footerText: {
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_600SemiBold',
  },
});
