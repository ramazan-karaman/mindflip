import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearDatabase } from '../../lib/db';
import { useTheme } from '../../lib/ThemeContext'; // Bizim hook

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { isDark, toggleTheme } = useTheme(); 

  const themeColors = {
    background: isDark ? '#000000' : '#F2F2F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#333333',
    subText: isDark ? '#AAAAAA' : '#666666',
    border: isDark ? '#2C2C2E' : '#E0E0E0',
    iconBg: isDark ? '#2C2C2E' : '#E3F2FD' 
  };

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildVersion = Application.nativeBuildVersion || '1';

  const handleContact = () => {
    Linking.openURL('mailto:krmn47rmzn@gmail.com?subject=MindFlip Destek');
  };

  const handlePrivacy = () => {
    Linking.openURL('https://github.com/ramazan-karaman'); 
  };

  const handleResetData = () => {
    Alert.alert(
      "Tüm Veriler Silinecek ⚠️",
      "Oluşturduğun tüm desteler, kartlar ve ilerlemelerin kalıcı olarak silinecek. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Evet, Hepsini Sil", 
          style: "destructive", 
          onPress: async () => {
            const success = await clearDatabase();
            if (success) {
              queryClient.invalidateQueries(); 
              queryClient.clear();
              Alert.alert("Başarılı", "Uygulama fabrika ayarlarına döndürüldü.");
              router.replace('/(drawer)');
            } else {
              Alert.alert("Hata", "Sıfırlama sırasında bir sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  // Liste Elemanı (Renkleri prop olarak alacak şekilde güncellendi)
  const SettingItem = ({ icon, title, value, onPress, isDestructive = false, hasSwitch = false, switchValue = false, onSwitchChange = () => {} }: any) => (
    <TouchableOpacity 
      style={[styles.itemContainer, { borderBottomColor: themeColors.border }]} 
      onPress={hasSwitch ? undefined : onPress}
      activeOpacity={hasSwitch ? 1 : 0.7}
    >
      <View style={styles.itemLeft}>
        <View style={[
            styles.iconBox, 
            { backgroundColor: isDestructive ? '#FFEBEE' : themeColors.iconBg }
        ]}>
          <Ionicons name={icon} size={20} color={isDestructive ? '#D32F2F' : '#2196F3'} />
        </View>
        <Text style={[
            styles.itemText, 
            { color: isDestructive ? '#D32F2F' : themeColors.text }
        ]}>{title}</Text>
      </View>

      <View style={styles.itemRight}>
        {hasSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange}
            trackColor={{ false: "#767577", true: "#2196F3" }}
          />
        ) : (
          <>
            {value && <Text style={[styles.valueText, { color: themeColors.subText }]}>{value}</Text>}
            <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* BÖLÜM 1: GENEL */}
        <Text style={[styles.sectionTitle, { color: themeColors.subText }]}>GENEL</Text>
        <View style={[styles.sectionContainer, { backgroundColor: themeColors.card }]}>
          <SettingItem 
            icon="moon" 
            title="Karanlık Mod" 
            hasSwitch 
            switchValue={isDark} // Context'ten gelen değer
            onSwitchChange={toggleTheme} // Context'teki fonksiyon (Toggle)
          />
        </View>

        {/* BÖLÜM 2: DESTEK & HUKUKİ */}
        <Text style={[styles.sectionTitle, { color: themeColors.subText }]}>DESTEK</Text>
        <View style={[styles.sectionContainer, { backgroundColor: themeColors.card }]}>
          <SettingItem icon="mail" title="Bize Ulaşın" onPress={handleContact} />
          <SettingItem icon="shield-checkmark" title="Gizlilik Politikası" onPress={handlePrivacy} />
          <SettingItem icon="document-text" title="Kullanım Koşulları" onPress={handlePrivacy} />
        </View>

        {/* BÖLÜM 3: VERİ YÖNETİMİ */}
        <Text style={[styles.sectionTitle, { color: themeColors.subText }]}>VERİ</Text>
        <View style={[styles.sectionContainer, { backgroundColor: themeColors.card }]}>
           <SettingItem 
            icon="trash-bin" 
            title="Tüm Verileri Sıfırla" 
            isDestructive 
            onPress={handleResetData} 
          />
        </View>

        {/* BÖLÜM 4: HAKKINDA */}
        <View style={styles.aboutContainer}>
            <Text style={[styles.appName, { color: themeColors.text }]}>MindFlip</Text>
            <Text style={[styles.versionText, { color: themeColors.subText }]}>v{appVersion} (Build {buildVersion})</Text>
            <Text style={[styles.copyright, { color: themeColors.subText }]}>BLACKMAN SOFTWARE 👑</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  
  sectionTitle: {
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 8,
    marginTop: 16,
    fontWeight: '600'
  },
  sectionContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 32, height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: { fontSize: 16, fontWeight: '500' },
  
  itemRight: { flexDirection: 'row', alignItems: 'center' },
  valueText: { marginRight: 8, fontSize: 14 },
  
  aboutContainer: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  appName: { fontSize: 18, fontWeight: 'bold' },
  versionText: { marginTop: 4 },
  copyright: { fontSize: 12, marginTop: 8 }
});