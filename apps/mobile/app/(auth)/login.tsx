import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../src/components/ui/AppButton';
import {
  AuthBrandingHeader,
  AuthFormCard,
  AuthScreenLayout,
  AuthTextField,
} from '../../src/components/auth';
import { useAuthStore } from '../../src/auth/auth-store';
import { useNetworkStore } from '../../src/network/network-store';
import { APP_ENV } from '../../src/constants/env';
import { colors, spacing, typography } from '../../src/theme';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);
  const isOffline = useNetworkStore((s) => s.isOffline);

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

    if (isOffline) {
      setFieldError('No internet connection. Connect and try again.');
      return;
    }

    if (!email.trim()) {
      setFieldError('Email is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setFieldError('Enter a valid email address.');
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
  const hasCredentialError = Boolean(displayError && !fieldError);

  return (
    <AuthScreenLayout>
      <AuthBrandingHeader />

      <AuthFormCard>
        <View style={styles.form}>
          <AuthTextField
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (fieldError) setFieldError(null);
              if (error) clearError();
            }}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="name@company.com"
            error={hasCredentialError}
            editable={!isLoading}
          />

          <AuthTextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (fieldError) setFieldError(null);
              if (error) clearError();
            }}
            secureTextEntry={!showPassword}
            textContentType="password"
            autoComplete="password"
            placeholder="••••••••"
            error={hasCredentialError}
            secureToggle
            secureVisible={showPassword}
            onToggleSecure={() => setShowPassword((prev) => !prev)}
            editable={!isLoading}
          />

          {displayError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={[typography.caption, styles.errorText]}>{displayError}</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <View style={styles.spacer} />
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              accessibilityRole="link"
              hitSlop={8}
            >
              <Text style={[typography.caption, styles.forgotLink]}>Forgot password?</Text>
            </Pressable>
          </View>

          <AppButton
            title="Sign In"
            loading={isLoading}
            disabled={isOffline}
            onPress={() => void handleSubmit()}
          />
        </View>

        {APP_ENV !== 'production' ? (
          <Text style={[typography.caption, styles.envHint]}>Environment: {APP_ENV}</Text>
        ) : null}
      </AuthFormCard>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  forgotLink: {
    color: colors.primaryContainer,
    fontFamily: 'Inter_600SemiBold',
  },
  envHint: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
});
