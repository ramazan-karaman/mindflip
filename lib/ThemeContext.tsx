// lib/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

// Kullanıcının seçebileceği 3 seçenek
export type ThemeOption = 'system' | 'light' | 'dark';

// Uygulamanın o anki fiziksel görünümü (Sadece 2 ihtimal olabilir)
type ActualTheme = 'light' | 'dark';

interface ThemeContextType {
  themeOption: ThemeOption;           // Seçilen Ayar (Sistem/Açık/Koyu)
  setThemeOption: (option: ThemeOption) => void; // Ayarı değiştirme fonksiyonu
  theme: ActualTheme;                 // Sonuç Tema (Ekrana ne basılacak?)
  isDark: boolean;                    // Sonuç Bool (Ekrana ne basılacak?)
  toggleTheme: () => void;            // (Eski uyumluluk için - Şimdilik Light/Dark arası gezer)
}

const ThemeContext = createContext<ThemeContextType>({
  themeOption: 'system',
  setThemeOption: () => {},
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceScheme = useDeviceColorScheme(); // Telefonun anlık teması (değişirse tetiklenir)
  
  // State artık sadece 'light'/'dark' değil, 'system'i de tutuyor
  const [themeOption, setThemeOptionState] = useState<ThemeOption>('system');

  // --- 1. Başlangıçta Kayıtlı Ayarı Oku ---
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user_theme_preference');
        if (savedTheme) {
          // Kayıtlı bir tercih varsa onu yükle (system, light veya dark)
          setThemeOptionState(savedTheme as ThemeOption);
        }
      } catch (error) {
        console.log('Tema tercihi yüklenemedi', error);
      }
    };
    loadTheme();
  }, []);

  // --- 2. Ayarı Değiştirme ve Kaydetme Fonksiyonu ---
  const setThemeOption = async (option: ThemeOption) => {
    setThemeOptionState(option); // State'i güncelle
    try {
      await AsyncStorage.setItem('user_theme_preference', option); // Hafızaya yaz
    } catch (error) {
      console.log('Tema tercihi kaydedilemedi', error);
    }
  };

  // --- 3. Hesaplama Motoru (En Önemli Kısım) ---
  // Kullanıcı 'system' dediyse telefonun ayarına bak, yoksa kullanıcının seçimine bak.
  const activeTheme: ActualTheme = 
    themeOption === 'system' 
      ? (deviceScheme === 'dark' ? 'dark' : 'light') 
      : themeOption;

  const isDark = activeTheme === 'dark';

  // --- 4. Eski toggleTheme (Settings sayfası güncellenene kadar geçici köprü) ---
  // Bu fonksiyon çağrıldığında 'system' modundan çıkarıp manuel moda zorlar.
  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setThemeOption(nextTheme);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        themeOption, 
        setThemeOption, 
        theme: activeTheme, // Diğer sayfalar burayı okur, değişen bir şey yok
        isDark,             // Diğer sayfalar burayı okur, değişen bir şey yok
        toggleTheme 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);