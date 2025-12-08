import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

function createWebDatabaseMock() {
  console.log("Web platformunda database işlemleri mocklandı.");
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
  
  const db = SQLite.openDatabaseSync("mindflip.db");
  console.log("Veritabanı açıldı veya oluşturuldu: mindflip.db");
  return db;
}

export const db = openDatabase();

export const initializeDatabase = async () => {
  try {
    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    
  
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cloud_id TEXT UNIQUE, 
        name TEXT, 
        email TEXT, 
        profile_photo TEXT,
        last_modified TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'synced'
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cloud_id TEXT UNIQUE,
        user_id INTEGER, 
        name TEXT, 
        description TEXT, 
        goal INTEGER, 
        created_at TEXT, 
        last_modified TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'synced',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        cloud_id TEXT UNIQUE,
        deck_id INTEGER, 
        front_word TEXT, 
        front_image TEXT, 
        back_word TEXT, 
        back_image TEXT, 
        rating TEXT, 
        created_at TEXT,
        interval REAL DEFAULT 1,
        ease_factor REAL DEFAULT 2.5,  -- DÜZELTİLDİ (Eski: easeFactor)
        next_review TEXT,              -- DÜZELTİLDİ (Eski: nextReview)
        last_modified TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'synced',
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        cloud_id TEXT UNIQUE,
        user_id INTEGER, 
        date TEXT, 
        studied_card_count INTEGER, 
        added_card_count INTEGER, 
        learned_card_count INTEGER, 
        spent_time INTEGER, 
        practice_success_rate REAL, 
        deck_success_rate REAL, 
        last_modified TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'synced',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS practices (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        cloud_id TEXT UNIQUE,
        user_id INTEGER, 
        deck_id INTEGER, 
        date TEXT, 
        duration INTEGER, 
        success_rate REAL, 
        last_modified TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        sync_status TEXT NOT NULL DEFAULT 'synced',
        FOREIGN KEY(user_id) REFERENCES users(id), 
        FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    console.log("Database tabloları başarıyla kontrol edildi/oluşturuldu.");
  } catch (error) {
    console.error("Database oluşturulurken hata:", error);
    throw error;
  }
};

// GÜVENLİK: Çıkış yapıldığında tüm yerel veriyi temizle
export const clearDatabase = async () => {
  try {
    console.log("⚠️ Yerel veritabanı temizleniyor...");
    await db.execAsync(`
      DELETE FROM cards;
      DELETE FROM decks;
      DELETE FROM practices;
      DELETE FROM statistics;
      DELETE FROM users;
    `); 
    // Tabloları drop etmiyoruz (silmiyoruz), sadece içlerini boşaltıyoruz.
    // Böylece yeni giren kullanıcı için tablolar hazır bekliyor.
    console.log("✅ Yerel veritabanı sıfırlandı.");
  } catch (error) {
    console.error("Veritabanı temizleme hatası:", error);
    throw error;
  }
};