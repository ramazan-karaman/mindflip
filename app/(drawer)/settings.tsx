import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { clearDatabase } from '../../lib/db';
import * as UserRepository from '../../lib/repositories/userRepository';
import { exportDatabase, importDatabase } from '../../lib/services/backupService';
import { runFullSync } from '../../lib/services/syncService';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const users = await UserRepository.getUsers();
      return users[0] ?? null;
    },
  });

  // 1. GÜVENLİ ÇIKIŞ YAPMA
  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Çıkış yapmadan önce verileriniz son kez eşitlenecektir.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            // 1. UI Kilitle (Kullanıcı işlem yapamasın)
            setIsBusy(true);
            
            try {
              // 2. SYNC (Hata olsa bile devam etmeli mi? Evet, çıkışı engellemeyelim)
              setBusyMessage("Veriler yedekleniyor...");
              try {
                await runFullSync();
              } catch (syncError) {
                console.error("Logout Sync Hatası:", syncError);
                // Sync hatası olsa bile çıkışa izin veriyoruz (Kullanıcı hapsolmasın)
              }

              // 3. YEREL VERİYİ SİL (Hala oturum açıkken)
              // signOut tetiklenmeden önce temizlik bitmiş oluyor.
              setBusyMessage("Cihaz temizleniyor...");
              await clearDatabase();
              
              // 4. OTURUMU KAPAT
              setBusyMessage("Oturum kapatılıyor...");
              await supabase.auth.signOut();

            } catch (error) {
              Alert.alert("Hata", "Çıkış yapılırken bir sorun oluştu.");
              setIsBusy(false); // Sadece hata olursa kilidi aç
            }
          }
        }
      ]
    );
  };

  // 2. GÜVENLİ HESAP SİLME
  const handleDeleteAccount = async () => {
    Alert.alert(
      "Hesabı Sil",
      "DİKKAT: Hesabınız, tüm verileriniz ve fotoğraflarınız KALICI OLARAK silinecektir. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "HESABI SİL",
          style: "destructive",
          onPress: async () => {
             setIsBusy(true);
             try {
                // 1. Kullanıcı Bilgisini Al (ID lazım)
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    setBusyMessage("Fotoğraflar temizleniyor...");
                    
                    // --- STORAGE TEMİZLİĞİ (DÖNGÜSEL) ---
                    // Supabase list() metodu varsayılan olarak 100 dosya getirir.
                    // Hepsini silmek için dosya kalmayana kadar döngü kuruyoruz.
                    while (true) {
                        const { data: files, error: listError } = await supabase
                            .storage
                            .from('card-images')
                            .list(user.id, { limit: 100 }); // Kullanıcının klasörü

                        if (listError) {
                            console.error("Listeme Hatası:", listError);
                            break;
                        }

                        if (!files || files.length === 0) {
                            console.log("Klasör boş veya silindi.");
                            break; // Dosya kalmadı, döngüden çık
                        }

                        // Silinecek yolları hazırla: "user_id/dosya_adi.jpg"
                        const filesToRemove = files.map(x => `${user.id}/${x.name}`);
                        
                        const { error: removeError } = await supabase
                            .storage
                            .from('card-images')
                            .remove(filesToRemove);
                            
                        if (removeError) {
                             console.error("Silme Hatası:", removeError);
                             break;
                        }
                    }
                    // -------------------------------------
                }

                setBusyMessage("Hesap siliniyor...");

                // 2. Veritabanından Sil (RPC)
                // Bu işlem Cascade ile kartları, desteleri ve istatistikleri de siler.
                const { error } = await supabase.rpc('delete_user');
                if (error) throw error;

                // 3. Yerel Temizlik
                setBusyMessage("Cihaz temizleniyor...");
                await clearDatabase();
                
                // 4. Çıkış
                await supabase.auth.signOut();

             } catch (error: any) {
                console.error(error);
                Alert.alert("Hata", "Hesap silinemedi: " + error.message);
                setIsBusy(false);
             }
          }
        }
      ]
    );
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await runFullSync();
    setIsSyncing(false);
    Alert.alert("Başarılı", "Senkronizasyon tamamlandı.");
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      
      {/* MEŞGULİYET MODALI (Ekranı Kilitler) */}
      <Modal visible={isBusy} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.modalText}>{busyMessage}</Text>
            </View>
        </View>
      </Modal>

      {/* PROFİL KARTI */}
      <View style={styles.profileCard}>
        <Image
          source={
            user?.profile_photo
              ? { uri: user.profile_photo }
              : require('../../assets/images/mindfliplogo.png')
          }
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name || 'Kullanıcı'}</Text>
          <Text style={styles.email}>{user?.email || 'e-posta yok'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yerel Yedekleme (Offline)</Text>
        
        <TouchableOpacity style={styles.item} onPress={exportDatabase}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2F1' }]}>
              <Ionicons name="download-outline" size={20} color="#009688" />
            </View>
            <Text style={styles.itemText}>Yedek Al (Dışa Aktar)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={importDatabase}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2F1' }]}>
              <Ionicons name="refresh-circle-outline" size={20} color="#009688" />
            </View>
            <Text style={styles.itemText}>Yedeği Geri Yükle</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>

      

      {/* AYARLAR */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        
        <TouchableOpacity style={styles.item} onPress={handleManualSync} disabled={isSyncing}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="sync" size={20} color="#2196F3" />
            </View>
            <Text style={styles.itemText}>Şimdi Eşitle</Text>
          </View>
          {isSyncing ? <ActivityIndicator size="small" color="#2196F3" /> : <Ionicons name="chevron-forward" size={20} color="#ccc" />}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama</Text>
        <View style={styles.item}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="moon" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.itemText}>Karanlık Mod</Text>
          </View>
          <Switch value={false} disabled /> 
        </View>
      </View>

      {/* TEHLİKELİ BÖLGE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Oturum</Text>
        
        <TouchableOpacity style={styles.item} onPress={handleLogout}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
            </View>
            <Text style={[styles.itemText, { color: '#D32F2F' }]}>Çıkış Yap</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={handleDeleteAccount}>
          <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            </View>
            <Text style={[styles.itemText, { color: '#D32F2F' }]}>Hesabımı Sil</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>MindFlip v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 10 },
  modalText: { marginTop: 15, fontSize: 16, fontWeight: 'bold', color: '#333' },

  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eee' },
  profileInfo: { marginLeft: 15 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#666', marginTop: 2 },

  section: { marginBottom: 25, backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#999', marginHorizontal: 20, marginTop: 15, marginBottom: 10, textTransform: 'uppercase' },
  
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemText: { fontSize: 16, color: '#333', fontWeight: '500' },

  version: { textAlign: 'center', color: '#ccc', marginBottom: 30, fontSize: 12 },
});