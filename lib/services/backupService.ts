import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

const DB_NAME = 'mindflip.db';

// DÜZELTME: TypeScript'in "Property does not exist" hatasını aşmak için
// modülü (any) olarak işaretleyip özelliklere erişiyoruz.
const docDir = (FileSystem as any).documentDirectory || '';
const cacheDir = (FileSystem as any).cacheDirectory || '';

// Expo SQLite veritabanı genelde şu yolda durur:
const DB_DIR = docDir + 'SQLite/';
const DB_PATH = DB_DIR + DB_NAME;

// Yedeğin geçici olarak kopyalanacağı yer
const BACKUP_PATH = cacheDir + 'mindflip_backup.db';

export const exportBackup = async () => {
  // Web veya dizin bulunamama kontrolü
  if (Platform.OS === 'web' || !docDir || !cacheDir) {
    Alert.alert('Uyarı', 'Bu özellik web tarayıcısında kullanılamaz.');
    return;
  }

  try {
    // 1. Veritabanı dosyası var mı kontrol et
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!dbInfo.exists) {
      Alert.alert('Hata', 'Yedeklenecek veritabanı bulunamadı. (Uygulamayı hiç kullandınız mı?)');
      return;
    }

    // 2. Paylaşılabilir olup olmadığını kontrol et
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Hata', 'Paylaşım özelliği bu cihazda kullanılamıyor.');
      return;
    }

    // 3. Dosyayı geçici klasöre kopyala
    await FileSystem.copyAsync({
      from: DB_PATH,
      to: BACKUP_PATH,
    });

    // 4. Paylaşım pencresini aç
    await Sharing.shareAsync(BACKUP_PATH, {
      dialogTitle: 'MindFlip Yedeğini Kaydet',
      mimeType: 'application/x-sqlite3',
      UTI: 'public.database', // iOS için
    });

  } catch (error) {
    console.error('Yedekleme hatası:', error);
    Alert.alert('Hata', 'Yedekleme sırasında bir sorun oluştu.');
  }
};