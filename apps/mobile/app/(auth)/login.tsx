import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { AppInput } from '../../src/components/ui/AppInput';
import { AppButton } from '../../src/components/ui/AppButton';
import { useAuthStore } from '../../src/auth/auth-store';
import { PimsLogo } from '../../src/components/brand/PimsLogo';
import { APP_TAGLINE } from '../../src/constants/env';
import { FadeSlideIn } from '../../src/animations/FadeSlideIn';
import { colors, radii, spacing } from '../../src/constants/theme';

export default function LoginScreen() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    clearError();
    setFieldError(null);

    if (!email.trim()) {
      setFieldError('Email is required.');
      return;
    }
    if (!password) {
      setFieldError('Password is required.');
      return;
    }

    try {
      await login(email, password);
    } catch {
      // Error stored in auth store
    }
  };

  const displayError = fieldError ?? error;

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <FadeSlideIn delay={0} translateY={12}>
          <View style={styles.hero}>
            <PimsLogo size={72} showWordmark variant="dark" />
            <Text style={styles.title}>{APP_TAGLINE}</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>
        </FadeSlideIn>

        <FadeSlideIn delay={80} translateY={18}>
          <View style={styles.card}>
            <AppInput
              label="Work email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="you@company.com"
            />
            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              placeholder="Enter your password"
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
              style={styles.togglePassword}
            >
              <Text style={styles.togglePasswordText}>
                {showPassword ? 'Hide password' : 'Show password'}
              </Text>
            </Pressable>

            {displayError ? (
              <FadeSlideIn translateY={6}>
                <Text style={styles.error}>{displayError}</Text>
              </FadeSlideIn>
            ) : null}

            <AppButton
              title="Sign in"
              loading={isLoading}
              onPress={() => void handleSubmit()}
              style={styles.submit}
            />
          </View>
        </FadeSlideIn>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center' },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  logoBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  logoText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  togglePassword: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  togglePasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  submit: {
    marginTop: spacing.sm,
  },
});
