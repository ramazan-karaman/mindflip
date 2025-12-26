import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import * as Application from 'expo-application';
import { Drawer } from 'expo-router/drawer'; // ÖNEMLİ: Expo Router Drawer'ı
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

// Custom Drawer İçeriği (Profil resmi, menü, versiyon vb.)
function CustomDrawerContent(props: any) {
  const { isDark } = useTheme();


  const headerStyles = { backgroundColor: isDark  ? '#000' : '#fff' };
  const profileNameStyles = { color: isDark ? '#fff' : '#333' };
  const menuContainerStyles = { backgroundColor: isDark ? '#000' : '#fff' };
  const footerBorderStyles = { borderTopColor: isDark ? '#333' : '#eee' };
  const versionTextStyles = { color: isDark ? '#555' : '#aaa' };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Header Alanı */}
        <View style={[styles.headerContainer, headerStyles]}>
          <View style={styles.profileContainer}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.profileImage}
            />
            <Text style={[styles.profileName, profileNameStyles]}>MindFlip</Text>
          </View>
        </View>

        {/* Menü Elemanları */}
        <View style={[styles.menuItemsContainer, menuContainerStyles]}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Footer (Versiyon) */}
      <View style={[styles.footerContainer, menuContainerStyles, footerBorderStyles]}>
        <Text style={[styles.versionText, versionTextStyles]}>
          Versiyon: {Application.nativeApplicationVersion ?? '1.0.0'}
        </Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const { isDark } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: isDark ? '#999' : '#555',
        drawerLabelStyle: { marginLeft: -5, fontSize: 16 },
        drawerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Anasayfa',
          title: 'MindFlip',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="stats"
        options={{
          drawerLabel: 'İstatistikler',
          title: 'İstatistikler',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />

      <Drawer.Screen
        name="settings" // Dosya adı: settings.tsx
        options={{
          drawerLabel: 'Ayarlar',
          title: 'Ayarlar',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
      
    </Drawer>
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