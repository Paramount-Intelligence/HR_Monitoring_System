import { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, spacing, typography } from '../../theme';

interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  showClear?: boolean;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search…',
  showClear = true,
  onClear,
  containerStyle,
  ...inputProps
}: SearchInputProps) {
  const inputRef = useRef<TextInput>(null);
  const canClear = showClear && value.length > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="search" size={18} color={colors.muted} style={styles.icon} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[typography.bodyMd, styles.input]}
        returnKeyType="search"
        clearButtonMode="never"
        {...inputProps}
      />
      {canClear ? (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
            inputRef.current?.focus();
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchTargetMin,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm,
    fontFamily: 'Inter_400Regular',
  },
  clearButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
