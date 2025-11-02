import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Practice } from '../types';

export const createPractice = async (
  user_id: number, 
  deck_id: number, 
  date: string, 
  duration: number, 
  success_rate: number | null
): Promise<Practice | null> => {

  const now = new Date().toISOString();
  const query = `
    INSERT INTO practices (
      user_id, deck_id, date, duration, success_rate, 
      last_modified, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending_create');
  `;
  
  try {
    const result = await db.runAsync(query, [
      user_id, deck_id, date, duration, success_rate, now
    ]);
    
    console.log(`Pratik kaydı oluşturuldu: ID ${result.lastInsertRowId}`);
    return getPracticeById(result.lastInsertRowId);

  } catch (error) {
    console.error("Pratik kaydı eklenirken hata oluştu:", error);
    throw error;
  }
};


export const getPracticeById = async (id: number): Promise<Practice | null> => {
  const query = `SELECT * FROM practices WHERE id = ? AND sync_status != 'pending_delete';`;
  try {
    const practice = await db.getFirstAsync<Practice>(query, [id]);
    return practice ?? null;
  } catch (error) {
    console.error(`Pratik kaydı ${id} alınırken hata:`, error);
    throw error;
  }
};

export const getPractices = async (user_id: number): Promise<Practice[]> => {
  const query = `
    SELECT * FROM practices 
    WHERE user_id = ? AND sync_status != 'pending_delete';
  `;
  try {
    const allRows = await db.getAllAsync<Practice>(query, [user_id]);
    return allRows;
  } catch (error) {
    console.error(`Kullanıcı ${user_id} için pratik kayıtları alınırken hata:`, error);
    throw error;
  }
};


export const updatePractice = async (
  id: number, 
  duration: number, 
  success_rate: number | null
): Promise<SQLiteRunResult> => {
  
  const now = new Date().toISOString();
  const query = `
    UPDATE practices SET 
      duration = ?, 
      success_rate = ?,
      last_modified = ?,
      sync_status = CASE 
                      WHEN sync_status = 'pending_create' THEN 'pending_create' 
                      ELSE 'pending_update' 
                    END
    WHERE id = ?;
  `;
  
  try {
    const result = await db.runAsync(query, [duration, success_rate, now, id]);
    console.log(`Pratik kaydı ${id} güncellendi.`);
    return result;
  } catch (error) {
    console.error(`Pratik kaydı ${id} güncellenirken hata:`, error);
    throw error;
  }
};


export const deletePractice = async (id: number): Promise<SQLiteRunResult> => {
  const now = new Date().toISOString();
  const query = `
    UPDATE practices 
    SET 
      sync_status = 'pending_delete',
      last_modified = ?
    WHERE id = ?;
  `;
  try {
    const result = await db.runAsync(query, [now, id]);
    console.log(`Pratik kaydı ${id} silinmek üzere işaretlendi (soft delete).`);
    return result;
  } catch (error) {
    console.error(`Pratik kaydı ${id} silinirken hata:`, error);
    throw error;
  }
};