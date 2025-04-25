import { View, StyleSheet } from 'react-native';
import { Link, useRouter, usePathname } from 'expo-router';
import { Feather, Entypo } from '@expo/vector-icons';

const Nav = () => {
  const pathname = usePathname();

  const getIconColor = (route: string) => (pathname === route ? '#FFFAF0FF' : '#FFFAF080');

  return (
    <View style={styles.nav}>
      <View style={styles.navList}>
        <Link href="/" style={styles.navLink}>
          <Entypo name="home" size={28} color={getIconColor('/')} />
        </Link>
        <Link href="/components/List" style={styles.navLink}>
          <Feather name="list" size={28} color={getIconColor('/components/List')} />
        </Link>
        <Link href="/components/AddNew" style={styles.navLink}>
          <Feather name="plus-circle" size={42} color="#E7BC10" />
        </Link>
        <Link href="/components/Trending" style={styles.navLink}>
          <Feather name="trending-up" size={28} color={getIconColor('/components/Trending')} />
        </Link>
        <Link href="/components/Profile" style={styles.navLink}>
          <Feather name="user" size={28} color={getIconColor('/components/Profile')} />
        </Link>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    borderTopColor: '#FFFAF0A0',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#111111',
    padding: 10,
    paddingTop: 0,
    height: 80,
    width: '100%',
  },
  navList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navLink: {
    textDecorationLine: 'none',
  },
});

export default Nav;
