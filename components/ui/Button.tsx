import type { PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import React, { useCallback } from 'react';
import { ActivityIndicator, GestureResponderEvent } from 'react-native';

import { ButtonContainer, ButtonLabel, type ButtonVariant } from './Button.styles';

const AnimatedPressable = Animated.createAnimatedComponent(ButtonContainer);

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children: React.ReactNode;
}

const SPRING = { damping: 18, stiffness: 380, mass: 0.7 };

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  iconLeft,
  iconRight,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
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
    // 0.97 scale on press — instant feedback that the UI heard the user.
    transform: [{ scale: 1 - pressed.value * 0.03 }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <AnimatedPressable
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      style={animatedStyle}
      onPressIn={onIn}
      onPressOut={onOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <>
          {iconLeft}
          <ButtonLabel $variant={variant} $size={size} $fullWidth={fullWidth}>
            {children}
          </ButtonLabel>
          {iconRight}
        </>
      )}
    </AnimatedPressable>
  );
}
