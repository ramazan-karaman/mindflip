import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnlineManager } from '../hooks/useOnlineManager';
import { initializeDatabase } from '../lib/db';
import {
  checkHasPendingChanges,
  runFullSync,
} from '../lib/services/syncService';

import Splash from './splash';

export const unstable_settings = {
  anchor: '(drawer)',
};
const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useOnlineManager();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeDatabase();
        console.log("Database başarıyla oluşturuldu veya zaten mevcut.");
      } catch (error) {
        console.error("Database oluşturulurken hata oluştu:", error);
      } finally {
        setIsReady(true);

        console.log(
          "Uygulama hazır (UI gösterildi), arka planda senkronizasyon tetikleniyor."
        );
        checkHasPendingChanges();
        runFullSync();
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return <Splash />;
  }

  return (
    <MenuProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
              headerBackTitle: '',
            }}
          >
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen
              name="addcard"
              options={{ presentation: 'modal', title: 'Yeni Kart Ekle' }}
            />
            <Stack.Screen
              name="editDeck"
              options={{ presentation: 'modal', title: 'Desteyi Düzenle' }}
            />
            <Stack.Screen
              name="practice"
              options={{ title: 'Pratik Seçenekleri' }}
            />
            <Stack.Screen
              name="pratik/classic"
              options={{ title: 'Klasik Pratik' }}
            />
          </Stack>

          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </QueryClientProvider>
      </ThemeProvider>
    </MenuProvider>
  );
}