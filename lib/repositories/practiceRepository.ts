import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Practice, PracticeMode } from '../types';

// Yeni pratik kaydı oluşturma
export const createPractice = async (
  deck_id: number, 
  date: string, 
  duration: number, 
  correct_count: number,
  wrong_count: number,
  mode: PracticeMode = "classic" // Varsayılan mod: classic
): Promise<Practice | null> => {

  const query = `
    INSERT INTO practices (deck_id, date, duration, correct_count, wrong_count,mode) 
    VALUES (?, ?, ?, ?, ?, ?);
  `;
  
  try {
    const result = await db.runAsync(query, [deck_id, date, duration, correct_count, wrong_count,mode]);
    
    console.log(`Pratik kaydı oluşturuldu (${mode}): ID ${result.lastInsertRowId}`);
    return getPracticeById(result.lastInsertRowId);

  } catch (error) {
    console.error("Pratik kaydı eklenirken hata oluştu:", error);
    throw error;
  }
};

// ID'ye göre tekil pratik kaydı getirme
export const getPracticeById = async (id: number): Promise<Practice | null> => {
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

// Pratik kaydı güncelleme (Mod genellikle güncellenmez)
export const updatePractice = async (
  id: number, 
  duration: number, 
  correct_count: number,
  wrong_count: number
): Promise<SQLiteRunResult> => {
  
  const query = `
    UPDATE practices SET 
      duration = ?, 
      correct_count = ?,
      wrong_count = ?
    WHERE id = ?;
  `;
  
  try {
    const result = await db.runAsync(query, [duration, correct_count, wrong_count, id]);
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