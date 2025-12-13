import { Ionicons } from '@expo/vector-icons';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import * as Application from 'expo-application';
import {
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import IndexScreen from './index';
import StatsScreen from './stats';

// NOT: UserRepository ve useQuery importları kaldırıldı çünkü artık Auth yok.

export type RootDrawerParamList = {
  index: undefined;
  stats: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function CustomDrawerContent(props: any) {
  const colorScheme = useColorScheme();

  // Dinamik kullanıcı verisi çekme mantığı tamamen kaldırıldı.
  // Artık sabit bir uygulama ismi ve logo gösteriyoruz.

  const headerStyles = {
    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
  };
  const profileNameStyles = {
    color: colorScheme === 'dark' ? '#fff' : '#333',
  };
  const menuContainerStyles = {
    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
  };
  const footerBorderStyles = {
    borderTopColor: colorScheme === 'dark' ? '#333' : '#eee',
  };
  const versionTextStyles = {
    color: colorScheme === 'dark' ? '#555' : '#aaa',
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <View style={[styles.headerContainer, headerStyles]}>
          <View style={styles.profileContainer}>
            <Image
              source={require('../../assets/images/mindfliplogo.png')}
              style={styles.profileImage}
            />
            {/* Auth olmadığı için sabit isim */}
            <Text style={[styles.profileName, profileNameStyles]}>
              MindFlip
            </Text>
          </View>
        </View>

        <View style={[styles.menuItemsContainer, menuContainerStyles]}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <View
        style={[
          styles.footerContainer,
          menuContainerStyles,
          footerBorderStyles,
        ]}
      >
        <Text style={[styles.versionText, versionTextStyles]}>
          Versiyon: {Application.nativeApplicationVersion ?? '1.0.0'}
        </Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: colorScheme === 'dark' ? '#999' : '#555',
        drawerLabelStyle: {
          marginLeft: -5,
          fontSize: 16,
        },
        drawerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
        },
      }}
    >
      <Drawer.Screen
        name="index"
        component={IndexScreen}
        options={{
          title: 'Anasayfa',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="stats"
        component={StatsScreen}
        options={{
          title: 'İstatistikler',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    minHeight: 22,
  },
  menuItemsContainer: {
    flex: 1,
    paddingTop: 10,
  },
  footerContainer: {
    borderTopWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
  },
});