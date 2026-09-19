// app/components/Glass.tsx
import React from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors, radius } from './theme';

/** True on iOS 26+, where the OS renders real Liquid Glass. */
export const liquidGlass = isLiquidGlassAvailable();

export type GlassTone = 'regular' | 'clear';

interface GlassProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 'clear' is thinner and lets more of the artwork through. */
  tone?: GlassTone;
  /** Corner radius; also clips the blur so the edges stay crisp. */
  cornerRadius?: number;
  /** A wash of colour through the glass, e.g. an album's dominant colour. */
  tint?: string;
  /** Liquid Glass reacts to touch when this is on. */
  interactive?: boolean;
}

/**
 * A translucent surface.
 *
 * On iOS 26+ this is the system Liquid Glass material, which refracts and
 * specularly highlights whatever scrolls underneath. Everywhere else it
 * degrades to a blur plus a hairline edge, which reads the same way.
 */
export function Glass({
  children,
  style,
  tone = 'regular',
  cornerRadius = radius.lg,
  tint,
  interactive = false,
}: GlassProps) {
  const shape: ViewStyle = { borderRadius: cornerRadius, overflow: 'hidden' };

  if (liquidGlass) {
    return (
      <GlassView
        style={[shape, style]}
        glassEffectStyle={tone}
        tintColor={tint}
        isInteractive={interactive}
        colorScheme="dark"
      >
        {children}
      </GlassView>
    );
  }

  // expo-blur has no blur on web, so the fill below carries the surface there.
  return (
    <View style={[shape, styles.fallbackEdge, style]}>
      <BlurView
        intensity={tone === 'clear' ? 18 : 34}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tone === 'clear' ? colors.glass : colors.glassStrong },
          Platform.OS === 'web' && styles.webGlass,
          tint ? { backgroundColor: tint } : null,
        ]}
      />
      {children}
    </View>
  );
}

interface GlassButtonProps extends PressableProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: GlassTone;
  cornerRadius?: number;
  tint?: string;
}

/** A Glass surface that presses. */
export function GlassButton({
  children,
  style,
  tone = 'regular',
  cornerRadius = radius.pill,
  tint,
  ...rest
}: GlassButtonProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Glass tone={tone} cornerRadius={cornerRadius} tint={tint} interactive>
        {children}
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fallbackEdge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
    backgroundColor: colors.bgLift,
  },
  webGlass: {
    // Real backdrop blur on web, where expo-blur renders nothing.
    ...Platform.select({
      web: {
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      },
      default: {},
    }),
  } as ViewStyle,
});
