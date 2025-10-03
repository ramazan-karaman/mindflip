import { Ionicons } from '@expo/vector-icons'; // ikonlar için
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import CreateDeckScreen from './create-deck';
import IndexScreen from './index'; // Ana sayfa
import StatsScreen from './stats';

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#2196F3' : '#fff',
        },
        tabBarActiveTintColor: '#000000ff',
        tabBarInactiveTintColor: '#000000ff',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'create-deck') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'stats') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else {
            iconName = 'ellipse'; // fallback
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="index"
        component={IndexScreen}
        options={{ tabBarLabel: 'Anasayfa' }}
      />
      <Tab.Screen
        name="create-deck"
        component={CreateDeckScreen}
        options={{ tabBarLabel: 'Deste Oluştur' }}
      />
      <Tab.Screen
        name="stats"
        component={StatsScreen}
        options={{ tabBarLabel: 'İstatistik' }}
      />
    </Tab.Navigator>
  );
}
