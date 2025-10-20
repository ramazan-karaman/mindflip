import { db } from '../db/index';

export const insertDeck = async (user_id, name, description, goal) => {
  const query = `INSERT INTO decks (user_id, name, description, goal, created_at) VALUES (?, ?, ?, ?, ?);`;
  const createdAt = new Date().toISOString();
  try {
    const result = await db.runAsync(query, [user_id, name, description, goal, createdAt]);
    console.log(`Deste oluşturuldu: ID ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error(`Deste '${name}' oluşturulurken hata:`, error);
    throw error;
  }
};

export const getDecks = async () => {
  const query = `SELECT * FROM decks ORDER BY name ASC;`;
  try {
    const allRows = await db.getAllAsync(query);
    return allRows;
  } catch (error) {
    console.error("Desteler alınırken hata oluştu:", error);
    throw error;
  }
};

export const getDeckById = async (id) => {
    const query = `SELECT * FROM decks WHERE id = ?;`;
    try {
        const deck = await db.getFirstAsync(query, [id]);
        return deck;
    } catch (error) {
        console.error(`Deste ${id} alınırken hata:`, error);
        throw error;
    }
};

export const updateDeck = async (id, name, description, goal) => {
  const query = `UPDATE decks SET name = ?, description = ?, goal = ? WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [name, description, goal, id]);
    console.log(`Deste ${id} güncellendi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`Deste ${id} güncellenirken hata:`, error);
    throw error;
  }
};

export const deleteDeck = async (id) => {
  const query = `DELETE FROM decks WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`Deste ${id} silindi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`Deste ${id} silinirken hata:`, error);
    throw error;
  }
};