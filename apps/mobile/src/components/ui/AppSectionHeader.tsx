import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';

interface AppSectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function AppSectionHeader({ title, subtitle }: AppSectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.mutedText,
  },
});
