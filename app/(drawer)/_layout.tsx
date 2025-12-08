import { Ionicons } from '@expo/vector-icons';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import * as Application from 'expo-application';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import IndexScreen from './index';
import SettingsScreen from './settings';
import StatsScreen from './stats';

import { useQuery } from '@tanstack/react-query';
import * as UserRepository from '../../lib/repositories/userRepository';

export type RootDrawerParamList = {
  index: undefined;
  stats: undefined;
  settings: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function CustomDrawerContent(props: any) {
  const colorScheme = useColorScheme();

  // DÜZELTME: ID 1 yerine, yerel veritabanındaki mevcut kullanıcıyı çekiyoruz.
  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isErrorUser,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      // Yereldeki kullanıcıları getir (Genelde tek bir aktif kullanıcı olur)
      const users = await UserRepository.getUsers();
      return users[0] ?? null;
    },
  });

  const getUserName = () => {
    if (isLoadingUser) return <ActivityIndicator size="small" />;
    if (isErrorUser || !user) return 'Misafir Kullanıcı';
    return user.name ?? 'İsimsiz Kullanıcı'; 
  };

  // DÜZELTME: Profil fotoğrafı varsa onu, yoksa logoyu kullan
  const profileImageSource = user?.profile_photo
    ? { uri: user.profile_photo }
    : require('../../assets/images/mindfliplogo.png');

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
              source={profileImageSource}
              style={styles.profileImage}
              resizeMode="cover"
            />
            <Text style={[styles.profileName, profileNameStyles]}>
              {getUserName()}
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
          marginLeft: -10,
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

      <Drawer.Screen
        name="settings"
        component={SettingsScreen}
        options={{
          title: 'Ayarlar & Profil',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
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
    width: 80, // Biraz büyüttük
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: '#eee', // Resim yüklenene kadar gri arka plan
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