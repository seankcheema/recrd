// app/components/Screen.tsx
import React, { useState } from 'react';
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
  /**
   * Pinned under the title, inside the floating bar — a search field or a
   * row of tabs that should stay put while the page scrolls under it.
   */
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
  // The bar floats over the content, so the scroll view has to be told how
  // much of its top is spoken for.
  // How much of the top the bar covers, measured rather than assumed.
  const [topInset, setTopInset] = useState(0);

  // The strip the status bar sits in, solid like the title under it.
  const topStrip = <View style={{ height: Math.max(insets.top, spacing.xl) + spacing.sm }} />;

  const header = (title || titlePlaceholder || showBack || headerRight) && (
    <View
      style={[
        styles.header,
        // Where a search field follows, the solid part stops just under the
        // title and the rest of the gap belongs to the field, so the page
        // reappears above it rather than out from under its edge. With no
        // field, this is simply the gap before the content.
        { paddingBottom: belowHeader ? spacing.xs : spacing.md },
      ]}
    >
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

  // Only the header takes the tap-to-dismiss; the body below keeps its own
  // gestures.
  const headerBlock = (
    <Pressable onPress={Keyboard.dismiss} accessible={false}>
      {header}
    </Pressable>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topInset }, contentStyle]}
      scrollIndicatorInsets={{ top: topInset }}
      keyboardShouldPersistTaps="handled"
      // Dragging the list puts the keyboard away. A Pressable wrapped around
      // the scroll view would do that on tap too, but it also wins the touch
      // responder often enough to swallow the drag, which made scrolling come
      // and go.
      keyboardDismissMode="on-drag"
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
            // Otherwise the spinner turns behind the bar.
            progressViewOffset={topInset}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    // Nothing scrolls here, so a tap anywhere can safely dismiss the keyboard.
    <Pressable
      style={[
        styles.scroll,
        styles.scrollContent,
        { paddingTop: topInset },
        contentStyle,
        { flex: 1 },
      ]}
      onPress={Keyboard.dismiss}
      accessible={false}
    >
      {children}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      {/* The body goes down first so the bar's blur has something to work on. */}
      {body}
      {header || belowHeader ? (
        <FloatingBar
          onInsetChange={setTopInset}
          solid={
            <>
              {topStrip}
              {headerBlock}
            </>
          }
          floating={
            belowHeader ? <View style={styles.belowHeader}>{belowHeader}</View> : null
          }
        />
      ) : null}
    </View>
  );
}

/**
 * A bar pinned to the top of a page. The page runs up behind it and stops at
 * its solid part; anything floating below that sits over the page itself.
 */
export function FloatingBar({
  solid,
  floating,
  onInsetChange,
}: {
  /**
   * Sits on page background. This is the cut: whatever scrolls up behind it
   * simply ends here.
   */
  solid?: React.ReactNode;
  /** Sits below the cut, over the page — a search field, say. */
  floating?: React.ReactNode;
  /** What the bar covers, for the page to inset its content by. */
  onInsetChange?: (inset: number) => void;
}) {
  return (
    // Touches stop at the bar rather than reaching the page behind it, the
    // way a nav bar behaves anywhere else.
    <View
      style={styles.bar}
      onLayout={(e) => onInsetChange?.(e.nativeEvent.layout.height)}
    >
      <View style={styles.barSolid}>{solid}</View>
      {floating}
    </View>
  );
}

/** A section heading with optional trailing action. */
export function SectionHeader({
  children,
  action,
  style,
  first = false,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Opens the page: no section above it to be separated from. */
  first?: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, first && styles.sectionHeaderFirst, style]}>
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
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  barSolid: {
    backgroundColor: colors.bg,
  },
  belowHeader: {
    paddingHorizontal: spacing.xl,
    // Together with the header's 4 above it, the field keeps the same 12 it
    // has always had between itself and the title — the cut just sits higher
    // in that gap now.
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
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
  sectionHeaderFirst: {
    marginTop: 0,
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
