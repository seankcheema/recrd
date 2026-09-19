// app/components/TierChip.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import GlobalText from './GlobalText';
import { TIER_COLORS, Tier } from './tiers';
import { colors, font, radius } from './theme';

export default function TierChip({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' }) {
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: TIER_COLORS[tier] },
        small && styles.chipSmall,
      ]}
    >
      <GlobalText style={[styles.label, small && styles.labelSmall]}>
        {tier}
      </GlobalText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edgeStrong,
  },
  chipSmall: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
  },
  label: {
    fontSize: 14,
    fontFamily: font.bold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 12,
  },
});
