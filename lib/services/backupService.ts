import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  readAsStringAsync,
  StorageAccessFramework // <-- Android'in Sihirli Anahtarı
  ,

  writeAsStringAsync
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { db } from '../db';
import { Card, Deck, Practice, Statistic, User } from '../types';

interface BackupData {
  version: number;
  timestamp: string;
  data: {
    users: User[];
    decks: Deck[];
    cards: Card[];
    statistics: Statistic[];
    practices: Practice[];
  };
}

/**
 * 📤 YEDEK AL (EXPORT)
 * Android: Klasör seçtirir ve kaydeder.
 * iOS: Paylaşım menüsünü açar (Dosyalara kaydetmek için).
 */
export const exportDatabase = async () => {
  try {
    console.log("📤 Veriler hazırlanıyor...");
    
    // 1. Verileri Çek
    const users = await db.getAllAsync<User>('SELECT * FROM users');
    const decks = await db.getAllAsync<Deck>('SELECT * FROM decks WHERE sync_status != "pending_delete"');
    const cards = await db.getAllAsync<Card>('SELECT * FROM cards WHERE sync_status != "pending_delete"');
    const statistics = await db.getAllAsync<Statistic>('SELECT * FROM statistics');
    const practices = await db.getAllAsync<Practice>('SELECT * FROM practices');

    // 2. JSON Objesini Oluştur
    const backupData: BackupData = {
      version: 1, // Lite versiyon (Resimsiz)
      timestamp: new Date().toISOString(),
      data: { users, decks, cards, statistics, practices }
    };

    const jsonString = JSON.stringify(backupData, null, 2); 
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `mindflip_backup_${dateStr}.mindflip`; 

    // --- SENARYO A: ANDROID (Klasör Seç ve Kaydet) ---
    if (Platform.OS === 'android') {
      // 1. İzin İste ve Klasör Seçtir
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        // 2. Seçilen klasörün adresini (URI) al
        const directoryUri = permissions.directoryUri;

        // 3. Dosyayı orada oluştur (MimeType: application/json)
        // Not: Eğer aynı isimde dosya varsa Android otomatik sonuna (1) ekler.
        const newFileUri = await StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          'application/octet-stream' 
        );

        // 4. İçeriği Yaz
        await writeAsStringAsync(newFileUri, jsonString, { encoding: 'utf8' });

        Alert.alert('Başarılı', 'Yedek dosyası seçtiğiniz klasöre başarıyla kaydedildi.');
      } else {
        // Kullanıcı klasör seçmeden geri çıktı
        // Alert.alert('İptal', 'Klasör seçilmedi.');
      }
    } 
    
    // --- SENARYO B: IOS (Paylaş Menüsü) ---
    else {
      // iOS için önce Cache'e yazmamız lazım
      const cacheDir = (FileSystem as any).cacheDirectory;
      if (!cacheDir) {
          Alert.alert("Hata", "Önbellek dizini bulunamadı.");
          return;
      }
      
      const filePath = `${cacheDir}${fileName}`;
      await writeAsStringAsync(filePath, jsonString, { encoding: 'utf8' });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Hata', 'Paylaşım desteklenmiyor.');
        return;
      }

      await Sharing.shareAsync(filePath, {
        dialogTitle: 'Yedeği Kaydet',
        UTI: 'com.blackman47.mindflip.backup' // iOS için dosya tipi
      });
    }

  } catch (error: any) {
    console.error('Export Hatası:', error);
    Alert.alert('Hata', `Yedekleme başarısız: ${error.message}`);
  }
};

/**
 * 📥 YEDEKTEN DÖN (IMPORT)
 */
export const importDatabase = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', 
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const fileUri = result.assets[0].uri;
    const fileName = result.assets[0].name;

    // Sıkı Kontrol
    if (!fileName.toLowerCase().endsWith('.mindflip')) {
      Alert.alert('Geçersiz Dosya', 'Lütfen geçerli bir MindFlip (.mindflip) yedek dosyası seçin.');
      return;
    }

    await importDatabaseFromUrl(fileUri);

  } catch (error) {
    Alert.alert('Hata', 'Dosya seçilemedi.');
  }
};

/**
 * 🔗 URL/URI ÜZERİNDEN YÜKLEME
 */
export const importDatabaseFromUrl = async (fileUri: string) => {
    Alert.alert(
      'Yedeği Yükle',
      'Mevcut veriler silinecek ve yedek dosyasındaki veriler yüklenecektir. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'YÜKLE',
          style: 'destructive',
          onPress: async () => await performRestore(fileUri)
        },
      ]
    );
};

const performRestore = async (fileUri: string) => {
  try {
    console.log("📥 Geri yükleme başlıyor...");
    const jsonString = await readAsStringAsync(fileUri, { encoding: 'utf8' });
    const backupData: BackupData = JSON.parse(jsonString);

    if (!backupData.data || !backupData.data.decks) throw new Error("Geçersiz yedek dosyası.");

    const now = new Date().toISOString();

    await db.execAsync('BEGIN TRANSACTION;');

    await db.execAsync(`
      DELETE FROM cards;
      DELETE FROM decks;
      DELETE FROM practices;
      DELETE FROM statistics;
    `);

    // --- VERİLERİ YAZ (SYNC: PENDING_UPDATE) ---

    // Decks
    for (const d of backupData.data.decks) {
      await db.runAsync(
        `INSERT OR REPLACE INTO decks (id, cloud_id, user_id, name, description, goal, created_at, last_modified, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_update')`,
        [d.id, d.cloud_id, d.user_id, d.name, d.description, d.goal, d.created_at, now]
      );
    }

    // Cards
    for (const c of backupData.data.cards) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cards (id, cloud_id, deck_id, front_word, front_image, back_word, back_image, rating, interval, ease_factor, next_review, created_at, last_modified, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_update')`,
        [c.id, c.cloud_id, c.deck_id, c.front_word, c.front_image, c.back_word, c.back_image, c.rating, c.interval, c.ease_factor, c.next_review, c.created_at, now]
      );
    }

    // Statistics
    for (const s of backupData.data.statistics) {
       await db.runAsync(
        `INSERT OR REPLACE INTO statistics (id, cloud_id, user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate, last_modified, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_update')`,
        [s.id, s.cloud_id, s.user_id, s.date, s.studied_card_count, s.added_card_count, s.learned_card_count, s.spent_time, s.practice_success_rate, s.deck_success_rate, now]
       );
    }
    
    // Practices
    for (const p of backupData.data.practices) {
        await db.runAsync(
            `INSERT OR REPLACE INTO practices (id, cloud_id, user_id, deck_id, date, duration, success_rate, last_modified, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_update')`,
            [p.id, p.cloud_id, p.user_id, p.deck_id, p.date, p.duration, p.success_rate, now]
        );
    }

    await db.execAsync('COMMIT;');
    Alert.alert('Başarılı', 'Yedek yüklendi! Verilerin buluta gönderilmesi için lütfen Ayarlar menüsünden "Şimdi Eşitle" butonuna basın.', [{ text: 'Tamam' }]);

  } catch (error: any) {
    try { await db.execAsync('ROLLBACK;'); } catch {}
    console.error('Restore Hatası:', error);
    Alert.alert('Hata', `Dosya yüklenemedi: ${error.message}`);
  }
};