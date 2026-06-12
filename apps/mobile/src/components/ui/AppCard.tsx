import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, shadows, spacing } from '../../constants/theme';

interface AppCardProps extends ViewProps {
  padded?: boolean;
}

export function AppCard({ children, style, padded = true, ...props }: AppCardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
