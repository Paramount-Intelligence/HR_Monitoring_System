import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { AfterShiftCheckoutReason, CheckoutModalType } from '../../types/attendance';
import { AppButton } from '../ui/AppButton';
import { colors, radii, spacing } from '../../constants/theme';

interface CheckoutReasonModalProps {
  visible: boolean;
  type: CheckoutModalType;
  loading?: boolean;
  onClose: () => void;
  onSubmitEarly: (reason: string) => void;
  onSubmitOvertime: (payload: {
    checkout_after_shift_reason: AfterShiftCheckoutReason;
    checkout_after_shift_note: string;
  }) => void;
}

const OVERTIME_OPTIONS: { value: AfterShiftCheckoutReason; label: string }[] = [
  { value: 'overtime', label: 'Overtime Work (Business Requirement)' },
  { value: 'forgot_checkout', label: 'Forgot to check out' },
];

export function CheckoutReasonModal({
  visible,
  type,
  loading = false,
  onClose,
  onSubmitEarly,
  onSubmitOvertime,
}: CheckoutReasonModalProps) {
  const [earlyReason, setEarlyReason] = useState('');
  const [checkoutReason, setCheckoutReason] = useState<AfterShiftCheckoutReason>('overtime');
  const [checkoutNote, setCheckoutNote] = useState('');

  const handleClose = () => {
    setEarlyReason('');
    setCheckoutReason('overtime');
    setCheckoutNote('');
    onClose();
  };

  const earlyValid = earlyReason.trim().length >= 5;
  const overtimeValid = checkoutNote.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {type === 'early' ? (
                <>
                  <Text style={styles.title}>Early Checkout Reason</Text>
                  <Text style={styles.description}>
                    You are checking out before your scheduled shift end time. Please provide a
                    reason.
                  </Text>
                  <Text style={styles.inputLabel}>Reason for early checkout</Text>
                  <TextInput
                    value={earlyReason}
                    onChangeText={setEarlyReason}
                    placeholder="Provide a reason for checking out early..."
                    placeholderTextColor={colors.mutedText}
                    multiline
                    textAlignVertical="top"
                    style={styles.textarea}
                  />
                  {!earlyValid && !loading ? (
                    <Text style={styles.helper}>
                      Enter at least 5 characters to submit checkout.
                    </Text>
                  ) : null}
                  <AppButton
                    title={loading ? 'Checking out...' : 'Submit Checkout'}
                    loading={loading}
                    disabled={!earlyValid}
                    onPress={() => onSubmitEarly(earlyReason.trim())}
                    style={styles.submit}
                  />
                </>
              ) : null}

              {type === 'overtime' ? (
                <>
                  <Text style={styles.title}>Overtime Justification</Text>
                  <Text style={styles.description}>
                    You are checking out after your shift has ended. Please provide a reason.
                  </Text>
                  <Text style={styles.inputLabel}>Reason Type</Text>
                  {OVERTIME_OPTIONS.map((option) => {
                    const selected = checkoutReason === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setCheckoutReason(option.value)}
                        style={[styles.option, selected && styles.optionSelected]}
                      >
                        <View style={[styles.radio, selected && styles.radioSelected]} />
                        <Text style={styles.optionLabel}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                  <Text style={styles.inputLabel}>Explanation Notes</Text>
                  <TextInput
                    value={checkoutNote}
                    onChangeText={setCheckoutNote}
                    placeholder="Provide a reason for this request..."
                    placeholderTextColor={colors.mutedText}
                    multiline
                    textAlignVertical="top"
                    style={styles.textarea}
                  />
                  {!overtimeValid && !loading ? (
                    <Text style={styles.helper}>Add explanation notes to enable checkout.</Text>
                  ) : null}
                  <AppButton
                    title={loading ? 'Checking out...' : 'Check Out'}
                    loading={loading}
                    disabled={!overtimeValid}
                    onPress={() =>
                      onSubmitOvertime({
                        checkout_after_shift_reason: checkoutReason,
                        checkout_after_shift_note: checkoutNote.trim(),
                      })
                    }
                    style={styles.submit}
                  />
                </>
              ) : null}

              <AppButton
                title="Cancel"
                variant="secondary"
                disabled={loading}
                onPress={handleClose}
                style={styles.cancel}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    maxHeight: '88%',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  helper: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.overlay,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  submit: {
    marginTop: spacing.md,
  },
  cancel: {
    marginTop: spacing.sm,
  },
});
