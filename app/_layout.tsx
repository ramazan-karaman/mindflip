import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Sadece veritabanı başlatma importu kaldı.
// Sync servisleri kaldırıldı.
import { initializeDatabase } from '../lib/db';
import Splash from './splash';

export const unstable_settings = {
  anchor: '(drawer)',
};

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Sadece yerel veritabanını başlatıyoruz
        await initializeDatabase();
        console.log("Database (Offline) başarıyla başlatıldı.");
      } catch (error) {
        console.error("Database başlatılırken hata oluştu:", error);
        // Hata olsa bile uygulamayı açmaya çalışalım (Splash'te takılmasın)
      } finally {
        // UI render edilmeye hazır
        setIsReady(true); //burası açılacak
      }
    };

    initializeApp();
  }, []);

  // Veritabanı hazır olana kadar Splash ekranını göster
  if (!isReady) {
    return <Splash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Popup Menu (Deste seçenekleri için) Sağlayıcısı */}
      <MenuProvider>
        {/* Tema (Dark/Light) Sağlayıcısı */}
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* React Query (Veri Yönetimi) Sağlayıcısı */}
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
                options={{ title: 'Eşleştirme'}} // Oyun ekranlarında header kapatılabilir
              />
              <Stack.Screen
                name="pratik/truefalse"
                options={{ title: 'Doğru / Yanlış'}}
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

            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </QueryClientProvider>
        </ThemeProvider>
      </MenuProvider>
    </GestureHandlerRootView>
  );
}