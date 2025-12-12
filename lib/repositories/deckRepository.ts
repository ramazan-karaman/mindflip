import { SQLiteRunResult } from 'expo-sqlite';
// DEĞİŞİKLİK: File sınıfını alıyoruz
import { File } from 'expo-file-system';
import { db } from '../db';
import { Deck, DeckWithCardCount } from '../types';
import * as CardRepository from './cardRepository';

// --- GÜNCELLENMİŞ SİLME YARDIMCISI ---
const deleteImageFile = async (uri: string | null) => {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
        await file.delete();
        // Log kirliliği olmaması için buradaki logu kaldırabilir veya azaltabilirsin
    }
  } catch (error) {
    console.warn(`Dosya silinemedi: ${uri}`, error);
  }
};

// --- CRUD İŞLEMLERİ ---

export const createDeck = async (
  name: string,
  description: string | null,
  goal: number | null
): Promise<Deck | null> => {
  const now = new Date().toISOString();
  
  const query = `
    INSERT INTO decks (name, description, goal, created_at)
    VALUES (?, ?, ?, ?);
  `;

  try {
    const result = await db.runAsync(query, [name, description, goal, now]);
    console.log(`Deste oluşturuldu: ID ${result.lastInsertRowId}`);
    return getDeckById(result.lastInsertRowId);
  } catch (error) {
    console.error(`Deste hatası:`, error);
    throw error;
  }
};

export const getDecks = async (): Promise<DeckWithCardCount[]> => {
  const query = `
    SELECT d.*, (SELECT COUNT(c.id) FROM cards c WHERE c.deck_id = d.id) as cardCount 
    FROM decks d 
    ORDER BY d.name ASC;
  `;

  try {
    const result = await db.getAllAsync<DeckWithCardCount>(query);
    return result;
  } catch (error) {
    console.error(`Desteler alınırken hata:`, error);
    throw error;
  }
};

export const getDeckById = async (id: number): Promise<Deck | null> => {
  const query = `SELECT * FROM decks WHERE id = ?;`;
  
  try {
    const result = await db.getFirstAsync<Deck>(query, [id]);
    return result ?? null;
  } catch (error) {
    console.error(`Deste alınırken hata:`, error);
    throw error;
  }
};

export const updateDeck = async (
  id: number,
  name: string,
  description: string | null,
  goal: number | null
): Promise<SQLiteRunResult> => {
  
  const query = `
    UPDATE decks SET 
    name = ?, 
    description = ?, 
    goal = ? 
    WHERE id = ?;
  `;

  try {
    const result = await db.runAsync(query, [name, description, goal, id]);
    console.log(`Deste ${id} güncellendi.`);
    return result;
  } catch (error) {
    console.error(`Deste güncelleme hatası:`, error);
    throw error;
  }
};

// --- SİLME İŞLEMİ ---
export const deleteDeck = async (id: number): Promise<SQLiteRunResult> => {
  try {
    // 1. Kartları ve resimlerini bul
    const cardsInDeck = await CardRepository.getCardByIdDeck(id);

    // 2. Resim dosyalarını temizle
    if (cardsInDeck.length > 0) {
        console.log(`Deste siliniyor. ${cardsInDeck.length} kartın resimleri temizleniyor...`);
        for (const card of cardsInDeck) {
            await deleteImageFile(card.front_image);
            await deleteImageFile(card.back_image);
        }
    }

    // 3. Veritabanından sil (Cascade)
    const query = `DELETE FROM decks WHERE id = ?;`;
    const result = await db.runAsync(query, [id]);
    
    console.log(`Deste ${id} ve içeriği temizlendi.`);
    return result;

  } catch (error) {
    console.error(`Deste silme hatası:`, error);
    throw error;
  }
};