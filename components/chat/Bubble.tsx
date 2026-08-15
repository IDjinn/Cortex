import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui';
import { easings } from '@/theme/motion';

import { BubbleContainer, BubbleMeta, BubbleRow, BubbleText, type BubbleSide } from './Bubble.styles';

export interface BubbleProps {
  side: BubbleSide;
  children: React.ReactNode;
  avatarSrc?: string | null;
  avatarName?: string | null;
  showAvatar?: boolean;
  meta?: string;
  /** Index used to compute the stagger delay (entry animation only). */
  staggerIndex?: number;
  /** Skip the entrance animation entirely (e.g. when restoring state). */
  animateIn?: boolean;
}

const STAGGER_STEP = 45; // ms between items (Emil: 30-80ms band)
const ENTRY_DURATION = 220; // under 300ms for UI

export function Bubble({
  side,
  children,
  avatarSrc,
  avatarName,
  showAvatar = true,
  meta,
  staggerIndex = 0,
  animateIn = true,
}: BubbleProps) {
  const progress = useSharedValue(animateIn ? 0 : 1);

  useEffect(() => {
    if (!animateIn) {
      progress.value = 1;
      return;
    }
    const delay = Math.min(staggerIndex * STAGGER_STEP, 240);
    progress.value = withDelay(
      delay,
      withTiming(
        1,
        { duration: ENTRY_DURATION, easing: Easing.bezier(...easings.decelerate) },
        (finished) => {
          if (!finished) runOnJS(cancelAnimation)(progress);
        },
      ),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [animateIn, progress, staggerIndex]);

  const animatedStyle = useAnimatedStyle(() => ({
    // Never scale(0) — start from 0.96 + opacity 0 (Emil).
    opacity: progress.value,
    transform: [{ scale: 0.96 + 0.04 * progress.value }, { translateY: 8 * (1 - progress.value) }],
  }));

  const avatar =
    showAvatar && side === 'assistant' ? (
      <Avatar src={avatarSrc} name={avatarName ?? 'Cortex'} size={28} />
    ) : null;

  return (
    <BubbleRow $side={side}>
      {side === 'assistant' ? avatar : null}
      <View style={{ flexShrink: 1 }}>
        <Animated.View style={animatedStyle}>
          <BubbleContainer $side={side}>
            {typeof children === 'string' ? (
              <BubbleText $side={side}>{children}</BubbleText>
            ) : (
              children
            )}
          </BubbleContainer>
        </Animated.View>
        {meta ? <BubbleMeta $side={side}>{meta}</BubbleMeta> : null}
      </View>
    </BubbleRow>
  );
}

export function UserBubble(props: Omit<BubbleProps, 'side'>) {
  return <Bubble {...props} side="user" />;
}

export function AssistantBubble(props: Omit<BubbleProps, 'side'>) {
  return <Bubble {...props} side="assistant" />;
}
