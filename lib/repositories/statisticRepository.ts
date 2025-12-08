import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Statistic } from '../types';

export const createStatistic = async (
  user_id: number, 
  date: string, 
  studied_card_count: number, 
  added_card_count: number, 
  learned_card_count: number, 
  spent_time: number, 
  practice_success_rate: number | null, 
  deck_success_rate: number | null
): Promise<Statistic | null> => {

  const now = new Date().toISOString();
  const query = `
    INSERT INTO statistics (
      user_id, date, studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate,
      last_modified, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create');
  `;
  
  try {
    const result = await db.runAsync(query, [
      user_id, date, studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate, now
    ]);
    
    console.log(`İstatistik kaydı oluşturuldu: ID ${result.lastInsertRowId}`);
    return getStatisticById(result.lastInsertRowId);

  } catch (error) {
    console.error("İstatistik eklenirken hata oluştu:", error);
    throw error;
  }
};

export const getStatisticById = async (id: number): Promise<Statistic | null> => {
  const query = `SELECT * FROM statistics WHERE id = ? AND sync_status != 'pending_delete';`;
  try {
    const statistic = await db.getFirstAsync<Statistic>(query, [id]);
    return statistic ?? null;
  } catch (error) {
    console.error(`İstatistik ${id} alınırken hata:`, error);
    throw error;
  }
};

export const getStatistics = async (user_id: number): Promise<Statistic[]> => {
  const query = `
    SELECT * FROM statistics 
    WHERE user_id = ? AND sync_status != 'pending_delete'
    ORDER BY date ASC; -- Tarihe göre sıralı (Grafik çizimi için ideal)
  `;
  try {
    const allRows = await db.getAllAsync<Statistic>(query, [user_id]);
    return allRows;
  } catch (error) {
    console.error(`Kullanıcı ${user_id} için istatistikler alınırken hata:`, error);
    throw error;
  }
};

export const updateStatistic = async (
  id: number, 
  studied_card_count: number, 
  added_card_count: number, 
  learned_card_count: number, 
  spent_time: number, 
  practice_success_rate: number | null, 
  deck_success_rate: number | null
): Promise<SQLiteRunResult> => {
  
  const now = new Date().toISOString();
  const query = `
    UPDATE statistics SET 
      studied_card_count = ?, 
      added_card_count = ?, 
      learned_card_count = ?, 
      spent_time = ?, 
      practice_success_rate = ?, 
      deck_success_rate = ?, 
      last_modified = ?, 
      sync_status = CASE 
                      WHEN sync_status = 'pending_create' THEN 'pending_create' 
                      ELSE 'pending_update' 
                    END
    WHERE id = ?;
  `;
  
  try {
    const result = await db.runAsync(query, [
      studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate, 
      now, id
    ]);
    console.log(`İstatistik ${id} güncellendi.`);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} güncellenirken hata:`, error);
    throw error;
  }
};

export const deleteStatistic = async (id: number): Promise<SQLiteRunResult> => {
  const now = new Date().toISOString();
  const query = `
    UPDATE statistics 
    SET 
      sync_status = 'pending_delete',
      last_modified = ?
    WHERE id = ?;
  `;
  try {
    const result = await db.runAsync(query, [now, id]);
    console.log(`İstatistik ${id} silinmek üzere işaretlendi.`);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} silinirken hata:`, error);
    throw error;
  }
};