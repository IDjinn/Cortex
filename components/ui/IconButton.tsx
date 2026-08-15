import type { PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import React, { useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';

import { IconButtonContainer, type IconButtonVariant } from './IconButton.styles';

const AnimatedContainer = Animated.createAnimatedComponent(IconButtonContainer);

const SPRING = { damping: 18, stiffness: 380, mass: 0.7 };

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  variant?: IconButtonVariant;
  round?: boolean;
  icon: React.ReactNode;
}

export function IconButton({
  variant = 'default',
  round = false,
  icon,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: IconButtonProps) {
  const pressed = useSharedValue(0);

  const onIn = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withSpring(1, SPRING);
      onPressIn?.(e);
    },
    [onPressIn, pressed],
  );
  const onOut = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withSpring(0, SPRING);
      onPressOut?.(e);
    },
    [onPressOut, pressed],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.05 }],
    opacity: disabled ? 0.4 : 1,
  }));

  return (
    <AnimatedContainer
      $variant={variant}
      $round={round}
      style={animatedStyle}
      onPressIn={onIn}
      onPressOut={onOut}
      disabled={disabled}
      accessibilityRole="imagebutton"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
    >
      {icon}
    </AnimatedContainer>
  );
}
