import { type ReactNode, useEffect, useRef, useState } from 'react';

import {

  Animated,

  Modal,

  Pressable,

  StyleSheet,

  View,

  type StyleProp,

  type ViewStyle,

} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Easing } from 'react-native';

import { colors, radius, spacing } from '../../theme';

import { useReducedMotion } from '../../animations/useReducedMotion';



interface BottomSheetProps {

  visible: boolean;

  onClose: () => void;

  children: ReactNode;

  contentStyle?: StyleProp<ViewStyle>;

}



export function BottomSheet({ visible, onClose, children, contentStyle }: BottomSheetProps) {

  const insets = useSafeAreaInsets();

  const reducedMotion = useReducedMotion();

  const [modalVisible, setModalVisible] = useState(visible);

  const translateY = useRef(new Animated.Value(400)).current;

  const backdropOpacity = useRef(new Animated.Value(0)).current;



  useEffect(() => {

    if (visible) {

      setModalVisible(true);

      if (reducedMotion) {

        translateY.setValue(0);

        backdropOpacity.setValue(1);

        return;

      }

      translateY.setValue(400);

      backdropOpacity.setValue(0);

      Animated.parallel([

        Animated.timing(translateY, {

          toValue: 0,

          duration: 280,

          easing: Easing.out(Easing.cubic),

          useNativeDriver: true,

        }),

        Animated.timing(backdropOpacity, {

          toValue: 1,

          duration: 220,

          useNativeDriver: true,

        }),

      ]).start();

      return;

    }



    if (!modalVisible) return;



    if (reducedMotion) {

      setModalVisible(false);

      return;

    }



    Animated.parallel([

      Animated.timing(translateY, {

        toValue: 400,

        duration: 220,

        easing: Easing.in(Easing.cubic),

        useNativeDriver: true,

      }),

      Animated.timing(backdropOpacity, {

        toValue: 0,

        duration: 180,

        useNativeDriver: true,

      }),

    ]).start(({ finished }) => {

      if (finished) setModalVisible(false);

    });

  }, [backdropOpacity, modalVisible, reducedMotion, translateY, visible]);



  if (!modalVisible) return null;



  return (

    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>

      <View style={styles.root}>

        <Pressable style={styles.backdropPressable} onPress={onClose} accessibilityLabel="Close">

          <Animated.View style={[styles.backdrop, { opacity: reducedMotion ? 1 : backdropOpacity }]} />

        </Pressable>

        <Animated.View

          style={[

            styles.sheet,

            {

              paddingBottom: Math.max(insets.bottom, spacing.lg),

              transform: reducedMotion ? undefined : [{ translateY }],

            },

            contentStyle,

          ]}

        >

          <View style={styles.handle} />

          {children}

        </Animated.View>

      </View>

    </Modal>

  );

}



const styles = StyleSheet.create({

  root: {

    flex: 1,

    justifyContent: 'flex-end',

  },

  backdropPressable: {

    ...StyleSheet.absoluteFillObject,

  },

  backdrop: {

    flex: 1,

    backgroundColor: 'rgba(21, 28, 39, 0.4)',

  },

  sheet: {

    backgroundColor: colors.surfaceElevated,

    borderTopLeftRadius: radius.xl,

    borderTopRightRadius: radius.xl,

    paddingHorizontal: spacing.lg,

    paddingTop: spacing.sm,

    maxHeight: '88%',

  },

  handle: {

    alignSelf: 'center',

    width: 40,

    height: 4,

    borderRadius: 2,

    backgroundColor: colors.border,

    marginBottom: spacing.md,

  },

});


