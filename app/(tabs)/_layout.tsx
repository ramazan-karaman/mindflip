import { createDrawerNavigator } from '@react-navigation/drawer';
import IndexScreen from './index';
import StatsScreen from './stats';

const Drawer = createDrawerNavigator();

export default function DrawerLayout() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#2196F3',
      }}
    >
      <Drawer.Screen
        name="index"
        component={IndexScreen}
        options={{ title: "Anasayfa" }}
      />
      <Drawer.Screen
        name="stats"
        component={StatsScreen}
        options={{ title: "İstatistikler" }}
      />
    </Drawer.Navigator>
  );
}
