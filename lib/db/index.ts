import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Web ortamında patlamaması için Mock yapı (Geliştirme süreci güvenliği için)
function createWebDatabaseMock() {
  console.log("Web platformunda database işlemleri mocklandı (Offline Mod).");
  return {
    execAsync: () => Promise.resolve(),
    getFirstAsync: <T>() => Promise.resolve(null as T | null),
    getAllAsync: <T>() => Promise.resolve([] as T[]),
    runAsync: () => Promise.resolve({ lastInsertRowId: 0, changes: 0 }),
  };
}

function openDatabase() {
  if (Platform.OS === "web") {
    return createWebDatabaseMock() as unknown as SQLite.SQLiteDatabase;
  }
  
  // Veritabanı dosya ismini aynı tutuyoruz
  const db = SQLite.openDatabaseSync("mindflip.db");
  console.log("Veritabanı bağlantısı başarılı: mindflip.db");
  return db;
}

export const db = openDatabase();

export const initializeDatabase = async () => {
  try {
    // WAL Modu: Performans için (Yazma/Okuma çakışmasını azaltır)
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    
    // Foreign Key desteğini açıyoruz (Cascade silme işlemleri için kritik)
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
    
    await db.execAsync(`
      -- DESTELER TABLOSU (Sadeleştirildi)
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, 
        description TEXT, 
        goal INTEGER DEFAULT 5, 
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- KARTLAR TABLOSU (SRS Verileri ve İçerik)
      -- user_id, cloud_id, sync_status YOK.
      -- interval, easeFactor, nextReview VAR (SRS Algoritması için)
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        deck_id INTEGER NOT NULL, 
        front_word TEXT NOT NULL, 
        front_image TEXT, 
        back_word TEXT NOT NULL, 
        back_image TEXT, 
        created_at TEXT DEFAULT (datetime('now')),
        
        -- SRS (SuperMemo-2) Alanları
        interval REAL DEFAULT 1,
        easeFactor REAL DEFAULT 2.5,
        nextReview TEXT, 
        
        -- Deste silinirse kartlar da silinsin
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );

      -- İSTATİSTİKLER TABLOSU
      -- user_id kaldırıldı. Cihazdaki genel istatistikleri tutar.
      CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        date TEXT, 
        studied_card_count INTEGER DEFAULT 0, 
        added_card_count INTEGER DEFAULT 0, 
        learned_card_count INTEGER DEFAULT 0, 
        spent_time INTEGER DEFAULT 0, 
        practice_success_rate REAL, 
        deck_success_rate REAL
      );

      -- PRATİK GEÇMİŞİ TABLOSU
      -- Hangi desteye ne zaman çalışıldı?
      CREATE TABLE IF NOT EXISTS practices (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        deck_id INTEGER, 
        date TEXT, 
        duration INTEGER, 
        success_rate REAL, 
        
        -- Deste silinirse ona ait geçmiş pratik kayıtları da silinsin
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    console.log("Veritabanı tabloları (Offline-First) başarıyla kontrol edildi/oluşturuldu.");
  } catch (error) {
    console.error("Veritabanı başlatılırken kritik hata:", error);
    throw error;
  }
};