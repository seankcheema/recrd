// GlobalText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, font } from './theme';

const GlobalText: React.FC<TextProps> = ({ style, children, ...props }) => {
  return (
    <Text style={[styles.globalText, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  globalText: {
    fontFamily: font.regular, // Global font
    fontSize: 16,
    color: colors.text,
  },
});

export default GlobalText;
