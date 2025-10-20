import { db } from './index';

export const insertStatistic = async (user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) => {
  const query = `INSERT INTO statistics (user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
  try {
    const result = await db.runAsync(query, [user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate]);
    console.log(`İstatistik kaydı oluşturuldu: ID ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error("İstatistik eklenirken hata oluştu:", error);
    throw error;
  }
};

export const getStatistics = async (user_id) => {
  const query = `SELECT * FROM statistics WHERE user_id = ?;`;
  try {
    const allRows = await db.getAllAsync(query, [user_id]);
    return allRows;
  } catch (error) {
    console.error(`Kullanıcı ${user_id} için istatistikler alınırken hata:`, error);
    throw error;
  }
};


export const updateStatistic = async (id, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) => {
  const query = `UPDATE statistics SET studied_card_count=?, added_card_count=?, learned_card_count=?, spent_time=?, practice_success_rate=?, deck_success_rate=? WHERE id=?;`;
  try {
    const result = await db.runAsync(query, [studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate, id]);
    console.log(`İstatistik ${id} güncellendi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} güncellenirken hata:`, error);
    throw error;
  }
};


export const deleteStatistic = async (id) => {
  const query = `DELETE FROM statistics WHERE id = ?;`;
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`İstatistik ${id} silindi. Etkilenen satır: ${result.changes}`);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} silinirken hata:`, error);
    throw error;
  }
};