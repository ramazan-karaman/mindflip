import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';

import { Session } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useOnlineManager } from '../hooks/useOnlineManager';
import { initializeDatabase } from '../lib/db';
import { importDatabaseFromUrl } from '../lib/services/backupService';
import { checkHasPendingChanges, ensureLocalUserExists, runFullSync } from '../lib/services/syncService';
import { supabase } from '../lib/supabase';



import Splash from './splash';

export const unstable_settings = {
  anchor: '(drawer)',
};
const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  
  const segments = useSegments();
  const router = useRouter();

  useOnlineManager();

  // 1. Veritabanı ve Oturum Kontrolü
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeDatabase();
        console.log("Database hazır.");
        
        // Mevcut oturumu al
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
            await ensureLocalUserExists();
        }

      } catch (error) {
        console.error("Başlatma hatası:", error);
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();

    // Oturum değişikliklerini dinle (Login/Logout anında tetiklenir)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async(_event, session) => {
      setSession(session);
      if (session) {
        // Kullanıcı giriş yaptıysa senkronizasyonu başlat
        await ensureLocalUserExists();
        checkHasPendingChanges();
        runFullSync();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Yönlendirme Mantığı (Auth Guard)
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'login'; // Login ekranında mıyız?
    
    if (session && inAuthGroup) {
      router.replace('/(drawer)');
    } else if (!session && !inAuthGroup) {
      router.replace('/login');
    }
  }, [session, segments, isReady]);

  useEffect(() => {
  const handleDeepLink = async (event: { url: string }) => {
    const url = event.url;
    // Dosya uzantısı kontrolü
    if (url && (url.endsWith('.mindflip') || url.includes('mindflip'))) {
       await importDatabaseFromUrl(url);
    }
  };

  // Uygulama açıksa dinle
  const subscription = Linking.addEventListener('url', handleDeepLink);

  // Uygulama kapalıyken açıldıysa (Cold Start)
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink({ url });
  });

  return () => subscription.remove();
}, []);

  if (!isReady) {
    return <Splash />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <QueryClientProvider client={queryClient}>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
                },
                headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
                headerTitleStyle: { fontWeight: 'bold' },
                headerBackTitle: '',
              }}
            >
              {/* Giriş yapmış kullanıcılar için */}
              <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
              
              {/* Giriş ekranı (Header yok) */}
              <Stack.Screen name="login" options={{ headerShown: false }} />

              {/* Diğer Alt Sayfalar */}
              <Stack.Screen name="addcard" options={{ presentation: 'modal', title: 'Yeni Kart Ekle' }} />
              <Stack.Screen name="editDeck" options={{ presentation: 'modal', title: 'Desteyi Düzenle' }} />
              <Stack.Screen name="practice" options={{ title: 'Pratik Seçenekleri' }} />
              
              {/* Oyun Modları */}
              <Stack.Screen name="pratik/classic" options={{ title: 'Klasik Pratik' }} />
              <Stack.Screen name="pratik/match" options={{ title: 'Eşleştirme', headerShown: false }} />
              <Stack.Screen name="pratik/truefalse" options={{ title: 'Doğru / Yanlış', headerShown: false }} />
              <Stack.Screen name="pratik/multiple" options={{ title: 'Çoktan Seçmeli' }} />
              <Stack.Screen name="pratik/write" options={{ title: 'Yazma Pratiği' }} />

            </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </QueryClientProvider>
        </ThemeProvider>
      </MenuProvider>
    </GestureHandlerRootView>
  );
}