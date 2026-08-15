import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Modal, type ViewStyle } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { easings } from '@/theme/motion';

import { Backdrop, Grabber, SheetSurface, SheetWrap } from './BottomSheet.styles';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Dismiss threshold as a fraction of the sheet height (default 0.4). */
  dismissThreshold?: number;
  /** Velocity threshold for flick-to-dismiss in px/ms (Emil's heuristic: ~0.11). */
  dismissVelocity?: number;
  /** Disable the swipe-down to dismiss gesture. */
  disableDismiss?: boolean;
}

const SPRING_OUT = { damping: 26, stiffness: 320, mass: 0.8 };
const ENTRY_DURATION = 280;

export function BottomSheet({
  visible,
  onClose,
  children,
  dismissThreshold = 0.4,
  dismissVelocity = 0.11,
  disableDismiss = false,
}: BottomSheetProps) {
  const [sheetHeight, setSheetHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const hasBeenDismissed = useSharedValue(false);

  const dismiss = useCallback(() => {
    'worklet';
    hasBeenDismissed.value = true;
    translateY.value = withTiming(sheetHeight || 800, {
      duration: 220,
      easing: Easing.bezier(...easings.decelerate),
    });
    backdropOpacity.value = withTiming(0, { duration: 200 });
    runOnJS(onClose)();
  }, [sheetHeight, translateY, backdropOpacity, onClose]);

  // Entrance / exit coordination.
  useEffect(() => {
    if (visible) {
      hasBeenDismissed.value = false;
      // Reset to fully hidden, then animate in.
      translateY.value = sheetHeight || 800;
      backdropOpacity.value = 0;
      requestAnimationFrame(() => {
        backdropOpacity.value = withTiming(0.5, { duration: ENTRY_DURATION });
        translateY.value = withSpring(0, SPRING_OUT);
      });
    }
  }, [visible, sheetHeight, translateY, backdropOpacity]);

  // Hardware back button on Android.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!hasBeenDismissed.value) dismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, dismiss]);

  // Damping at the top boundary (no overscroll beyond 0).
  const applyDamping = useCallback(
    (rawY: number) => {
      'worklet';
      if (rawY < 0) return rawY * 0.3;
      return rawY;
    },
    [],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          'worklet';
          cancelAnimation(translateY);
        })
        .onUpdate((e) => {
          'worklet';
          // Only react to vertical drag (ignore horizontal scroll hijacks).
          translateY.value = applyDamping(e.translationY);
        })
        .onEnd((e) => {
          'worklet';
          if (disableDismiss) {
            translateY.value = withSpring(0, SPRING_OUT);
            return;
          }
          const distance = Math.abs(e.translationY);
          const speed = Math.abs(e.velocityY);
          // velocityY is px/s — convert to px/ms by /1000 (Emil's heuristic ~0.11 px/ms).
          const velocity = speed / 1000;
          if (
            e.translationY > 0 &&
            (distance >= (sheetHeight || 1) * dismissThreshold || velocity > dismissVelocity)
          ) {
            dismiss();
          } else {
            // Snap back to 0 with the iOS drawer feel.
            translateY.value = withSpring(0, {
              damping: 30,
              stiffness: 320,
              mass: 0.8,
            });
          }
        }),
    [translateY, sheetHeight, dismiss, disableDismiss, dismissThreshold, dismissVelocity, applyDamping],
  );

  const animatedSheet = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Hide the surface entirely once it has been dismissed (avoids flashes).
  useAnimatedReaction(
    () => translateY.value,
    (y) => {
      void y;
    },
  );

  const sheetStyle: ViewStyle = { opacity: visible ? 1 : 0 };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Backdrop $opacity={1} pointerEvents="auto" style={{ opacity: 0 }}>
          <Animated.View
            style={{ flex: 1, opacity: backdropOpacity, backgroundColor: '#000' }}
            onTouchStart={() => !hasBeenDismissed.value && dismiss()}
          />
        </Backdrop>
        <SheetWrap style={sheetStyle}>
          <GestureDetector gesture={pan}>
            <Animated.View
              style={animatedSheet}
              onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
            >
              <SheetSurface style={{ paddingBottom: insets.bottom + 16 }}>
                <Grabber />
                {children}
              </SheetSurface>
            </Animated.View>
          </GestureDetector>
        </SheetWrap>
      </GestureHandlerRootView>
    </Modal>
  );
}
