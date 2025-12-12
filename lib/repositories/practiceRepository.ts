import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Practice } from '../types';

// Yeni pratik kaydı oluşturma
// Not: user_id kaldırıldı.
export const createPractice = async (
  deck_id: number, 
  date: string, 
  duration: number, 
  success_rate: number | null
): Promise<Practice | null> => {

  // sync_status ve last_modified kaldırıldı.
  const query = `
    INSERT INTO practices (deck_id, date, duration, success_rate) 
    VALUES (?, ?, ?, ?);
  `;
  
  try {
    const result = await db.runAsync(query, [deck_id, date, duration, success_rate]);
    
    console.log(`Pratik kaydı oluşturuldu (Local): ID ${result.lastInsertRowId}`);
    return getPracticeById(result.lastInsertRowId);

  } catch (error) {
    console.error("Pratik kaydı eklenirken hata oluştu:", error);
    throw error;
  }
};

// ID'ye göre tekil pratik kaydı getirme
export const getPracticeById = async (id: number): Promise<Practice | null> => {
  // Sync filtresi kaldırıldı
  const query = `SELECT * FROM practices WHERE id = ?;`;
  
  try {
    const practice = await db.getFirstAsync<Practice>(query, [id]);
    return practice ?? null;
  } catch (error) {
    console.error(`Pratik kaydı ${id} alınırken hata:`, error);
    throw error;
  }
};

// Tüm pratik geçmişini getirme (Genel Tarihçe)
// Not: user_id parametresi kaldırıldı. En yeniden eskiye sıralar.
export const getAllPractices = async (): Promise<Practice[]> => {
  const query = `
    SELECT * FROM practices 
    ORDER BY date DESC;
  `;
  
  try {
    const allRows = await db.getAllAsync<Practice>(query);
    return allRows;
  } catch (error) {
    console.error(`Tüm pratik kayıtları alınırken hata:`, error);
    throw error;
  }
};

// Belirli bir desteye ait pratik geçmişini getirme
export const getPracticesByDeckId = async (deck_id: number): Promise<Practice[]> => {
  const query = `
    SELECT * FROM practices 
    WHERE deck_id = ? 
    ORDER BY date DESC;
  `;
  
  try {
    const rows = await db.getAllAsync<Practice>(query, [deck_id]);
    return rows;
  } catch (error) {
    console.error(`Deste ${deck_id} için pratik kayıtları alınırken hata:`, error);
    throw error;
  }
};

// Pratik kaydı güncelleme
export const updatePractice = async (
  id: number, 
  duration: number, 
  success_rate: number | null
): Promise<SQLiteRunResult> => {
  
  // Sync ve tarihçe mantığı temizlendi
  const query = `
    UPDATE practices SET 
      duration = ?, 
      success_rate = ?
    WHERE id = ?;
  `;
  
  try {
    const result = await db.runAsync(query, [duration, success_rate, id]);
    console.log(`Pratik kaydı ${id} güncellendi.`);
    return result;
  } catch (error) {
    console.error(`Pratik kaydı ${id} güncellenirken hata:`, error);
    throw error;
  }
};

// Pratik kaydı silme (Hard Delete)
export const deletePractice = async (id: number): Promise<SQLiteRunResult> => {
  const query = `DELETE FROM practices WHERE id = ?;`;
  
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`Pratik kaydı ${id} silindi.`);
    return result;
  } catch (error) {
    console.error(`Pratik kaydı ${id} silinirken hata:`, error);
    throw error;
  }
};