import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// Web ortamında patlamaması için Mock yapı
function createWebDatabaseMock() {
  console.log("Web platformunda database işlemleri mocklandı.");
  return {
    execAsync: () => Promise.resolve(),
    getFirstAsync: <T>() => Promise.resolve(null as T | null),
    getAllAsync: <T>() => Promise.resolve([] as T[]),
    runAsync: () => Promise.resolve({ lastInsertRowId: 0, changes: 0 }),
  } as unknown as SQLite.SQLiteDatabase;
}

// Veritabanını açma fonksiyonu
function openDatabase() {
  if (Platform.OS === "web") {
    return createWebDatabaseMock();
  }
  
  // 'openDatabaseSync' modern Expo sürümlerinde senkron açılış için önerilir
  const db = SQLite.openDatabaseSync("mindflip.db");
  console.log("Veritabanı bağlantısı başarılı: mindflip.db");
  return db;
}

export const db = openDatabase();

export const initializeDatabase = async () => {
  try {
    // 1. AYARLAR: Performans ve Veri Bütünlüğü
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    await db.execAsync(`PRAGMA foreign_keys = ON;`);

    // 3. TABLO OLUŞTURMA (Schema Creation)

    // --- A. DESTELER (DECKS) ---
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, 
        description TEXT, 
        goal INTEGER DEFAULT 5, -- Günlük hedef (Varsayılan 5)
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // --- B. KARTLAR (CARDS) ---
    // SRS Algoritması için gerekli tüm alanlar eklendi.
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        deck_id INTEGER NOT NULL, 
        
        -- İçerik
        front_word TEXT NOT NULL, 
        front_image TEXT, 
        back_word TEXT NOT NULL, 
        back_image TEXT, 
        created_at TEXT DEFAULT (datetime('now')),
        
        -- SRS (SuperMemo-2) Verileri
        box INTEGER DEFAULT 0,       -- Leitner Kutusu (0: Yeni, 1-5: Öğreniliyor)
        interval INTEGER DEFAULT 0,  -- Gün aralığı
        easeFactor REAL DEFAULT 2.5, -- Kolaylık katsayısı
        nextReview TEXT,             -- Bir sonraki tekrar tarihi (ISO String)
        
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    // --- C. PRATİK GEÇMİŞİ (PRACTICES) ---
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS practices (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        deck_id INTEGER NOT NULL, 
        date TEXT NOT NULL, 
        duration INTEGER DEFAULT 0,      -- Ms cinsinden süre
        
        -- Analiz Verileri
        correct_count INTEGER DEFAULT 0, -- Doğru sayısı
        wrong_count INTEGER DEFAULT 0,   -- Yanlış sayısı
        mode TEXT DEFAULT 'classic',     -- Oyun modu (classic, match, writing...)
        
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    // --- D. GÜNLÜK İSTATİSTİKLER (STATISTICS) ---
    // Genel özet tablosu
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        date TEXT, 
        studied_card_count INTEGER DEFAULT 0, 
        added_card_count INTEGER DEFAULT 0, 
        learned_card_count INTEGER DEFAULT 0, 
        spent_time INTEGER DEFAULT 0,
        practice_success_rate REAL DEFAULT 0, 
        deck_success_rate REAL DEFAULT 0
      );
    `);

    console.log("Veritabanı (V2 - Clean Architecture) başarıyla oluşturuldu.");
  } catch (error) {
    console.error("Veritabanı başlatılırken kritik hata:", error);
  }
};

export const clearDatabase = async () => {
  try {
    // Tüm tabloları sırasıyla boşaltıyoruz (DROP etmiyoruz, truncate ediyoruz)
    await db.execAsync('DELETE FROM cards');
    await db.execAsync('DELETE FROM decks');
    
    // Auto-increment sayaçlarını sıfırla (Opsiyonel ama temiz olur)
    await db.execAsync('DELETE FROM sqlite_sequence WHERE name="cards"');
    await db.execAsync('DELETE FROM sqlite_sequence WHERE name="decks"');
    
    console.log("Veritabanı başarıyla temizlendi.");
    return true;
  } catch (error) {
    console.error("Veritabanı temizlenirken hata:", error);
    return false;
  }
};