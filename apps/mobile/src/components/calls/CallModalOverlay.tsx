import { Modal, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { useSlideIn } from '../../animations/useSlideIn';
import { Animated } from 'react-native';
import { colors, shadows } from '../../constants/theme';

interface CallModalOverlayProps extends ViewProps {
  visible: boolean;
  fullScreen?: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
}

export function CallModalOverlay({
  visible,
  fullScreen = false,
  onRequestClose,
  children,
  style,
  ...props
}: CallModalOverlayProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={!fullScreen}
      presentationStyle={fullScreen ? 'fullScreen' : 'overFullScreen'}
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={[fullScreen ? styles.fullScreen : styles.overlay, style]} {...props}>
        {children}
      </View>
    </Modal>
  );
}

export function CallModalCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewProps['style'];
}) {
  const { style: entranceStyle } = useSlideIn({ distance: 24, duration: 280 });

  return (
    <Animated.View style={[styles.card, entranceStyle, style]}>
      {children}
    </Animated.View>
  );
}

export function CallBackdropPressable({ onPress }: { onPress: () => void }) {
  return <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 32, 74, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.call.backdrop,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.call.panel,
    padding: 32,
    ...shadows.elevated,
  },
});
