import React from 'react';
import type { TextInputProps } from 'react-native';
import { View } from 'react-native';

import { InputField, InputHint, InputLabel } from './Input.styles';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, ...rest }: InputProps) {
  return (
    <View>
      {label ? <InputLabel>{label}</InputLabel> : null}
      <InputField
        $hasError={!!error}
        placeholderTextColor="#8A8A93"
        autoCorrect={false}
        autoCapitalize="none"
        {...rest}
      />
      {error ? (
        <InputHint $error>{error}</InputHint>
      ) : hint ? (
        <InputHint $error={false}>{hint}</InputHint>
      ) : null}
    </View>
  );
}
