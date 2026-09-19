// app/components/SearchField.tsx
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Glass } from './Glass';
import { colors, font, radius } from './theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}

export default function SearchField({
  value,
  onChangeText,
  placeholder = 'search',
  onSubmitEditing,
  autoFocus,
}: Props) {
  return (
    <Glass style={styles.wrapper} cornerRadius={radius.md} tone="regular">
      <View style={styles.row}>
        <Feather name="search" size={19} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={40}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="search"
          onSubmitEditing={onSubmitEditing}
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText('')} hitSlop={10}>
            <Feather name="x-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.goldSoft,
  },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: font.bold,
    color: colors.text,
    fontSize: 15,
  },
});
