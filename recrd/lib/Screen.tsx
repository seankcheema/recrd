// app/components/Screen.tsx
import React from 'react';
import {
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlobalText from './GlobalText';
import { Skeleton } from './Skeleton';
import { Glass } from './Glass';
import { colors, font, radius, SCROLL_BOTTOM, spacing } from './theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Large gold wordmark or page title. */
  title?: string;
  /**
   * Stand in for the title while it loads. Keeps the header — and so the
   * safe-area inset and the height above the content — identical to the
   * loaded screen, instead of letting the body jump down when the title
   * arrives.
   */
  titlePlaceholder?: boolean;
  /** Small line under the title. */
  subtitle?: string;
  showBack?: boolean;
  /** Rendered to the right of the title. */
  headerRight?: React.ReactNode;
  /** Sits under the header and above the scrolling content. */
  belowHeader?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function Screen({
  children,
  title,
  titlePlaceholder = false,
  subtitle,
  showBack = false,
  headerRight,
  belowHeader,
  onRefresh,
  refreshing = false,
  scroll = true,
  contentStyle,
}: ScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const header = (title || titlePlaceholder || showBack || headerRight) && (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) + spacing.sm }]}>
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <Glass style={styles.backGlass} cornerRadius={radius.pill}>
            <Feather name="chevron-left" size={22} color={colors.gold} />
          </Glass>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {title ? (
          <GlobalText style={styles.title} numberOfLines={1}>
            {title}
          </GlobalText>
        ) : titlePlaceholder ? (
          <Skeleton width={150} height={30} borderRadius={8} />
        ) : null}
        {subtitle ? (
          <GlobalText style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </GlobalText>
        ) : null}
      </View>
      {headerRight}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      // Let the scroll view inset itself for the keyboard. A
      // KeyboardAvoidingView *inside* a scroll view does nothing, so every
      // form screen gets this instead.
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, styles.scrollContent, contentStyle, { flex: 1 }]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <Pressable style={styles.root} onPress={Keyboard.dismiss} accessible={false}>
        {header}
        {belowHeader}
        {body}
      </Pressable>
    </View>
  );
}

/** A section heading with optional trailing action. */
export function SectionHeader({
  children,
  action,
  style,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <GlobalText style={styles.sectionTitle}>{children}</GlobalText>
      {action}
    </View>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <GlobalText style={styles.empty}>{children}</GlobalText>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
  },
  backGlass: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.gold,
    fontSize: 30,
    fontFamily: font.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: SCROLL_BOTTOM,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontFamily: font.bold,
    letterSpacing: -0.3,
    flex: 1,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
