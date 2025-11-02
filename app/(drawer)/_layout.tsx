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
import StatsScreen from './stats';

import { useQuery } from '@tanstack/react-query';
import * as UserRepository from '../../lib/repositories/userRepository';

export type RootDrawerParamList = {
  index: undefined;
  stats: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function CustomDrawerContent(props: any) {
  const colorScheme = useColorScheme();
  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isErrorUser,
  } = useQuery({
    queryKey: ['user', 1], 
    queryFn: () => UserRepository.getUserById(1),
  });

  const getUserName = () => {
    if (isLoadingUser) return <ActivityIndicator size="small" />;
    if (isErrorUser || !user) return 'Kullanıcı Bulunamadı';
    return user.name ?? 'İsimsiz Kullanıcı'; 
  };

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
          Versiyon: {Application.nativeApplicationVersion ?? '?.?.?'}
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