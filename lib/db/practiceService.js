import { db } from './index';

export const insertPractice = async (user_id, deck_id, date, duration, success_rate) => {
  const query = `INSERT INTO practices (user_id, deck_id, date, duration, success_rate) VALUES (?, ?, ?, ?, ?);`;
  try {
    const result = await db.runAsync(query, [user_id, deck_id, date, duration, success_rate]);
    console.log(`Pratik kaydı oluşturuldu: ID ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error("Pratik kaydı eklenirken hata oluştu:", error);
    throw error;
  }
};

export const getPractices = async (user_id) => {
  const query = `SELECT * FROM practices WHERE user_id = ?;`;
  try {
    const allRows = await db.getAllAsync(query, [user_id]);
    return allRows;
  } catch (error) {
    console.error(`Kullanıcı ${user_id} için pratik kayıtları alınırken hata:`, error);
    throw error;
  }
};

export const updatePractice = async (id, duration, success_rate) => {
  const query = `UPDATE practices SET duration=?, success_rate=? WHERE id=?;`;
  try {
    const result = await db.runAsync(query, [duration, success_rate, id]);
    console.log(`Pratik kaydı ${id} güncellendi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`Pratik kaydı ${id} güncellenirken hata:`, error);
    throw error;
  }
};

export const deletePractice = async (id) => {
  const query = `DELETE FROM practices WHERE id=?;`;
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`Pratik kaydı ${id} silindi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`Pratik kaydı ${id} silinirken hata:`, error);
    throw error;
  }
};