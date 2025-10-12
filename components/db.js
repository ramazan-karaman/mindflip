import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

function openDatabase() {
  if (Platform.OS === "web") {
    return { execAsync: () => Promise.resolve(), getFirstAsync: () => Promise.resolve(null), getAllAsync: () => Promise.resolve([]), runAsync: () => Promise.resolve({}), };
  }
  const db = SQLite.openDatabaseSync("mindflip.db");
  return db;
}

const db = openDatabase();

// --- Tablo Oluşturma ---
export const createTables = async () => {
    // execAsync ile birden çok sorguyu tek seferde çalıştırabiliriz.
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, password TEXT, profile_photo TEXT);
        CREATE TABLE IF NOT EXISTS decks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, description TEXT, goal INTEGER, created_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, deck_id INTEGER, front_word TEXT, front_image TEXT, back_word TEXT, back_image TEXT, rating TEXT, created_at TEXT, FOREIGN KEY(deck_id) REFERENCES decks(id));
        CREATE TABLE IF NOT EXISTS statistics (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, studied_card_count INTEGER, added_card_count INTEGER, learned_card_count INTEGER, spent_time INTEGER, practice_success_rate REAL, deck_success_rate REAL, FOREIGN KEY(user_id) REFERENCES users(id));
        CREATE TABLE IF NOT EXISTS practices (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, deck_id INTEGER, date TEXT, duration INTEGER, success_rate REAL, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(deck_id) REFERENCES decks(id));
    `);
};

// --- USERS CRUD ---
export const insertUser = (name, email, password, profile_photo) => {
    const query = `INSERT INTO users (name, email, password, profile_photo) VALUES (?, ?, ?, ?);`;
    return db.runAsync(query, [name, email, password, profile_photo]);
};

export const getUsers = () => db.getAllAsync('SELECT * FROM users;');

export const updateUser = (id, name, email, password, profile_photo) => {
    const query = `UPDATE users SET name=?, email=?, password=?, profile_photo=? WHERE id=?;`;
    return db.runAsync(query, [name, email, password, profile_photo, id]);
};

export const deleteUser = (id) => db.runAsync(`DELETE FROM users WHERE id=?;`, [id]);


// --- DECKS CRUD ---
export const insertDeck = (user_id, name, description, goal, created_at) => {
    const query = `INSERT INTO decks (user_id, name, description, goal, created_at) VALUES (?, ?, ?, ?, ?);`;
    return db.runAsync(query, [user_id, name, description, goal, created_at]);
};

export const getDecks = () => db.getAllAsync('SELECT * FROM decks;');

export const updateDeck = (id, name, description, goal) => {
    const query = `UPDATE decks SET name=?, description=?, goal=? WHERE id=?;`;
    return db.runAsync(query, [name, description, goal, id]);
};

export const deleteDeck = (id) => db.runAsync(`DELETE FROM decks WHERE id=?;`, [id]);


// --- CARDS CRUD ---
export const insertCard = (deck_id, front_word, front_image, back_word, back_image, rating, created_at) => {
    const query = `INSERT INTO cards (deck_id, front_word, front_image, back_word, back_image, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`;
    return db.runAsync(query, [deck_id, front_word, front_image, back_word, back_image, rating, created_at]);
};

export const getCards = (deck_id) => db.getAllAsync('SELECT * FROM cards WHERE deck_id=?;', [deck_id]);

export const updateCard = (id, front_word, front_image, back_word, back_image, rating) => {
    const query = `UPDATE cards SET front_word=?, front_image=?, back_word=?, back_image=?, rating=? WHERE id=?;`;
    return db.runAsync(query, [front_word, front_image, back_word, back_image, rating, id]);
};

export const deleteCard = (id) => db.runAsync(`DELETE FROM cards WHERE id=?;`, [id]);

export const getCardCountForDeck = async (deck_id) => {
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM cards WHERE deck_id = ?;', [deck_id]);
    return result?.count || 0;
};

// --- STATISTICS & PRACTICES CRUD (Aynı mantıkla devam ediyor) ---

export const insertStatistic = (user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) => {
    const query = `INSERT INTO statistics (user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
    return db.runAsync(query, [user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate]);
};

export const getStatistics = (user_id) => db.getAllAsync('SELECT * FROM statistics WHERE user_id=?;', [user_id]);

// ... Diğer tüm fonksiyonlar için de bu basit yapı geçerlidir.