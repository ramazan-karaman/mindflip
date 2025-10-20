import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';
import { initializeDatabase } from '../lib/db';
import Splash from './splash';

export const unstable_settings = {
  anchor: '(drawer)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme(); // kullanıcının temasına uyum
  const [isReady, setIsReady]= useState(false);

  useEffect(()=>{
    const initializeDB = async()=>{
      try{
        await initializeDatabase();
        console.log("Database başarıyla oluşturuldu veya zaten mevcut.");
      }catch(error){
        console.error("Database oluşturulurken hata oluştu:", error);
      } finally{
        setIsReady(true);
      }
    };
    initializeDB();
  },[]); // sadece bir kez çalışır


  if(!isReady){
    return <Splash/>; 
  }


  return (
  <MenuProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen 
            name="addcard" options={{ presentation: 'modal', title: 'Yeni Kart Ekle' }} />
        <Stack.Screen name="editDeck" options={{ presentation: 'modal', title: 'Desteyi Düzenle' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  </MenuProvider>
  );
}
