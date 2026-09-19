// lib/Skeleton.tsx
import React, { useEffect } from 'react';
import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from './theme';

/**
 * One pulse shared by every skeleton on screen.
 *
 * A placeholder list would otherwise run a dozen independent animations that
 * drift out of phase and shimmer against each other; driving them all from a
 * single looping value keeps the whole screen breathing together and costs
 * one animation no matter how many blocks are mounted.
 */
const pulse = new Animated.Value(0);
let running = false;

function startPulse() {
  if (running) return;
  running = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 750,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 750,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ])
  ).start();
}

const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Defaults to a pill for text lines, so short lines don't look like bricks. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Circular, for avatars. */
  circle?: boolean;
}

/** A single pulsing block standing in for content that hasn't arrived. */
export function Skeleton({
  width = '100%',
  height = 12,
  borderRadius,
  style,
  circle = false,
}: SkeletonProps) {
  useEffect(startPulse, []);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: circle ? height / 2 : borderRadius ?? 6,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * A stand-in for a SectionHeader.
 *
 * Carries the same margins as the real one, so a loading screen leaves the
 * same gap above its first rows and nothing shifts when the content lands.
 */
export function SkeletonHeading({ width = 90 }: { width?: number }) {
  return (
    <View style={styles.heading}>
      <Skeleton width={width} height={19} />
    </View>
  );
}

/** Artwork plus a title and a subtitle — the shape of every list row. */
export function SkeletonRow({
  size = 54,
  circle = false,
  style,
}: {
  size?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <Skeleton
        width={size}
        height={size}
        circle={circle}
        borderRadius={circle ? undefined : radius.sm}
      />
      <View style={styles.rowText}>
        <Skeleton width="52%" height={13} />
        <Skeleton width="34%" height={11} />
      </View>
    </View>
  );
}

/** A run of `count` list rows. */
export function SkeletonList({
  count = 6,
  size = 54,
  circle = false,
}: {
  count?: number;
  size?: number;
  circle?: boolean;
}) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} size={size} circle={circle} />
      ))}
    </View>
  );
}

/** Stands in for an ActivityPost while the feed loads. */
export function SkeletonPost({ showAuthor = true }: { showAuthor?: boolean }) {
  return (
    <View style={styles.post}>
      {showAuthor && (
        <View style={styles.authorRow}>
          <Skeleton width={30} height={30} circle />
          <Skeleton width="38%" height={13} />
        </View>
      )}
      <View style={styles.row}>
        <Skeleton width={56} height={56} borderRadius={radius.sm} />
        <View style={styles.rowText}>
          <Skeleton width="62%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
        <Skeleton width={30} height={26} borderRadius={radius.sm} />
      </View>
      <Skeleton width="90%" height={12} />
      <View style={styles.actions}>
        <Skeleton width={20} height={20} circle />
        <Skeleton width={20} height={20} circle />
      </View>
    </View>
  );
}

/** A run of `count` activity posts. */
export function SkeletonFeed({
  count = 3,
  showAuthor = true,
}: {
  count?: number;
  showAuthor?: boolean;
}) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonPost key={i} showAuthor={showAuthor} />
      ))}
    </View>
  );
}

/** Stands in for the identity block at the top of a profile. */
export function SkeletonProfile() {
  return (
    <View style={styles.profile}>
      <View style={styles.identityRow}>
        <Skeleton width={76} height={76} circle />
        <View style={styles.identityText}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="100%" height={14} />
        </View>
      </View>
      <Skeleton width="80%" height={13} />
      <View style={styles.buttonRow}>
        <Skeleton width="48%" height={40} borderRadius={radius.md} />
        <Skeleton width="48%" height={40} borderRadius={radius.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.bgLift,
  },
  heading: {
    // Matches SectionHeader's own margins.
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: spacing.sm,
  },
  post: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  profile: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  identityText: {
    flex: 1,
    gap: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
