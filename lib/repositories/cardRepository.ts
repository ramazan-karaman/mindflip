import { SQLiteRunResult } from "expo-sqlite";
import { db } from "../db";
import { Card } from '../types';

export const createCard = async (
  deck_id: number,
  front_word: string,
  front_image: string | null,
  back_word: string,
  back_image: string | null,
  rating: string | null
): Promise<Card | null> => {
  const now = new Date().toISOString();
  const query = `
    INSERT INTO cards (
      deck_id, front_word, front_image, back_word, back_image, rating, 
      created_at, next_review, last_modified, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create');
  `;

  try {
    const result = await db.runAsync(query, [
      deck_id, front_word, front_image, back_word, back_image, rating,
      now, now, now
    ]);

    console.log(`Kart oluşturuldu: ID ${result.lastInsertRowId}`);
    return getCardById(result.lastInsertRowId);

  } catch (error) {
    console.error("Kart oluşturulurken hata:", error);
    throw error;
  }
};

export const getCardById = async (id: number): Promise<Card | null> => {
  const query = `SELECT * FROM cards WHERE id = ? AND sync_status != 'pending_delete';`;
  try {
    const card = await db.getFirstAsync<Card>(query, [id]);
    return card ?? null;
  } catch (error) {
    console.error(`Kart ${id} alınırken hata:`, error);
    throw error;
  }
};

export const getCardByIdDeck = async (deck_id: number): Promise<Card[]> => {
  const query = `SELECT * FROM cards WHERE deck_id = ? AND sync_status != 'pending_delete';`;
  try {
    const allRows = await db.getAllAsync<Card>(query, [deck_id]);
    return allRows;
  } catch (error) {
    console.error(`Deste ${deck_id} için kartlar alınırken hata:`, error);
    throw error;
  }
};

export const getDueCardsForDeck = async (deck_id: number): Promise<Card[]> => {
  const now = new Date().toISOString();
  const query = `SELECT * FROM cards WHERE deck_id = ? AND next_review <= ? AND sync_status != 'pending_delete';`;
  try {
    const dueCards = await db.getAllAsync<Card>(query, [deck_id, now]);
    return dueCards;
  } catch (error) {
    console.error(`Deste ${deck_id} için çalışacak kartlar alınırken hata:`, error);
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

  const now = new Date().toISOString();
  const query = `UPDATE cards SET 
    front_word = ?,
    front_image = ?,
    back_word = ?,
    back_image= ?,
    last_modified = ?,
    sync_status = CASE WHEN sync_status = 'pending_create' THEN 'pending_create'
    ELSE 'pending_update' END WHERE id = ?;`;

  try {
    const result = await db.runAsync(query, [front_word, front_image, back_word, back_image, now, id]);
    console.log(`Kart ${id} içeriği güncellendi.`);
    return result;
  } catch (error) {
    console.error(`Kart ${id} içeriği güncellenirken hata:`, error);
    throw error;
  }
};

export const updateCardSRS = async (
  id: number,
  interval: number,
  easeFactor: number,
  nextReview: string
): Promise<SQLiteRunResult> => {
  const now = new Date().toISOString();
  const query = `
    UPDATE cards SET
    interval = ?,
    ease_factor = ?,
    next_review = ?,
    last_modified = ?,
    sync_status = CASE WHEN sync_status = 'pending_create' THEN 'pending_create' 
    ELSE 'pending_update' END WHERE id = ?;`;

  try {
    const result = await db.runAsync(query, [interval, easeFactor, nextReview, now, id]);
    console.log(`Kart ${id} SRS bilgileri güncellendi.`);
    return result;

  } catch (error) {
    console.error(`Kart ${id} SRS bilgileri güncellenirken hata:`, error);
    throw error;
  }
};

export const deleteCard = async (id: number): Promise<SQLiteRunResult> => {
  const now = new Date().toISOString();
  const query = `
    UPDATE cards SET
    sync_status = 'pending_delete',
    last_modified = ? WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [now, id]);
    console.log(`Kart ${id} silinmek üzere işaretlendi`);
    return result;

  } catch (error) {
    console.error(`Kart ${id} silinirken hata:`, error);
    throw error;
  }
}

export const getCardCountForDeck = async (deck_id: number): Promise<number> => {
  const query = `
    SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND sync_status != 'pending_delete';
    `;
  try {
    const result = await db.getFirstAsync<{ count: number }>(query, [deck_id]);
    return result?.count ?? 0;

  } catch (error) {
    console.error(`Deste ${deck_id} kart sayısı alınırken hata:`, error);
    throw error;
  }
}