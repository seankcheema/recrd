// GlobalText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

const GlobalText: React.FC<TextProps> = ({ style, children, ...props }) => {
  return (
    <Text style={[styles.globalText, style]} {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  globalText: {
    fontFamily: 'Nunito-Regular', // Global font
    fontSize: 16,
    color: '#FFFAF0',
  },
});

export default GlobalText;
