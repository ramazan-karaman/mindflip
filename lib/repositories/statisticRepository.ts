import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Statistic } from '../types';

// Yeni istatistik kaydı oluşturma
// Not: user_id kaldırıldı.
export const createStatistic = async (
  date: string, // ISOString
  studied_card_count: number, 
  added_card_count: number, 
  learned_card_count: number, 
  spent_time: number, 
  practice_success_rate: number | null, 
  deck_success_rate: number | null
): Promise<Statistic | null> => {

  // sync_status ve last_modified kaldırıldı
  const query = `
    INSERT INTO statistics (
      date, studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  
  try {
    const result = await db.runAsync(query, [
      date, studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate
    ]);
    
    console.log(`İstatistik kaydı oluşturuldu: ID ${result.lastInsertRowId}`);
    return getStatisticById(result.lastInsertRowId);

  } catch (error) {
    console.error("İstatistik eklenirken hata oluştu:", error);
    throw error;
  }
};

// ID'ye göre tekil istatistik getirme
export const getStatisticById = async (id: number): Promise<Statistic | null> => {
  // Sync filtresi kaldırıldı
  const query = `SELECT * FROM statistics WHERE id = ?;`;
  try {
    const statistic = await db.getFirstAsync<Statistic>(query, [id]);
    return statistic ?? null;
  } catch (error) {
    console.error(`İstatistik ${id} alınırken hata:`, error);
    throw error;
  }
};

// Tüm istatistikleri getirme
// Not: user_id kaldırıldı. Tarihe göre yeniden eskiye sıralar.
export const getStatistics = async (): Promise<Statistic[]> => {
  const query = `
    SELECT * FROM statistics 
    ORDER BY date DESC;
  `;
  try {
    const allRows = await db.getAllAsync<Statistic>(query);
    return allRows;
  } catch (error) {
    console.error(`İstatistikler alınırken hata:`, error);
    throw error;
  }
};

// Belirli bir tarihe ait istatistiği getirme (Varsa güncellemek için kullanışlıdır)
export const getStatisticByDate = async (date: string): Promise<Statistic | null> => {
  // Tarih karşılaştırması için (String formatında tutulduğu varsayılıyor)
  const query = `SELECT * FROM statistics WHERE date LIKE ?;`;
  try {
    // Tarihin sadece 'YYYY-MM-DD' kısmını eşleştirmek istersen LIKE kullanabilirsin
    // veya tam eşleşme için '=' kullanabilirsin. Burada tam eşleşme varsayıldı.
    const statistic = await db.getFirstAsync<Statistic>(query, [`${date}%`]); 
    return statistic ?? null;
  } catch (error) {
    console.error(`Tarih bazlı istatistik alınırken hata:`, error);
    throw error;
  }
};

// İstatistik güncelleme
export const updateStatistic = async (
  id: number, 
  studied_card_count: number, 
  added_card_count: number, 
  learned_card_count: number, 
  spent_time: number, 
  practice_success_rate: number | null, 
  deck_success_rate: number | null
): Promise<SQLiteRunResult> => {
  
  // Sync mantığı temizlendi
  const query = `
    UPDATE statistics SET 
      studied_card_count = ?, 
      added_card_count = ?, 
      learned_card_count = ?, 
      spent_time = ?, 
      practice_success_rate = ?, 
      deck_success_rate = ?
    WHERE id = ?;
  `;
  
  try {
    const result = await db.runAsync(query, [
      studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate, 
      id
    ]);
    console.log(`İstatistik ${id} güncellendi.`);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} güncellenirken hata:`, error);
    throw error;
  }
};

// İstatistik silme (Hard Delete)
export const deleteStatistic = async (id: number): Promise<SQLiteRunResult> => {
  // Soft delete yerine Hard delete
  const query = `DELETE FROM statistics WHERE id = ?;`;
  
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`İstatistik ${id} silindi.`);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} silinirken hata:`, error);
    throw error;
  }
};