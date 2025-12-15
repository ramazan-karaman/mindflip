import { SQLiteRunResult } from "expo-sqlite";
// DEĞİŞİKLİK: Eski 'FileSystem' yerine yeni 'File' sınıfını alıyoruz
import { File } from 'expo-file-system';
import { db } from "../db";
import { Card } from '../types';

// --- GÜNCELLENMİŞ SİLME YARDIMCISI ---
const deleteImageFile = async (uri: string | null) => {
  if (!uri) return;
  try {
    // 1. Dosya nesnesi oluştur (file:// protokolü olsun olmasın çalışır)
    const file = new File(uri);

    // 2. Varsa sil
    // Yeni API'de exists() kontrolü yapmadan delete() çağırmak genelde güvenlidir
    // ama temizlik açısından kontrol edebiliriz.
    if (file.exists) {
        await file.delete();
        console.log(`Resim dosyası temizlendi (Yeni Sistem): ${uri}`);
    }
  } catch (error) {
    // Dosya zaten yoksa veya başka bir sorun varsa akışı bozma
    console.warn(`Dosya silinemedi (Önemsiz): ${uri}`, error);
  }
};

// --- AKILLI ÇALIŞMA KUYRUĞU ---
export const getSmartPracticeQueue = async (deck_id: number, limit: number): Promise<Card[]> => {
  const now = new Date().toISOString();
  let finalQueue: Card[] = [];
  let remainingLimit = limit;

  try {
    const dueCards = await db.getAllAsync<Card>(`
      SELECT * FROM cards 
      WHERE deck_id = ? AND (nextReview <= ? OR nextReview IS NULL)
      ORDER BY nextReview ASC
      LIMIT ?;
    `, [deck_id, now, remainingLimit]);

    finalQueue = [...dueCards];
    remainingLimit -= dueCards.length;

    if (remainingLimit <= 0) return finalQueue;

    if (remainingLimit > 0) {
        const newCards = await db.getAllAsync<Card>(`
            SELECT * FROM cards 
            WHERE deck_id = ? AND nextReview IS NULL
            LIMIT ?;
        `, [deck_id, remainingLimit]);
        
        const uniqueNewCards = newCards.filter(n => !finalQueue.find(q => q.id === n.id));
        
        finalQueue = [...finalQueue, ...uniqueNewCards];
        remainingLimit -= uniqueNewCards.length;
    }

    if (remainingLimit <= 0) return finalQueue;

    const bonusCards = await db.getAllAsync<Card>(`
      SELECT * FROM cards 
      WHERE deck_id = ? AND nextReview > ?
      ORDER BY nextReview ASC, easeFactor ASC
      LIMIT ?;
    `, [deck_id, now, remainingLimit]);

    finalQueue = [...finalQueue, ...bonusCards];

    return finalQueue;

  } catch (error) {
    console.error(`Akıllı kuyruk hatası:`, error);
    throw error;
  }
};

// --- CRUD İŞLEMLERİ ---

export const createCard = async (
  deck_id: number,
  front_word: string,
  front_image: string | null,
  back_word: string,
  back_image: string | null
): Promise<Card | null> => {
  const now = new Date().toISOString();
  
  const query = `
    INSERT INTO cards (
      deck_id, front_word, front_image, back_word, back_image, 
      created_at, nextReview, box, interval, easeFactor
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 2.5);
  `;
  
  try {
    const result = await db.runAsync(query, [
      deck_id, front_word, front_image, back_word, back_image, 
      now, now 
    ]);
    
    console.log(`Kart oluşturuldu: ID ${result.lastInsertRowId}`);
    return getCardById(result.lastInsertRowId);

  } catch (error) {
    console.error("Kart oluşturulurken hata:", error);
    throw error;
  }
};

export const getCardById = async (id: number): Promise<Card | null> => {
  const query = `SELECT * FROM cards WHERE id = ?;`;
  try {
    const card = await db.getFirstAsync<Card>(query, [id]);
    return card ?? null;
  } catch (error) {
    console.error(`Kart ${id} alınırken hata:`, error);
    throw error;
  }
};

export const getCardByIdDeck = async (deck_id: number): Promise<Card[]> => {
  const query = `SELECT * FROM cards WHERE deck_id = ?;`;
  try {
    const allRows = await db.getAllAsync<Card>(query, [deck_id]);
    return allRows;
  } catch (error) {
    console.error(`Kartlar alınırken hata:`, error);
    throw error;
  }
};

export const getDueCardsForDeck = async (deck_id: number): Promise<Card[]> => {
  const now = new Date().toISOString();
  const query = `
    SELECT * FROM cards 
    WHERE deck_id = ? AND (nextReview <= ? OR nextReview IS NULL);
  `;
  try {
    const dueCards = await db.getAllAsync<Card>(query, [deck_id, now]);
    return dueCards;
  } catch (error) {
    console.error(`Due kartlar alınırken hata:`, error);
    throw error;
  }
};

export const updateCardContent = async (
  id: number,
  front_word: string,
  front_image: string | null,
  back_word: string,
  back_image: string | null,
): Promise<SQLiteRunResult> => {
  const query = `
    UPDATE cards SET 
    front_word = ?,
    front_image = ?,
    back_word = ?,
    back_image = ?
    WHERE id = ?;
  `;

  try {
    const result = await db.runAsync(query, [front_word, front_image, back_word, back_image, id]);
    return result;
  } catch (error) {
    console.error(`Kart güncelleme hatası:`, error);
    throw error;
  }
};

export const updateCardSRS = async (
  id: number,
  interval: number,
  easeFactor: number,
  nextReview: string,
  box: number
): Promise<SQLiteRunResult> => {
  const query = `
    UPDATE cards SET
    interval = ?,
    easeFactor = ?,
    nextReview = ?,
    box = ?
    WHERE id = ?;
  `;

  try {
    const result = await db.runAsync(query, [interval, easeFactor, nextReview,box, id]);
    return result;
  } catch (error) {
    console.error(`SRS güncelleme hatası:`, error);
    throw error;
  }
};

export const deleteCard = async (id: number): Promise<SQLiteRunResult> => {
  try {
    const cardToDelete = await getCardById(id);

    if (cardToDelete) {
      // YENİ SİLME FONKSİYONUNU ÇAĞIRIYORUZ
      await deleteImageFile(cardToDelete.front_image);
      await deleteImageFile(cardToDelete.back_image);
    }

    const query = `DELETE FROM cards WHERE id = ?;`;
    const result = await db.runAsync(query, [id]);

    if (cardToDelete) {
      // A. O destede kaç kart kaldığını say
      const countResult = await db.getFirstAsync<{ count: number }>(
        'SELECT count(*) as count FROM cards WHERE deck_id = ?',
        [cardToDelete.deck_id]
      );
      
      const remainingCount = countResult?.count ?? 0;

      // B. Eğer Hedef (Goal) > Kalan Kart (Remaining) ise, Hedefi düşür.
      // Örneğin: Hedef 10, Kalan 9 oldu. Hedefi 9 yap.
      await db.runAsync(
        'UPDATE decks SET goal = ? WHERE id = ? AND goal > ?',
        [remainingCount, cardToDelete.deck_id, remainingCount]
      );
    }
    
    console.log(`Kart ${id} silindi.`);
    return result;

  } catch (error) {
    console.error(`Kart silme hatası:`, error);
    throw error;
  }
};

export const getCardCountForDeck = async (deck_id: number): Promise<number> => {
  const query = `SELECT COUNT(*) as count FROM cards WHERE deck_id = ?;`;
  try {
    const result = await db.getFirstAsync<{ count: number }>(query, [deck_id]);
    return result?.count ?? 0;
  } catch (error) {
    console.error(`Kart sayısı alınırken hata:`, error);
    throw error;
  }
};

export const createCardsBatch = async (
  deck_id: number,
  cards: { front: string; back: string }[]
): Promise<void> => {
  if (cards.length === 0) return;

  const now = new Date().toISOString();
  
  try {
    // Transaction: Ya hepsi eklenir ya hiçbiri. Veri bütünlüğü için şart.
    await db.withTransactionAsync(async () => {
      for (const card of cards) {
        await db.runAsync(
          `INSERT INTO cards (
            deck_id, front_word, back_word, 
            created_at, nextReview, 
            interval, easeFactor,box
           ) VALUES (?, ?, ?, ?, ?, 0, 2.5,0);`, // Varsayılan SRS değerleri
          [deck_id, card.front, card.back, now, now]
        );
      }
    });
    console.log(`${cards.length} kart başarıyla toplu eklendi.`);
  } catch (error) {
    console.error("Toplu ekleme hatası:", error);
    throw error;
  }
};

export const getTotalDueCardCount = async (): Promise<number> => {
  const now = new Date().toISOString();
  const query = `SELECT COUNT(*) as count FROM cards WHERE nextReview <= ? OR nextReview IS NULL`;
  try {
    const result = await db.getFirstAsync<{count: number}>(query, [now]);
    return result?.count ?? 0;
  } catch (error) {
    return 0;
  }
}