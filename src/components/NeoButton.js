import React, { useState } from 'react';
import { View, TouchableWithoutFeedback, StyleSheet } from 'react-native';

export default function NeoButton({
  children,
  onPress,
  style,
  btnStyle,
  disabled,
  shadowColor = '#1C1C1E',
  borderRadius = 16,
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <TouchableWithoutFeedback
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
    >
      <View style={[styles.container, style]}>
        {/* 背面のソリッドな影 */}
        <View
          style={[
            styles.shadow,
            { backgroundColor: shadowColor, borderRadius: borderRadius },
          ]}
        />
        {/* 前面のボタン本体 */}
        <View
          style={[
            styles.front,
            { borderRadius: borderRadius },
            btnStyle,
            pressed && !disabled && styles.frontPressed,
            disabled && styles.frontDisabled,
          ]}
        >
          {children}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingBottom: 4, // 影の厚み
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
  },
  front: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: 0 }],
  },
  frontPressed: {
    transform: [{ translateY: 4 }],
  },
  frontDisabled: {
    opacity: 0.5,
  },
});
