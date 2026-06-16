import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton } from '../ui/AppIconButton';
import { colors, spacing } from '../../theme';

interface AuthScreenLayoutProps {
  children: ReactNode;
  onBack?: () => void;
}

export function AuthScreenLayout({ children, onBack }: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {onBack ? (
        <View style={styles.backRow}>
          <AppIconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Go back" />
        </View>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  backRow: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
  },
});
