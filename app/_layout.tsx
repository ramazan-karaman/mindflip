import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { MenuProvider } from 'react-native-popup-menu';
import 'react-native-reanimated';
import { createTables, getDBConnection } from '../components/db';
import Splash from './splash';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme(); // kullanıcının temasına uyum
  const [showSplash, setShowSplash]= useState(true);

  useEffect(()=>{
    const initializeDB = async()=>{
      try{
        const db = await getDBConnection();
        await createTables(db);
        console.log("Database başarıyla oluşturuldu veya zaten mevcut.");
      }catch(error){
        console.error("Database oluşturulurken hata oluştu:", error);
      }
    };
    initializeDB();
  },[]); // sadece bir kez çalışır

  useEffect(()=>{
    const timeout = setTimeout(() => setShowSplash(false), 1800);
    },[]);

  if(showSplash){
    return <Splash/>; 
  }


  return (
  <MenuProvider>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  </MenuProvider>
  );
}
