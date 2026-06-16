import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../src/components/ui/AppButton';
import {
  AuthBrandingHeader,
  AuthFormCard,
  AuthScreenLayout,
  AuthTextField,
} from '../../src/components/auth';
import { forgotPasswordRequest } from '../../src/api/auth.api';
import { getErrorMessage } from '../../src/api/client';
import { useNetworkStore } from '../../src/network/network-store';
import { colors, spacing, typography } from '../../src/theme';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const isOffline = useNetworkStore((s) => s.isOffline);

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setApiError(null);
    setFieldError(null);

    if (isOffline) {
      setApiError('No internet connection. Connect and try again.');
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

    setLoading(true);
    try {
      const response = await forgotPasswordRequest({ email: email.trim().toLowerCase() });
      setSuccessMessage(response.message);
      setSubmitted(true);
    } catch (error) {
      setApiError(getErrorMessage(error, 'Unable to send recovery link. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthScreenLayout onBack={() => router.replace('/(auth)/login')}>
        <AuthBrandingHeader
          title="Check your email"
          tagline="Password recovery"
          description={
            successMessage ??
            'If an account with this email exists, a reset link has been sent.'
          }
        />
        <AuthFormCard>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={[typography.bodyMd, styles.successCopy]}>
            Check your inbox for instructions. Reset links are sent to your work email when an
            account exists.
          </Text>
          <AppButton title="Back to Login" onPress={() => router.replace('/(auth)/login')} />
        </AuthFormCard>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout onBack={() => router.back()}>
      <AuthBrandingHeader
        title="Reset password"
        tagline="Paramount Intelligence Monitoring System"
        description="Enter your work email and we’ll send a secure recovery link."
      />

      <AuthFormCard>
        <View style={styles.form}>
          <AuthTextField
            label="Work email"
            icon="mail-outline"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setFieldError(null);
              setApiError(null);
            }}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="name@company.com"
            error={Boolean(fieldError || apiError)}
            editable={!loading}
          />

          {fieldError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={[typography.caption, styles.errorText]}>{fieldError}</Text>
            </View>
          ) : null}

          {apiError ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={[typography.caption, styles.errorText]}>{apiError}</Text>
            </View>
          ) : null}

          <AppButton
            title="Send recovery link"
            loading={loading}
            disabled={isOffline}
            onPress={() => void handleSubmit()}
          />

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="link"
            style={styles.backLink}
          >
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={[typography.bodySm, styles.backLinkText]}>Return to login</Text>
          </Pressable>
        </View>
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
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  backLinkText: {
    color: colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  successIconWrap: {
    alignItems: 'center',
  },
  successCopy: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
