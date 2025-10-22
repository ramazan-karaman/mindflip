import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import * as Application from 'expo-application';
import { Image, StyleSheet, Text, useColorScheme, View } from 'react-native';
import IndexScreen from './index';
import StatsScreen from './stats';

export type RootDrawerParamList = {
  index: undefined;
  stats: undefined;
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

function CustomDrawerContent(props: any) {
  const colorScheme = useColorScheme(); // 1. Cihazın temasını al (light/dark)

  // 2. Temaya göre dinamik stil objeleri oluştur
  const headerStyles = {
    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
  };
  const profileNameStyles = {
    color: colorScheme === 'dark' ? '#fff' : '#333',
  };
  const menuContainerStyles = {
    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
  };


  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* 3. ARKA PLAN KALDIRILDI, temaya göre renk alan sade bir View kullanıldı */}
        <View style={[styles.headerContainer, headerStyles]}>
          <View style={styles.profileContainer}>
              <Image 
                  source={require('../../assets/images/mindfliplogo.png')}
                  style={styles.profileImage}
              />
              <Text style={[styles.profileName, profileNameStyles]}>Kullanıcı Adı</Text>
          </View>
        </View>

        {/* Menü Öğeleri */}
        <View style={[styles.menuItemsContainer, menuContainerStyles]}>
            <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Footer Alanı */}
      <View style={[styles.footerContainer, menuContainerStyles]}>
        <Text style={styles.versionText}>
          Versiyon: {Application.nativeApplicationVersion}
        </Text>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#2196F3',
        drawerInactiveTintColor: '#555',
        drawerLabelStyle: {
          marginLeft: -10,
          fontSize: 16,
        }
      }}
    >
      <Drawer.Screen
        name="index"
        component={IndexScreen}
        options={{
          title: "Anasayfa",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          )
        }}
      />
      <Drawer.Screen
        name="stats"
        component={StatsScreen}
        options={{
          title: "İstatistikler",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          )
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
    logo: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
        marginBottom: 15,
    },
    profileContainer: {
        alignItems: 'center',
    },
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#2196F3', // Kenarlık rengini belirginleştirdik
    },
    profileName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    },
    menuItemsContainer: {
        flex: 1,
        paddingTop: 10,
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    versionText: {
        textAlign: 'center',
        color: '#aaa',
        fontSize: 12,
    }
});
