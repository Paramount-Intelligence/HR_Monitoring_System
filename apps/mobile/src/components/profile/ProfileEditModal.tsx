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
import type { User } from '../../types/user';
import { AppButton } from '../ui/AppButton';
import { colors, radii, spacing } from '../../constants/theme';

interface ProfileEditModalProps {
  visible: boolean;
  user: User | null;
  loading?: boolean;
  onClose: () => void;
  onSave: (payload: { full_name: string; phone?: string | null }) => void;
}

export function ProfileEditModal({
  visible,
  user,
  loading = false,
  onClose,
  onSave,
}: ProfileEditModalProps) {
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const handleOpen = () => {
    setFullName(user?.full_name ?? '');
    setPhone(user?.phone ?? '');
  };

  const canSave = fullName.trim().length > 0 && !loading;

  return (
    <Modal visible={visible} animationType="slide" transparent onShow={handleOpen} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Edit Profile</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={colors.mutedText}
              />
              <Text style={styles.label}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={colors.mutedText}
                keyboardType="phone-pad"
              />
              <AppButton
                title="Save Changes"
                loading={loading}
                disabled={!canSave}
                onPress={() => onSave({ full_name: fullName.trim(), phone: phone.trim() || null })}
                style={styles.save}
              />
              <AppButton title="Cancel" variant="secondary" disabled={loading} onPress={onClose} />
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
    maxHeight: '80%',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedText,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  save: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
