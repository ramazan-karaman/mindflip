import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initializeDatabase } from '../lib/db';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import Splash from './splash';

export const unstable_settings = {
  anchor: '(drawer)',
};

const queryClient = new QueryClient();

 function RootLayoutNav() {
  
  const { theme, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeDatabase();
        console.log("Database (Offline) başarıyla başlatıldı.");
      } catch (error) {
        console.error("Database başlatılırken hata oluştu:", error);
      } finally {
        // UI render edilmeye hazır
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return <Splash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Popup Menu (Deste seçenekleri için) Sağlayıcısı */}
      <MenuProvider>
        {/* Tema (Dark/Light) Sağlayıcısı */}
        <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* React Query (Veri Yönetimi) Sağlayıcısı */}
          <QueryClientProvider client={queryClient}>

            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: theme === 'dark' ? '#1c1c1e' : '#ffffff',
                },
                headerTintColor: theme === 'dark' ? '#ffffff' : '#000000',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerBackTitle: '', // iOS'te geri butonunda yazı yazmasın
              }}
            >
              {/* Ana Çekmece (Drawer) Navigasyonu */}
              <Stack.Screen name="(drawer)" options={{ headerShown: false }} />

              {/* Modal Ekranlar */}
              <Stack.Screen
                name="addcard"
                options={{ presentation: 'modal', title: 'Yeni Kart Ekle' }}
              />
              <Stack.Screen
                name="editDeck"
                options={{ presentation: 'modal', title: 'Desteyi Düzenle' }}
              />

              {/* Normal Ekranlar */}
              <Stack.Screen
                name="practice"
                options={{ title: 'Pratik Seçenekleri' }}
              />

              {/* Pratik Modları */}
              <Stack.Screen
                name="pratik/classic"
                options={{ title: 'Klasik Pratik' }}
              />
              <Stack.Screen
                name="pratik/match"
                options={{ title: 'Eşleştirme' }}
              />
              <Stack.Screen
                name="pratik/truefalse"
                options={{ title: 'Doğru / Yanlış' }}
              />
              <Stack.Screen
                name="pratik/write"
                options={{ title: 'Yazma Pratiği' }}
              />
              <Stack.Screen
                name="pratik/multiple"
                options={{ title: 'Çoktan Seçmeli' }}
              />
              <Stack.Screen
                name="pratik/random"
                options={{ title: 'Rastgele' }}
              />

              <Stack.Screen
                name="library"
                options={{ title: 'Kütüphane', headerShown: false }}
              />
              
            </Stack>

            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          </QueryClientProvider>
        </NavigationThemeProvider>
      </MenuProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}
