import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { easings } from '@/theme/motion';

import {
  ToastDescription,
  ToastSurface,
  ToastTitle,
  ToastViewport,
  type ToastVariant,
} from './Toast.styles';
import { toast, useToastStore, type ToastRecord } from './toast';

const ENTER_DURATION = 260;
const EXIT_DURATION = 200;

interface ToastItemProps {
  record: ToastRecord;
  index: number;
  onDismiss: (id: string) => void;
}

function ToastItem({ record, index, onDismiss }: ToastItemProps) {
  const translateY = useSharedValue(-32);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const dismissed = React.useRef(false);

  const triggerExit = React.useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    translateY.value = withTiming(-32, { duration: EXIT_DURATION, easing: Easing.bezier(...easings.decelerate) });
    opacity.value = withTiming(0, { duration: EXIT_DURATION });
    scale.value = withTiming(0.96, { duration: EXIT_DURATION });
    setTimeout(() => onDismiss(record.id), EXIT_DURATION + 16);
  }, [record.id, onDismiss, opacity, scale, translateY]);

  useEffect(() => {
    // Enter — starts fast (ease-out), small translate + scale from 0.96.
    translateY.value = withDelay(
      Math.min(index * 40, 160),
      withTiming(0, { duration: ENTER_DURATION, easing: Easing.bezier(...easings.decelerate) }),
    );
    opacity.value = withDelay(
      Math.min(index * 40, 160),
      withTiming(1, { duration: ENTER_DURATION }),
    );
    scale.value = withDelay(
      Math.min(index * 40, 160),
      withTiming(1, { duration: ENTER_DURATION }),
    );

    if (record.duration > 0) {
      const t = setTimeout(triggerExit, record.duration + ENTER_DURATION);
      return () => clearTimeout(t);
    }
    return;
  }, [index, opacity, record.duration, scale, translateY, triggerExit]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const variant = record.variant as ToastVariant;

  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={() => triggerExit()}
        accessibilityRole="alert"
        accessibilityLabel={`Toast: ${record.title}`}
      >
        <ToastSurface $variant={variant}>
          <ToastTitle>{record.title}</ToastTitle>
          {record.description ? (
            <ToastDescription>{record.description}</ToastDescription>
          ) : null}
        </ToastSurface>
      </Pressable>
    </Animated.View>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 8, zIndex: 9999 }}>
      <ToastViewport style={{ position: 'relative', top: 0 }}>
        {toasts.map((t, i) => (
          <ToastItem key={t.id} record={t} index={i} onDismiss={dismiss} />
        ))}
      </ToastViewport>
    </View>
  );
}

export { toast };
