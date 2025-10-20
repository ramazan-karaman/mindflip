import { db } from '../db/index';

export const insertCard = async (deck_id, front_word, front_image, back_word, back_image, rating) => {
  const query = `INSERT INTO cards (deck_id, front_word, front_image, back_word, back_image, rating, created_at, nextReview) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
  const createdAt = new Date().toISOString();
  const nextReview = createdAt;

  try {
    const result = await db.runAsync(query, [deck_id, front_word, front_image, back_word, back_image, rating, createdAt, nextReview]);
    console.log(`Kart oluşturuldu: ID ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error("Kart oluşturulurken hata:", error);
    throw error;
  }
};

export const getCardsByDeckId = async (deck_id) => {
  const query = `SELECT * FROM cards WHERE deck_id = ?;`;
  try {
    const allRows = await db.getAllAsync(query, [deck_id]);
    return allRows;
  } catch (error) {
    console.error(`Deste ${deck_id} için kartlar alınırken hata:`, error);
    throw error;
  }
};

export const getDueCardsForDeck = async (deck_id) => {
    const now = new Date().toISOString();
    const query = `SELECT * FROM cards WHERE deck_id = ? AND nextReview <= ?;`;
    try {
        const dueCards = await db.getAllAsync(query, [deck_id, now]);
        return dueCards;
    } catch (error) {
        console.error(`Deste ${deck_id} için çalışılacak kartlar alınırken hata:`, error);
        throw error;
    }
}

export const updateCardContent = async (id, front_word, front_image, back_word, back_image) => {
  const query = `UPDATE cards SET front_word = ?, front_image = ?, back_word = ?, back_image = ? WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [front_word, front_image, back_word, back_image, id]);
    console.log(`Kart ${id} güncellendi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`Kart ${id} içeriği güncellenirken hata:`, error);
    throw error;
  }
};

export const updateCardSRS = async (id, interval, easeFactor, nextReview) => {
  const query = `UPDATE cards SET interval = ?, easeFactor = ?, nextReview = ? WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [interval, easeFactor, nextReview, id]);
    console.log(`Kart ${id} SRS bilgileri güncellendi.`);
    return result;
  } catch (error) {
    console.error(`Kart ${id} SRS bilgileri güncellenirken hata:`, error);
    throw error;
  }
};


export const deleteCard = async (id) => {
  const query = `DELETE FROM cards WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`Kart ${id} silindi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`Kart ${id} silinirken hata:`, error);
    throw error;
  }
};

export const getCardCountForDeck = async (deck_id) => {
    const query = `SELECT COUNT(*) as count FROM cards WHERE deck_id = ?;`;
    try {
        const result = await db.getFirstAsync(query, [deck_id]);
        return result?.count || 0;
    } catch (error) {
        console.error(`Deste ${deck_id} kart sayısı alınırken hata:`, error);
        throw error;
    }
};