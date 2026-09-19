import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Feather, Entypo } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass, liquidGlass } from './Glass';
import { colors, goldGlow, radius } from './theme';

const TABS = [
  { route: '/', icon: 'home', lib: 'entypo' },
  { route: '/components/List', icon: 'list', lib: 'feather' },
  { route: '/components/AddNew', icon: 'plus', lib: 'feather' },
  { route: '/components/Trending', icon: 'trending-up', lib: 'feather' },
  { route: '/components/Profile', icon: 'user', lib: 'feather' },
] as const;

const Nav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => pathname === route;

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
      pointerEvents="box-none"
    >
      <Glass style={styles.bar} cornerRadius={radius.pill} tone="regular">
        <View style={styles.row}>
          {TABS.map((tab) => {
            const active = isActive(tab.route);
            const isAdd = tab.route === '/components/AddNew';

            return (
              <Pressable
                key={tab.route}
                onPress={() => router.push(tab.route as any)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.tab,
                  isAdd && styles.addTab,
                  pressed && { opacity: 0.6 },
                ]}
              >
                {active && !isAdd && <View style={styles.activeDot} />}
                {tab.lib === 'entypo' ? (
                  <Entypo
                    name={tab.icon as any}
                    size={24}
                    color={active ? colors.text : colors.textFaint}
                  />
                ) : (
                  <Feather
                    name={tab.icon as any}
                    size={isAdd ? 26 : 24}
                    color={isAdd ? colors.bg : active ? colors.text : colors.textFaint}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    // The OS material already carries an edge on Liquid Glass builds.
    borderWidth: liquidGlass ? 0 : StyleSheet.hairlineWidth,
    borderColor: colors.edge,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 62,
    paddingHorizontal: 8,
  },
  tab: {
    width: 52,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTab: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    boxShadow: goldGlow,
    elevation: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
});

export default Nav;
