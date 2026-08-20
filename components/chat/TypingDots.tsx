import React, { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import styled from 'styled-components/native';

import { easings } from '@/theme/motion';

/**
 * Looping "…" indicator shown while the model is generating. Each dot pulses
 * 0.25 → 1 opacity with a 160ms stagger; the loop reverses so it breathes
 * instead of blinking.
 */

const PULSE_MS = 460;
const STAGGER_MS = 160;
const DIM = 0.25;

const DotsRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 5px;
  padding-vertical: 6px;
  padding-horizontal: 2px;
`;

const Dot = styled.View`
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background-color: ${({ theme }) => theme.colors.textSecondary};
`;

function PulsingDot({ index }: { index: number }) {
  const opacity = useSharedValue(DIM);

  useEffect(() => {
    opacity.value = withDelay(
      index * STAGGER_MS,
      withRepeat(
        withTiming(1, { duration: PULSE_MS, easing: Easing.bezier(...easings.standard) }),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [index, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Dot as={Animated.View} style={style} />;
}

export function TypingDots() {
  return (
    <DotsRow>
      {[0, 1, 2].map((i) => (
        <PulsingDot key={i} index={i} />
      ))}
    </DotsRow>
  );
}
